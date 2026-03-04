import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// §21: Marketplace / Ads / Paid Placements
// §22: Chicagoland Events Engine
// Feature-gated expansions for event-driven surge + marketplace ads

export interface EventDefinition {
  id?: string;
  tenantId: string;
  name: string;
  venue: string;
  address: string;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string;
  expectedAttendance: number;
  surgeMultiplier?: number;
  autoDispatchRadius?: number;
  tags?: string[];
}

export interface MarketplaceAd {
  id?: string;
  tenantId: string;
  advertiserId: string;
  type: 'banner' | 'interstitial' | 'card' | 'sponsored_result';
  title: string;
  imageUrl?: string;
  targetUrl: string;
  impressionBudget: number;
  costPerImpressionCents: number;
  startDate: string;
  endDate: string;
  targetZoneIds?: string[];
  isActive: boolean;
}

@Injectable()
export class EventsEngineService {
  private readonly logger = new Logger(EventsEngineService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ════════════════════════════════════════════════════════════════════
  // §22 — Events Engine
  // ════════════════════════════════════════════════════════════════════

  async createEvent(event: EventDefinition) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('events')
      .insert({
        tenant_id: event.tenantId,
        name: event.name,
        venue: event.venue,
        address: event.address,
        lat: event.lat,
        lng: event.lng,
        starts_at: event.startsAt,
        ends_at: event.endsAt,
        expected_attendance: event.expectedAttendance,
        surge_multiplier: event.surgeMultiplier || null,
        auto_dispatch_radius_miles: event.autoDispatchRadius || 5,
        tags: event.tags || [],
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Event created: ${data.id} — ${event.name}`);
    return data;
  }

  async getUpcomingEvents(tenantId: string, withinHours = 24) {
    const supabase = this.supabaseService.getClient();

    const windowEnd = new Date(Date.now() + withinHours * 3600_000).toISOString();

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('starts_at', new Date().toISOString())
      .lte('starts_at', windowEnd)
      .in('status', ['scheduled', 'active'])
      .order('starts_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getActiveEvents(tenantId: string) {
    const supabase = this.supabaseService.getClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .lte('starts_at', now)
      .gte('ends_at', now);

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async activateEvent(eventId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('events')
      .update({ status: 'active', activated_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('status', 'scheduled')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Event activated: ${eventId}`);
    return data;
  }

  async completeEvent(eventId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('events')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getEventSurgeZones(tenantId: string): Promise<{ eventId: string; name: string; lat: number; lng: number; radiusMiles: number; surgeMultiplier: number }[]> {
    const active = await this.getActiveEvents(tenantId);

    return active
      .filter(e => e.surge_multiplier && e.surge_multiplier > 1)
      .map(e => ({
        eventId: e.id,
        name: e.name,
        lat: e.lat,
        lng: e.lng,
        radiusMiles: e.auto_dispatch_radius_miles || 5,
        surgeMultiplier: e.surge_multiplier,
      }));
  }

  // ════════════════════════════════════════════════════════════════════
  // §21 — Marketplace / Ads / Paid Placements
  // ════════════════════════════════════════════════════════════════════

  async createAd(ad: MarketplaceAd) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('marketplace_ads')
      .insert({
        tenant_id: ad.tenantId,
        advertiser_id: ad.advertiserId,
        type: ad.type,
        title: ad.title,
        image_url: ad.imageUrl || null,
        target_url: ad.targetUrl,
        impression_budget: ad.impressionBudget,
        cost_per_impression_cents: ad.costPerImpressionCents,
        start_date: ad.startDate,
        end_date: ad.endDate,
        target_zone_ids: ad.targetZoneIds || [],
        is_active: ad.isActive,
        impressions_served: 0,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Marketplace ad created: ${data.id}`);
    return data;
  }

  async getActiveAds(tenantId: string, zoneId?: string, type?: string) {
    const supabase = this.supabaseService.getClient();
    const now = new Date().toISOString();

    let query = supabase
      .from('marketplace_ads')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now);

    if (type) query = query.eq('type', type);

    const { data, error } = await query.order('cost_per_impression_cents', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    let ads = data || [];

    // Filter by zone if specified
    if (zoneId && ads.length > 0) {
      ads = ads.filter(a => !a.target_zone_ids?.length || a.target_zone_ids.includes(zoneId));
    }

    // Filter by remaining budget
    ads = ads.filter(a => a.impressions_served < a.impression_budget);

    return ads;
  }

  async recordImpression(adId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.rpc('increment_ad_impressions', { p_ad_id: adId });

    if (error) {
      this.logger.warn(`Impression increment RPC failed for ad ${adId}: ${error.message}`);
    }
  }

  async getAdPerformance(adId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('marketplace_ads')
      .select('id, title, impression_budget, impressions_served, cost_per_impression_cents, start_date, end_date')
      .eq('id', adId)
      .single();

    if (error) throw new BadRequestException(error.message);

    return {
      ...data,
      budgetUsedPercent: data.impression_budget > 0
        ? Math.round((data.impressions_served / data.impression_budget) * 100)
        : 0,
      totalSpendCents: data.impressions_served * data.cost_per_impression_cents,
    };
  }
}
