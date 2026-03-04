import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// §7.1–7.4: Cancellation, No-Show, Wait-Time, Luggage, Extra Stops, Gratuity, Surge

export interface CancellationPolicy {
  freeCancelWindowSeconds: number;   // e.g. 120 = 2 min after request
  lateCancelFeeCents: number;        // flat fee after window
  driverCancelPenaltyCents: number;  // penalty for driver-initiated cancel
}

export interface NoShowPolicy {
  waitTimeSeconds: number;           // how long driver waits before marking no-show
  noShowFeeCents: number;            // rider pays
  driverCompensationCents: number;   // driver receives
}

export interface WaitTimePolicy {
  freeWaitSeconds: number;           // free wait at pickup
  perMinuteCents: number;            // charge per minute after free wait
  maxChargeCents: number;            // cap
}

export interface LuggagePolicy {
  standardIncluded: number;          // bags included free
  perExtraBagCents: number;          // surcharge per extra bag
  oversizeSurchargeCents: number;    // large/heavy items
}

export interface ExtraStopsPolicy {
  maxStops: number;                  // max additional stops
  perStopFeeCents: number;           // charge per stop
  maxWaitPerStopSeconds: number;     // max wait at each stop
}

export interface GratuityPolicy {
  suggestedPercentages: number[];    // e.g. [15, 18, 20, 25]
  defaultPercentage: number;         // pre-selected
  allowCustom: boolean;
  maxPercentage: number;             // cap
}

export interface SurgePolicy {
  enabled: boolean;
  minMultiplier: number;             // e.g. 1.0
  maxMultiplier: number;             // e.g. 3.5
  propagationDelaySec: number;       // §7.3: 60s propagation delay
  cooldownMinutes: number;           // minimum time between surge changes
  demandThreshold: number;           // requests/min to trigger surge
  supplyThreshold: number;           // available drivers to suppress surge
}

export interface TenantPricingPolicies {
  cancellation: CancellationPolicy;
  noShow: NoShowPolicy;
  waitTime: WaitTimePolicy;
  luggage: LuggagePolicy;
  extraStops: ExtraStopsPolicy;
  gratuity: GratuityPolicy;
  surge: SurgePolicy;
}

const DEFAULT_POLICIES: TenantPricingPolicies = {
  cancellation: { freeCancelWindowSeconds: 120, lateCancelFeeCents: 500, driverCancelPenaltyCents: 0 },
  noShow: { waitTimeSeconds: 300, noShowFeeCents: 1000, driverCompensationCents: 500 },
  waitTime: { freeWaitSeconds: 300, perMinuteCents: 50, maxChargeCents: 2000 },
  luggage: { standardIncluded: 2, perExtraBagCents: 200, oversizeSurchargeCents: 500 },
  extraStops: { maxStops: 3, perStopFeeCents: 300, maxWaitPerStopSeconds: 300 },
  gratuity: { suggestedPercentages: [15, 18, 20, 25], defaultPercentage: 18, allowCustom: true, maxPercentage: 50 },
  surge: { enabled: true, minMultiplier: 1.0, maxMultiplier: 3.5, propagationDelaySec: 60, cooldownMinutes: 5, demandThreshold: 10, supplyThreshold: 3 },
};

@Injectable()
export class PricingPolicyService {
  private readonly logger = new Logger(PricingPolicyService.name);
  private cache = new Map<string, { data: TenantPricingPolicies; expiry: number }>();
  private readonly TTL_MS = 60_000;

  constructor(private readonly supabaseService: SupabaseService) {}

