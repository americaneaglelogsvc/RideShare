import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * M7.3: Multi-Zone Dynamic Pricing & Surging
 *
 * Neighborhood-level pricing using PostGIS Polygons:
 * - If a trip's pickup_location is inside a "Premium Zone" polygon,
 *   apply the zone's multiplier to the per-mile rate.
 * - Dynamic Surge: Ratio-based on drivers per square mile.
 *   If density drops below threshold, suggest 1.5x–2.0x multiplier.
 *
 * All monetary values in integer cents. Distance in miles.
 */

export interface GeoZone {
  id: string;
  tenantId: string;
  zoneName: string;
  zoneType: string;
  priceMultiplier: number;
  perMileRateCents?: number;
  baseFareOverrideCents?: number;
  surgeFloor: number;
  surgeCap: number;
  isActive: boolean;
}

export interface ZonePricingResult {
  zone?: GeoZone;
  baseFareCents: number;
  perMileRateCents: number;
  surgeMultiplier: number;
  effectiveMultiplier: number;
}

export interface DensitySurgeResult {
  onlineDrivers: number;
  areaSqMiles: number;
  driversPerSqMile: number;
  suggestedSurge: number;
}

@Injectable()
export class GeoZoneService {
  private readonly logger = new Logger(GeoZoneService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Determine the pricing zone for a given lat/lng within a tenant.
   * Uses the PostGIS find_geo_zone RPC for GIST-indexed spatial lookup.
   */
  async findZoneForLocation(
    tenantId: string,
    lat: number,
    lng: number,
  ): Promise<GeoZone | null> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase.rpc('find_geo_zone', {
        p_tenant_id: tenantId,
        p_lat: lat,
        p_lng: lng,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const row = data[0];
      return {
        id: row.zone_id,
        tenantId,
        zoneName: row.zone_name,
        zoneType: row.zone_type,
        priceMultiplier: Number(row.price_multiplier),
        perMileRateCents: row.per_mile_rate_cents,
        baseFareOverrideCents: row.base_fare_override_cents,
        surgeFloor: Number(row.surge_floor),
        surgeCap: Number(row.surge_cap),
        isActive: true,
      };
    } catch (err: any) {
      this.logger.warn(`GeoZone RPC unavailable: ${err.message}`);
      return null;
    }
  }

  /**
   * Get the driver density per square mile around a point.
   * Uses the get_driver_density_per_sq_mile RPC.
   */
  async getDriverDensity(
    tenantId: string,
    lat: number,
    lng: number,
    radiusMiles: number = 2.0,
  ): Promise<DensitySurgeResult> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase.rpc('get_driver_density_per_sq_mile', {
        p_tenant_id: tenantId,
        p_lat: lat,
        p_lng: lng,
        p_radius_miles: radiusMiles,
      });

      if (error || !data || data.length === 0) {
        return { onlineDrivers: 0, areaSqMiles: 0, driversPerSqMile: 0, suggestedSurge: 1.5 };
      }

      const row = data[0];
      const density = Number(row.drivers_per_sq_mile) || 0;

      // Dynamic surge based on driver density per square mile
      let suggestedSurge = 1.0;
      if (density < 0.5) suggestedSurge = 2.0;       // Very low density
      else if (density < 1.0) suggestedSurge = 1.8;   // Low density
      else if (density < 2.0) suggestedSurge = 1.5;   // Below average
      else if (density < 3.0) suggestedSurge = 1.3;   // Slightly below average
      else if (density < 5.0) suggestedSurge = 1.1;   // Adequate
      // density >= 5.0 → no surge

      return {
        onlineDrivers: Number(row.online_drivers),
        areaSqMiles: Number(row.area_sq_miles),
        driversPerSqMile: Math.round(density * 100) / 100,
        suggestedSurge,
      };
    } catch (err: any) {
      this.logger.warn(`Driver density RPC unavailable: ${err.message}`);
      return { onlineDrivers: 0, areaSqMiles: 0, driversPerSqMile: 0, suggestedSurge: 1.0 };
    }
  }

  /**
   * Calculate zone-aware pricing for a trip.
   * Combines polygon zone multiplier + density-based surge.
   */
  async calculateZonePricing(
    tenantId: string,
    pickupLat: number,
    pickupLng: number,
    category: string,
  ): Promise<ZonePricingResult> {
    // Default per-mile rates by category (in cents)
    const defaultPerMileRates: Record<string, number> = {
      economy: 125,
      premium: 175,
      luxury: 250,
    };
    const defaultBaseFares: Record<string, number> = {
      economy: 250,
      premium: 400,
      luxury: 600,
    };

    const baseFareCentsDefault = defaultBaseFares[category] || 250;
    const perMileRateCentsDefault = defaultPerMileRates[category] || 125;

    // Find the zone for the pickup location
    const zone = await this.findZoneForLocation(tenantId, pickupLat, pickupLng);

    // Get density-based surge
    const density = await this.getDriverDensity(tenantId, pickupLat, pickupLng);

    let baseFareCents = baseFareCentsDefault;
    let perMileRateCents = perMileRateCentsDefault;
    let surgeMultiplier = density.suggestedSurge;

    if (zone) {
      // Override rates if the zone specifies them
      if (zone.baseFareOverrideCents) {
        baseFareCents = zone.baseFareOverrideCents;
      }
      if (zone.perMileRateCents) {
        perMileRateCents = zone.perMileRateCents;
      }

      // Apply zone price multiplier to per-mile rate
      perMileRateCents = Math.round(perMileRateCents * zone.priceMultiplier);

      // Clamp surge within zone's floor/cap
      surgeMultiplier = Math.max(surgeMultiplier, zone.surgeFloor);
      surgeMultiplier = Math.min(surgeMultiplier, zone.surgeCap);
    } else {
      // No zone — cap surge at 2.0x globally
      surgeMultiplier = Math.min(surgeMultiplier, 2.0);
    }

    return {
      zone: zone || undefined,
      baseFareCents,
      perMileRateCents,
      surgeMultiplier,
      effectiveMultiplier: zone ? zone.priceMultiplier * surgeMultiplier : surgeMultiplier,
    };
  }

  /**
   * Create a new geo zone for a tenant.
   * Boundary is a GeoJSON polygon.
   */
  async createZone(params: {
    tenantId: string;
    zoneName: string;
    zoneType: string;
    boundaryGeoJson: any;
    priceMultiplier: number;
    perMileRateCents?: number;
    baseFareOverrideCents?: number;
    surgeFloor?: number;
    surgeCap?: number;
  }): Promise<GeoZone> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('geo_zones')
      .insert({
        tenant_id: params.tenantId,
        zone_name: params.zoneName,
        zone_type: params.zoneType,
        boundary: params.boundaryGeoJson,
        price_multiplier: params.priceMultiplier,
        per_mile_rate_cents: params.perMileRateCents,
        base_fare_override_cents: params.baseFareOverrideCents,
        surge_floor: params.surgeFloor ?? 1.0,
        surge_cap: params.surgeCap ?? 2.0,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException('Failed to create geo zone: ' + error.message);
    }

    this.logger.log(`M7.3: Created geo zone "${params.zoneName}" for tenant ${params.tenantId}`);
    return this.mapZone(data);
  }

  /**
   * List all zones for a tenant.
   */
  async listZones(tenantId: string): Promise<GeoZone[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('geo_zones')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('zone_name', { ascending: true });

    if (error) throw new BadRequestException('Failed to list geo zones');
    return (data || []).map((d: any) => this.mapZone(d));
  }

  /**
   * Deactivate a zone.
   */
  async deactivateZone(tenantId: string, zoneId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('geo_zones')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', zoneId)
      .eq('tenant_id', tenantId);

    if (error) throw new BadRequestException('Failed to deactivate zone');
    this.logger.log(`M7.3: Deactivated geo zone ${zoneId}`);
  }

  private mapZone(d: any): GeoZone {
    return {
      id: d.id,
      tenantId: d.tenant_id,
      zoneName: d.zone_name,
      zoneType: d.zone_type,
      priceMultiplier: Number(d.price_multiplier),
      perMileRateCents: d.per_mile_rate_cents,
      baseFareOverrideCents: d.base_fare_override_cents,
      surgeFloor: Number(d.surge_floor),
      surgeCap: Number(d.surge_cap),
      isActive: d.is_active,
    };
  }
}
