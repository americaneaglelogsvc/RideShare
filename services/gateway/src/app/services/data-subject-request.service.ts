import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export type DsrType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';

export interface CreateDsrDto {
  tenantId?: string;
  userId: string;
  requestType: DsrType;
  reason?: string;
}

export interface ProcessDsrDto {
  processedBy: string;
  status: 'processing' | 'completed' | 'rejected';
  dataExportUrl?: string;
}

@Injectable()
export class DataSubjectRequestService {
  private readonly logger = new Logger(DataSubjectRequestService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(dto: CreateDsrDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('data_subject_requests')
      .insert({
        tenant_id: dto.tenantId || null,
        user_id: dto.userId,
        request_type: dto.requestType,
        reason: dto.reason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`DSR creation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    this.logger.log(`DSR ${data.id} created: ${dto.requestType} for user ${dto.userId}`);
    return data;
  }

  async get(dsrId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('data_subject_requests')
      .select('*')
      .eq('id', dsrId)
      .single();

    if (error || !data) throw new NotFoundException('DSR not found.');
    return data;
  }

  async listForUser(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('data_subject_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async listPending() {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('data_subject_requests')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async process(dsrId: string, dto: ProcessDsrDto) {
    const supabase = this.supabaseService.getClient();

    const existing = await this.get(dsrId);
    if (['completed', 'rejected'].includes(existing.status)) {
      throw new BadRequestException('DSR is already finalized.');
    }

    const payload: Record<string, any> = {
      status: dto.status,
      processed_by: dto.processedBy,
    };

    if (dto.status === 'completed') {
      payload.completed_at = new Date().toISOString();
      if (dto.dataExportUrl) payload.data_export_url = dto.dataExportUrl;
    }

    const { data, error } = await supabase
      .from('data_subject_requests')
      .update(payload)
      .eq('id', dsrId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`DSR ${dsrId} → ${dto.status}`);
    return data;
  }

  async getSlaBreaches() {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('data_subject_requests')
      .select('*')
      .in('status', ['pending', 'processing'])
      .lt('sla_deadline', new Date().toISOString())
      .order('sla_deadline', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }
}
