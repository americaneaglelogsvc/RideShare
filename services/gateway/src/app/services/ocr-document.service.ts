import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { S3Service } from './s3.service';
import { firstValueFrom } from 'rxjs';

// §5.1 OCR document capture (camera→parse→prefill→confirm)
// §3.8 Specialized credentials (chauffeur, TSA, NEMT)

export interface OcrResult {
  documentType: string;
  confidence: number;
  extractedFields: Record<string, string>;
  rawText: string;
}

export interface DocumentVerification {
  id: string;
  driverId: string;
  documentType: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  extractedData: Record<string, string>;
  fileUrl: string;
  expiresAt: string | null;
}

export type CredentialType =
  | 'drivers_license'
  | 'vehicle_registration'
  | 'insurance'
  | 'chauffeur_license'
  | 'tsa_badge'
  | 'nemt_certification'
  | 'medical_card'
  | 'background_check';

@Injectable()
export class OcrDocumentService {
  private readonly logger = new Logger(OcrDocumentService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly s3Service: S3Service,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async processDocument(
    driverId: string,
    tenantId: string,
    documentType: CredentialType,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<DocumentVerification> {
    // 1. Upload to S3
    const uploadResult = await this.s3Service.uploadComplianceDocument(tenantId, driverId, fileName, fileBuffer, 'application/octet-stream');
    const fileUrl = uploadResult.url;
    const fileKey = uploadResult.key;

    // 2. OCR extraction
    const ocrResult = await this.extractText(fileBuffer, documentType);

    // 3. Store in DB
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('driver_documents')
      .insert({
        driver_id: driverId,
        tenant_id: tenantId,
        document_type: documentType,
        file_url: fileUrl,
        file_key: fileKey,
        extracted_data: ocrResult.extractedFields,
        ocr_confidence: ocrResult.confidence,
        ocr_raw_text: ocrResult.rawText,
        status: ocrResult.confidence >= 0.8 ? 'pending' : 'needs_review',
        expires_at: ocrResult.extractedFields.expiration_date || null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Document processed: ${documentType} for driver ${driverId}, confidence=${ocrResult.confidence}`);

    return {
      id: data.id,
      driverId,
      documentType,
      status: data.status,
      extractedData: ocrResult.extractedFields,
      fileUrl,
      expiresAt: data.expires_at,
    };
  }

  async getDriverDocuments(driverId: string): Promise<DocumentVerification[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return (data || []).map(d => ({
      id: d.id,
      driverId: d.driver_id,
      documentType: d.document_type,
      status: d.status,
      extractedData: d.extracted_data || {},
      fileUrl: d.file_url,
      expiresAt: d.expires_at,
    }));
  }

  async verifyDocument(documentId: string, verifierId: string, approved: boolean, notes?: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('driver_documents')
      .update({
        status: approved ? 'verified' : 'rejected',
        verified_by: verifierId,
        verified_at: new Date().toISOString(),
        verification_notes: notes || null,
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Document ${documentId} ${approved ? 'verified' : 'rejected'} by ${verifierId}`);
    return data;
  }

  async checkCredentialCompleteness(driverId: string, tenantId: string) {
    const docs = await this.getDriverDocuments(driverId);

    const requiredTypes: CredentialType[] = ['drivers_license', 'vehicle_registration', 'insurance'];

    // Check tenant-specific requirements
    const supabase = this.supabaseService.getClient();
    const { data: tenantConfig } = await supabase
      .from('tenants')
      .select('config')
      .eq('id', tenantId)
      .maybeSingle();

    const additionalRequired: CredentialType[] = tenantConfig?.config?.required_credentials || [];
    const allRequired = [...requiredTypes, ...additionalRequired];

    const verified = new Set(docs.filter(d => d.status === 'verified').map(d => d.documentType));
    const missing = allRequired.filter(t => !verified.has(t));
    const expired = docs.filter(d => d.status === 'verified' && d.expiresAt && new Date(d.expiresAt) < new Date());

    return {
      complete: missing.length === 0 && expired.length === 0,
      verified: Array.from(verified),
      missing,
      expired: expired.map(d => ({ type: d.documentType, expiresAt: d.expiresAt })),
      totalDocuments: docs.length,
    };
  }

  async getSpecializedCredentials(driverId: string) {
    const docs = await this.getDriverDocuments(driverId);
    const specialTypes: CredentialType[] = ['chauffeur_license', 'tsa_badge', 'nemt_certification', 'medical_card'];

    return docs
      .filter(d => specialTypes.includes(d.documentType as CredentialType) && d.status === 'verified')
      .map(d => ({
        type: d.documentType,
        verified: true,
        expiresAt: d.expiresAt,
        isExpired: d.expiresAt ? new Date(d.expiresAt) < new Date() : false,
      }));
  }

  private async extractText(fileBuffer: Buffer, documentType: CredentialType): Promise<OcrResult> {
    const ocrApiKey = this.configService.get<string>('OCR_API_KEY');

    if (ocrApiKey) {
      try {
        return await this.callOcrApi(fileBuffer, documentType, ocrApiKey);
      } catch (e: any) {
        this.logger.warn(`OCR API failed: ${e.message}, using fallback`);
      }
    }

    // Fallback: return empty extraction requiring manual review
    return {
      documentType,
      confidence: 0,
      extractedFields: {},
      rawText: '',
    };
  }

  private async callOcrApi(fileBuffer: Buffer, documentType: string, apiKey: string): Promise<OcrResult> {
    const baseUrl = this.configService.get<string>('OCR_API_URL') || 'https://api.ocr.space/parse/image';

    const formData = new FormData();
    formData.append('base64Image', `data:image/png;base64,${fileBuffer.toString('base64')}`);
    formData.append('OCREngine', '2');
    formData.append('isTable', 'true');

    const response = await firstValueFrom(
      this.httpService.post(baseUrl, formData, {
        headers: { apikey: apiKey },
        timeout: 15000,
      }),
    );

    const result = response.data;
    const rawText = result?.ParsedResults?.[0]?.ParsedText || '';

    return {
      documentType,
      confidence: result?.ParsedResults?.[0]?.TextOverlay?.HasOverlay ? 0.9 : 0.5,
      extractedFields: this.parseFieldsFromText(rawText, documentType),
      rawText,
    };
  }

  private parseFieldsFromText(text: string, documentType: string): Record<string, string> {
    const fields: Record<string, string> = {};

    // Extract common patterns
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) fields.expiration_date = dateMatch[1];

    const nameMatch = text.match(/(?:name|nm)[:\s]*([A-Z][a-z]+ [A-Z][a-z]+)/i);
    if (nameMatch) fields.full_name = nameMatch[1];

    if (documentType === 'drivers_license') {
      const dlMatch = text.match(/(?:DL|License)[:\s#]*([A-Z0-9]+)/i);
      if (dlMatch) fields.license_number = dlMatch[1];

      const dobMatch = text.match(/(?:DOB|Birth)[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
      if (dobMatch) fields.date_of_birth = dobMatch[1];
    }

    if (documentType === 'vehicle_registration') {
      const vinMatch = text.match(/(?:VIN)[:\s]*([A-HJ-NPR-Z0-9]{17})/i);
      if (vinMatch) fields.vin = vinMatch[1];

      const plateMatch = text.match(/(?:plate|reg)[:\s]*([A-Z0-9]{1,8})/i);
      if (plateMatch) fields.license_plate = plateMatch[1];
    }

    return fields;
  }
}
