import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface UpdateRetentionConfigDto {
  tripChatRetentionDays?: number;
  supportChatRetentionDays?: number;
  piiMaskingEnabled?: boolean;
  phoneMaskingEnabled?: boolean;
  autoPurgeEnabled?: boolean;
}

@Injectable()
export class MessageRetentionService {
  private readonly logger = new Logger(MessageRetentionService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getConfig(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('message_retention_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);

    // Return defaults if no config exists
    if (!data) {
      return {
        tenant_id: tenantId,
        trip_chat_retention_days: 30,
        support_chat_retention_days: 90,
        pii_masking_enabled: true,
        phone_masking_enabled: true,
        auto_purge_enabled: false,
      };
    }

    return data;
  }

  async upsertConfig(tenantId: string, dto: UpdateRetentionConfigDto) {
    const supabase = this.supabaseService.getClient();

    const payload: Record<string, any> = {
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    };

    if (dto.tripChatRetentionDays !== undefined) {
      if (dto.tripChatRetentionDays < 1 || dto.tripChatRetentionDays > 365) {
        throw new BadRequestException('tripChatRetentionDays must be between 1 and 365.');
      }
      payload.trip_chat_retention_days = dto.tripChatRetentionDays;
    }
    if (dto.supportChatRetentionDays !== undefined) {
      if (dto.supportChatRetentionDays < 1 || dto.supportChatRetentionDays > 730) {
        throw new BadRequestException('supportChatRetentionDays must be between 1 and 730.');
      }
      payload.support_chat_retention_days = dto.supportChatRetentionDays;
    }
    if (dto.piiMaskingEnabled !== undefined) payload.pii_masking_enabled = dto.piiMaskingEnabled;
    if (dto.phoneMaskingEnabled !== undefined) payload.phone_masking_enabled = dto.phoneMaskingEnabled;
    if (dto.autoPurgeEnabled !== undefined) payload.auto_purge_enabled = dto.autoPurgeEnabled;

    const { data, error } = await supabase
      .from('message_retention_config')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) {
      this.logger.error(`Upsert retention config failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    this.logger.log(`Retention config updated for tenant ${tenantId}`);
    return data;
  }

  /**
   * Mask phone numbers in a string: +1-555-123-4567 → +1-555-***-****
   */
  maskPhone(text: string): string {
    return text.replace(/(\+?\d{1,3}[-.\s]?\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g, '$1-***-****');
  }

  /**
   * Mask email addresses: user@example.com → u***@example.com
   */
  maskEmail(text: string): string {
    return text.replace(
      /([a-zA-Z0-9])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '$1***@$2',
    );
  }

  /**
   * Apply PII masking to a message body based on tenant config.
   */
  async maskMessage(tenantId: string, messageBody: string): Promise<string> {
    const config = await this.getConfig(tenantId);
    let masked = messageBody;

    if (config.pii_masking_enabled) {
      masked = this.maskEmail(masked);
    }
    if (config.phone_masking_enabled) {
      masked = this.maskPhone(masked);
    }

    return masked;
  }
}
