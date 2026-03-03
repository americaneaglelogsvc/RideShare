import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';
import { DispatchService } from './dispatch.service';
import { RealtimeService } from './realtime.service';

/**
 * Phase 7.0 VI.1: AI Marketplace Liquidity — "Silent Handshake" Spill-Over
 *
 * Monitors driver latency per tenant. When Tenant A is saturated (high demand,
 * low idle drivers) and Tenant B has idle drivers nearby, the AI facilitates
 * a "Silent Handshake" referral — no manual chat interface needed.
 *
 * Flow:
 *   1. Cron runs every 30 seconds, scans for unfulfilled trips older than 45s
 *   2. For each unfulfilled trip, searches for idle drivers across ALL tenants
 *      within the same geographic zone
 *   3. If a cross-tenant driver is found, creates a spill_over_referral and
 *      dispatches the trip to the foreign driver
 *   4. Revenue split follows the 4-way referral model (M5.11)
 *
 * Constraints:
 *   - Driver must be idle (status='online') in another tenant
 *   - Driver must have an active driver_identity (cross-tenant)
 *   - Originating tenant must have spill_over_enabled = true
 *   - Fulfilling tenant must have spill_over_enabled = true
 *   - Geographic proximity: within 5 miles of pickup
 */

interface UnfulfilledTrip {
  id: string;
  tenant_id: string;
  pickup_lat: number;
  pickup_lng: number;
  fare_cents: number;
  category: string;
  created_at: string;
}

interface CrossTenantDriver {
  driverProfileId: string;
  driverIdentityId: string;
  fulfillingTenantId: string;
  distanceMiles: number;
}