  async getPolicies(tenantId: string): Promise<TenantPricingPolicies> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiry > Date.now()) return cached.data;

    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('tenant_pricing_policies')
      .select('policies')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const policies = data?.policies
      ? { ...DEFAULT_POLICIES, ...data.policies }
      : { ...DEFAULT_POLICIES };

    this.cache.set(tenantId, { data: policies, expiry: Date.now() + this.TTL_MS });
    return policies;
  }

  async updatePolicies(tenantId: string, updates: Partial<TenantPricingPolicies>) {
    const current = await this.getPolicies(tenantId);
    const merged = { ...current, ...updates };

    // Validate surge
    if (merged.surge.maxMultiplier < merged.surge.minMultiplier) {
      throw new BadRequestException('maxMultiplier must be >= minMultiplier');
    }
    if (merged.surge.propagationDelaySec < 0) {
      throw new BadRequestException('propagationDelaySec must be >= 0');
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_pricing_policies')
      .upsert({
        tenant_id: tenantId,
        policies: merged,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Invalidate cache
    this.cache.delete(tenantId);
    this.logger.log(`Pricing policies updated for tenant ${tenantId}`);
    return data;
  }

  // ── Cancellation Fee Calculation ────────────────────────────────

  async calculateCancellationFee(tenantId: string, tripRequestedAt: string, cancelledBy: 'rider' | 'driver'): Promise<{ feeCents: number; reason: string }> {
    const policies = await this.getPolicies(tenantId);
    const elapsed = (Date.now() - new Date(tripRequestedAt).getTime()) / 1000;

    if (cancelledBy === 'driver') {
      return { feeCents: policies.cancellation.driverCancelPenaltyCents, reason: 'driver_cancel_penalty' };
    }

    if (elapsed <= policies.cancellation.freeCancelWindowSeconds) {
      return { feeCents: 0, reason: 'within_free_cancel_window' };
    }

    return { feeCents: policies.cancellation.lateCancelFeeCents, reason: 'late_cancel_fee' };
  }

  // ── No-Show Fee Calculation ─────────────────────────────────────

  async calculateNoShowFee(tenantId: string): Promise<{ riderFeeCents: number; driverCompCents: number }> {
    const policies = await this.getPolicies(tenantId);
    return {
      riderFeeCents: policies.noShow.noShowFeeCents,
      driverCompCents: policies.noShow.driverCompensationCents,
    };
  }

  // ── Wait Time Fee Calculation ───────────────────────────────────

  calculateWaitTimeFee(policy: WaitTimePolicy, waitSeconds: number): number {
    if (waitSeconds <= policy.freeWaitSeconds) return 0;
    const chargeableMinutes = Math.ceil((waitSeconds - policy.freeWaitSeconds) / 60);
    const fee = chargeableMinutes * policy.perMinuteCents;
    return Math.min(fee, policy.maxChargeCents);
  }

  // ── Luggage Surcharge ───────────────────────────────────────────

  calculateLuggageSurcharge(policy: LuggagePolicy, totalBags: number, hasOversize: boolean): number {
    let fee = 0;
    const extraBags = Math.max(0, totalBags - policy.standardIncluded);
    fee += extraBags * policy.perExtraBagCents;
    if (hasOversize) fee += policy.oversizeSurchargeCents;
    return fee;
  }

  // ── Extra Stops Fee ─────────────────────────────────────────────

  calculateExtraStopsFee(policy: ExtraStopsPolicy, numStops: number): { feeCents: number; allowed: boolean } {
    if (numStops > policy.maxStops) {
      return { feeCents: 0, allowed: false };
    }
    return { feeCents: numStops * policy.perStopFeeCents, allowed: true };
  }

  // ── Surge Multiplier ───────────────────────────────────────────

  async getCurrentSurgeMultiplier(tenantId: string, zoneId?: string): Promise<{ multiplier: number; expiresAt: string | null }> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('surge_events')
      .select('multiplier, expires_at')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (zoneId) query = query.eq('zone_id', zoneId);

    const { data } = await query.maybeSingle();

    if (!data) return { multiplier: 1.0, expiresAt: null };
    return { multiplier: data.multiplier, expiresAt: data.expires_at };
  }

  async triggerSurge(tenantId: string, zoneId: string, multiplier: number, durationMinutes = 15) {
    const policies = await this.getPolicies(tenantId);

    if (!policies.surge.enabled) {
      throw new BadRequestException('Surge pricing is disabled for this tenant.');
    }

    const clamped = Math.max(policies.surge.minMultiplier, Math.min(multiplier, policies.surge.maxMultiplier));

    const supabase = this.supabaseService.getClient();

    // §7.3: 60s propagation delay — set effective_at in the future
    const effectiveAt = new Date(Date.now() + policies.surge.propagationDelaySec * 1000);
    const expiresAt = new Date(effectiveAt.getTime() + durationMinutes * 60_000);

    const { data, error } = await supabase
      .from('surge_events')
      .insert({
        tenant_id: tenantId,
        zone_id: zoneId,
        multiplier: clamped,
        effective_at: effectiveAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Surge ${clamped}x triggered for tenant ${tenantId} zone ${zoneId}, effective in ${policies.surge.propagationDelaySec}s`);
    return data;
  }
}
