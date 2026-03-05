import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { FeatureGateService } from './feature-gate.service';

/**
 * LuxuryStandardsService — CANONICAL §3.10 "Luxury service standards"
 *
 * Feature-gated stub. When enabled for a tenant:
 *   - Dress code attestation required before going online
 *   - Vehicle cleanliness policy acknowledgment
 *   - Amenity checklist (water, charger, mints, etc.)
 *   - Violation logging with dispatch priority impact
 *   - Spot-check scheduling for fleet owners/ops
 */

export interface LuxuryChecklist {
  dress_code_attested: boolean;
  vehicle_clean: boolean;
  amenities: string[];
  last_spot_check?: string;
  violations: LuxuryViolation[];
}

export interface LuxuryViolation {
  id: string;
  type: 'dress_code' | 'cleanliness' | 'amenities' | 'conduct';
  description: string;
  severity: 'warning' | 'minor' | 'major';
  recorded_at: string;
  recorded_by: string;
}

const DEFAULT_AMENITIES = ['bottled_water', 'phone_charger', 'mints', 'tissues', 'umbrella'];

@Injectable()
export class LuxuryStandardsService {
  private readonly logger = new Logger(LuxuryStandardsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly featureGateService: FeatureGateService,
  ) {}

  async isEnabled(tenantId: string): Promise<boolean> {
    return this.featureGateService.isEnabled('luxury_standards', { tenantId });
  }

  async getChecklist(tenantId: string, driverId: string): Promise<LuxuryChecklist> {
    const enabled = await this.isEnabled(tenantId);
    if (!enabled) {
      return { dress_code_attested: true, vehicle_clean: true, amenities: [], violations: [] };
    }

    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('driver_luxury_checklists')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('driver_id', driverId)
      .maybeSingle();

    if (!data) {
      return {
        dress_code_attested: false,
        vehicle_clean: false,
        amenities: DEFAULT_AMENITIES,
        violations: [],
      };
    }

    return data as LuxuryChecklist;
  }

  async attestDressCode(tenantId: string, driverId: string): Promise<{ success: boolean }> {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('driver_luxury_checklists')
      .upsert({
        tenant_id: tenantId,
        driver_id: driverId,
        dress_code_attested: true,
        attested_at: new Date().toISOString(),
      });

    this.logger.log(`Dress code attested: driver=${driverId} tenant=${tenantId}`);
    return { success: true };
  }

  async reportViolation(
    tenantId: string,
    driverId: string,
    violation: Omit<LuxuryViolation, 'id' | 'recorded_at'>,
  ): Promise<{ success: boolean }> {
    const supabase = this.supabaseService.getClient();

    await supabase.from('luxury_violations').insert({
      tenant_id: tenantId,
      driver_id: driverId,
      type: violation.type,
      description: violation.description,
      severity: violation.severity,
      recorded_by: violation.recorded_by,
    });

    this.logger.log(`Luxury violation recorded: driver=${driverId} type=${violation.type} severity=${violation.severity}`);
    return { success: true };
  }

  getRequiredAmenities(): string[] {
    return [...DEFAULT_AMENITIES];
  }
}