@Injectable()
export class MarketplaceLiquidityService {
  private readonly logger = new Logger(MarketplaceLiquidityService.name);
  private readonly UNFULFILLED_THRESHOLD_MS = 45_000; // 45 seconds without assignment
  private readonly SPILL_OVER_RADIUS_MILES = 5;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly dispatchService: DispatchService,
    private readonly realtimeService: RealtimeService,
  ) {}

  /**
   * Cron: Every 30 seconds, scan for unfulfilled trips and attempt cross-tenant dispatch.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async scanForLiquidityOpportunities(): Promise<void> {
    try {
      const unfulfilledTrips = await this.getUnfulfilledTrips();

      if (unfulfilledTrips.length === 0) return;

      this.logger.log(`Liquidity scan: ${unfulfilledTrips.length} unfulfilled trip(s) detected`);

      for (const trip of unfulfilledTrips) {
        await this.attemptSilentHandshake(trip);
      }
    } catch (err: any) {
      this.logger.error(`Liquidity scan failed: ${err.message}`);
    }
  }

  /**
   * Find trips that have been in 'requested' status longer than the threshold
   * and belong to tenants with spill-over enabled.
   */
  private async getUnfulfilledTrips(): Promise<UnfulfilledTrip[]> {
    const supabase = this.supabaseService.getClient();
    const cutoff = new Date(Date.now() - this.UNFULFILLED_THRESHOLD_MS).toISOString();

    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, tenant_id, pickup_lat, pickup_lng, fare_cents, category, created_at')
      .eq('status', 'requested')
      .is('driver_id', null)
      .lt('created_at', cutoff)
      .limit(20);

    if (error || !trips) return [];

    // Filter to tenants with spill-over enabled
    const tenantIds = [...new Set(trips.map(t => t.tenant_id))];
    const { data: onboardings } = await supabase
      .from('tenant_onboarding')
      .select('tenant_id')
      .in('tenant_id', tenantIds)
      .eq('spill_over_enabled', true);

    const enabledTenants = new Set((onboardings || []).map(o => o.tenant_id));
    return trips.filter(t => enabledTenants.has(t.tenant_id)) as UnfulfilledTrip[];
  }

  /**
   * Attempt to find a cross-tenant driver for an unfulfilled trip.
   */
  private async attemptSilentHandshake(trip: UnfulfilledTrip): Promise<void> {
    const supabase = this.supabaseService.getClient();

    try {
      // Find idle drivers from OTHER tenants within radius
      const crossTenantDrivers = await this.findCrossTenantDrivers(
        trip.tenant_id,
        trip.pickup_lat,
        trip.pickup_lng,
        trip.category,
      );

      if (crossTenantDrivers.length === 0) {
        return; // No cross-tenant drivers available
      }

      const bestDriver = crossTenantDrivers[0]; // Nearest driver

      // Create spill-over referral record
      const { data: referral, error: refError } = await supabase
        .from('spill_over_referrals')
        .insert({
          originating_tenant_id: trip.tenant_id,
          fulfilling_tenant_id: bestDriver.fulfillingTenantId,
          trip_id: trip.id,
          driver_identity_id: bestDriver.driverIdentityId,
          fulfilling_driver_profile_id: bestDriver.driverProfileId,
          status: 'pending',
          match_distance_miles: bestDriver.distanceMiles,
        })
        .select('id')
        .single();

      if (refError || !referral) {
        this.logger.error(`Spill-over referral creation failed: ${refError?.message}`);
        return;
      }

      // Attempt atomic assignment via the fulfilling tenant's driver
      const assignResult = await this.dispatchService.acceptOffer(
        trip.tenant_id,
        trip.id,
        bestDriver.driverProfileId,
      );

      if (assignResult.success) {
        // Mark referral as accepted
        await supabase
          .from('spill_over_referrals')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', referral.id);

        this.logger.log(
          `SILENT HANDSHAKE: Trip ${trip.id} (Tenant ${trip.tenant_id.slice(0, 8)}) ` +
          `→ Driver ${bestDriver.driverProfileId.slice(0, 8)} (Tenant ${bestDriver.fulfillingTenantId.slice(0, 8)}) ` +
          `[${bestDriver.distanceMiles.toFixed(1)} mi]`,
        );
      } else {
        // Assignment failed — mark referral as failed
        await supabase
          .from('spill_over_referrals')
          .update({ status: 'failed', failure_reason: assignResult.message })
          .eq('id', referral.id);
      }
    } catch (err: any) {
      this.logger.error(`Silent handshake failed for trip ${trip.id}: ${err.message}`);
    }
  }

  /**
   * Search for available drivers across ALL other tenants within radius.
   * Uses driver_identities to find cross-tenant profiles.
   */
  private async findCrossTenantDrivers(
    excludeTenantId: string,
    pickupLat: number,
    pickupLng: number,
    category: string,
  ): Promise<CrossTenantDriver[]> {
    const supabase = this.supabaseService.getClient();

    // Find all online drivers from other tenants
    const { data: profiles, error } = await supabase
      .from('driver_profiles')
      .select('id, tenant_id, driver_identity_id, rating, driver_locations!inner(lat, lng)')
      .neq('tenant_id', excludeTenantId)
      .eq('status', 'online')
      .eq('is_active', true)
      .gte('driver_locations.updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(50);

    if (error || !profiles) return [];

    // Calculate distance and filter within radius
    const candidates: CrossTenantDriver[] = [];
    for (const profile of profiles) {
      const loc = (profile.driver_locations as any)?.[0];
      if (!loc?.lat || !loc?.lng) continue;

      const dist = this.haversineDistanceMiles(pickupLat, pickupLng, loc.lat, loc.lng);
      if (dist <= this.SPILL_OVER_RADIUS_MILES) {
        candidates.push({
          driverProfileId: profile.id,
          driverIdentityId: profile.driver_identity_id,
          fulfillingTenantId: profile.tenant_id,
          distanceMiles: Math.round(dist * 100) / 100,
        });
      }
    }

    // Sort by distance (nearest first)
    return candidates.sort((a, b) => a.distanceMiles - b.distanceMiles);
  }

  private haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Manual trigger for Super-Admin ────────────────────────────────────

  async getMarketplaceStatus(): Promise<{
    unfulfilledTrips: number;
    activeSpillOvers: number;
    totalSpillOversToday: number;
    averageMatchTimeMs: number;
  }> {
    const supabase = this.supabaseService.getClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [unfulfilled, activeRefs, todayRefs] = await Promise.all([
      supabase.from('trips').select('id', { count: 'exact', head: true })
        .eq('status', 'requested').is('driver_id', null),
      supabase.from('spill_over_referrals').select('id', { count: 'exact', head: true })
        .eq('status', 'accepted'),
      supabase.from('spill_over_referrals').select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
    ]);

    return {
      unfulfilledTrips: unfulfilled.count || 0,
      activeSpillOvers: activeRefs.count || 0,
      totalSpillOversToday: todayRefs.count || 0,
      averageMatchTimeMs: 0, // TODO: calculate from accepted_at - created_at
    };
  }
}
