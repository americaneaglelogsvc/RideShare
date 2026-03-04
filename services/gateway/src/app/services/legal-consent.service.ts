import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export type ConsentType = 'terms_of_service' | 'privacy_policy' | 'data_processing' | 'marketing' | 'location_tracking' | 'biometric_consent';
export type UserType = 'rider' | 'driver';

export interface GrantConsentDto {
  tenantId: string;
  userId: string;
  userType: UserType;
  consentType: ConsentType;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RevokeConsentDto {
  userId: string;
  consentType: ConsentType;
  version: string;
}

@Injectable()
export class LegalConsentService {
  private readonly logger = new Logger(LegalConsentService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async grantConsent(dto: GrantConsentDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('legal_consents')
      .upsert(
        {
          tenant_id: dto.tenantId,
          user_id: dto.userId,
          user_type: dto.userType,
          consent_type: dto.consentType,
          version: dto.version,
          granted: true,
          ip_address: dto.ipAddress || null,
          user_agent: dto.userAgent || null,
          granted_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: 'user_id,consent_type,version' },
      )
      .select()
      .single();

    if (error) {
      this.logger.error(`Grant consent failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    this.logger.log(`Consent granted: ${dto.userId} → ${dto.consentType} v${dto.version}`);
    return data;
  }

  async revokeConsent(dto: RevokeConsentDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('legal_consents')
      .update({
        granted: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('user_id', dto.userId)
      .eq('consent_type', dto.consentType)
      .eq('version', dto.version)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Consent record not found or already revoked.');
    }

    this.logger.log(`Consent revoked: ${dto.userId} → ${dto.consentType} v${dto.version}`);
    return data;
  }

  async getUserConsents(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('legal_consents')
      .select('*')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getActiveConsents(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('legal_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('granted', true)
      .is('revoked_at', null)
      .order('granted_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async checkConsent(userId: string, consentType: ConsentType, version: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('legal_consents')
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('version', version)
      .eq('granted', true)
      .is('revoked_at', null)
      .maybeSingle();

    return !!data;
  }

  async getConsentAuditTrail(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('legal_consents')
      .select('consent_type, version, granted, granted_at, revoked_at, ip_address')
      .eq('user_id', userId)
      .order('granted_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }
}
