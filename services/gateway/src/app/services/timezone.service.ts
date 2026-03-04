import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class TimezoneService {
  private readonly logger = new Logger(TimezoneService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getConfig(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('tenant_timezone_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!data) {
      return {
        tenant_id: tenantId,
        timezone: 'America/Chicago',
        business_hours_start: '06:00',
        business_hours_end: '22:00',
        scheduling_enabled: true,
      };
    }

    return data;
  }

  async upsertConfig(tenantId: string, updates: {
    timezone?: string;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    schedulingEnabled?: boolean;
  }) {
    const supabase = this.supabaseService.getClient();

    if (updates.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: updates.timezone });
      } catch {
        throw new BadRequestException(`Invalid timezone: ${updates.timezone}`);
      }
    }

    const payload: Record<string, any> = {
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    };
    if (updates.timezone) payload.timezone = updates.timezone;
    if (updates.businessHoursStart) payload.business_hours_start = updates.businessHoursStart;
    if (updates.businessHoursEnd) payload.business_hours_end = updates.businessHoursEnd;
    if (updates.schedulingEnabled !== undefined) payload.scheduling_enabled = updates.schedulingEnabled;

    const { data, error } = await supabase
      .from('tenant_timezone_config')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  nowInTenantTz(timezone: string): Date {
    const now = new Date();
    const str = now.toLocaleString('en-US', { timeZone: timezone });
    return new Date(str);
  }

  isWithinBusinessHours(timezone: string, start: string, end: string): boolean {
    const now = this.nowInTenantTz(timezone);
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  async isBusinessHours(tenantId: string): Promise<{ withinHours: boolean; timezone: string; localTime: string }> {
    const config = await this.getConfig(tenantId);
    const withinHours = this.isWithinBusinessHours(
      config.timezone, config.business_hours_start, config.business_hours_end,
    );
    const localTime = this.nowInTenantTz(config.timezone).toISOString();

    return { withinHours, timezone: config.timezone, localTime };
  }
}
