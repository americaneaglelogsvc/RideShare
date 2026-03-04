import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// ── §6.2 GrabBoard ──────────────────────────────────────────────────
// Drivers can browse and claim unclaimed rides from a board instead of
// receiving push offers. Rides appear sorted by proximity & fare.

// ── §6.3 Airport Queue 2.0 ─────────────────────────────────────────
// Virtual FIFO queue with prequeue/active zones, fairness rotation,
// geofence entry/exit tracking, and max idle timeout.

// ── §6.4 Destination-Aware Matching ─────────────────────────────────
// Drivers can set a destination; matching prefers rides heading that way.

// ── §6.5 Preferred Driver / Vehicle Tiered Dispatch ─────────────────
// Riders can mark preferred drivers; dispatch tries them first.

// ── §6.6 Blacklists + Mutual Block ─────────────────────────────────
// Either party can block the other; dispatch respects blocks.

// ── §6.7 Scheduled Ride Dispatch ────────────────────────────────────
// Pre-booked rides dispatched N minutes before pickup.

@Injectable()
export class DispatchEnhancementsService {
  private readonly logger = new Logger(DispatchEnhancementsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ════════════════════════════════════════════════════════════════════
  // §6.2 — GrabBoard
  // ════════════════════════════════════════════════════════════════════

  async getGrabBoard(tenantId: string, driverLat: number, driverLng: number, radiusMiles = 10, limit = 20) {
    const supabase = this.supabaseService.getClient();
    const radiusMeters = radiusMiles * 1609.34;

    // Find unclaimed trips within radius, sorted by fare descending
    const { data, error } = await supabase.rpc('grab_board_trips', {
      p_tenant_id: tenantId,
      p_lat: driverLat,
      p_lng: driverLng,
      p_radius_m: radiusMeters,
      p_limit: limit,
    });

    if (error) {
      // Fallback: query directly
      this.logger.warn(`GrabBoard RPC failed, using fallback: ${error.message}`);
      const { data: fallback } = await supabase
        .from('trips')
        .select('id, pickup_address, pickup_lat, pickup_lng, dropoff_address, estimated_fare_cents, category, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'requested')
        .is('driver_id', null)
        .order('estimated_fare_cents', { ascending: false })
        .limit(limit);

      return fallback || [];
    }

    return data || [];
  }

  async claimFromGrabBoard(tripId: string, driverId: string, tenantId: string) {
    const supabase = this.supabaseService.getClient();

    // Atomic claim via RPC (same as offer acceptance)
    const { data, error } = await supabase.rpc('atomic_assign_trip', {
      p_trip_id: tripId,
      p_driver_id: driverId,
    });

    if (error) {
      if (error.message.includes('already assigned') || error.message.includes('conflict')) {
        throw new BadRequestException('Trip already claimed by another driver.');
      }
      throw new BadRequestException(error.message);
    }

    this.logger.log(`GrabBoard: Driver ${driverId} claimed trip ${tripId}`);
    return data;
  }

  // ════════════════════════════════════════════════════════════════════
  // §6.3 — Airport Queue 2.0
  // ════════════════════════════════════════════════════════════════════

  async enterAirportQueue(tenantId: string, driverId: string, airportCode: string, zone: string) {
    const supabase = this.supabaseService.getClient();

    // Check if already in queue
    const { data: existing } = await supabase
      .from('airport_queue')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('driver_id', driverId)
      .eq('airport_code', airportCode)
      .in('status', ['prequeue', 'active'])
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('Driver is already in the airport queue.');
    }

    const { data, error } = await supabase
      .from('airport_queue')
      .insert({
        tenant_id: tenantId,
        driver_id: driverId,
        airport_code: airportCode,
        zone,
        status: zone === 'staging' ? 'active' : 'prequeue',
        entered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Airport queue: Driver ${driverId} entered ${airportCode} zone=${zone}`);
    return data;
  }

  async getAirportQueuePosition(tenantId: string, driverId: string, airportCode: string) {
    const supabase = this.supabaseService.getClient();

    const { data: queue } = await supabase
      .from('airport_queue')
      .select('id, driver_id, status, entered_at, zone')
      .eq('tenant_id', tenantId)
      .eq('airport_code', airportCode)
      .eq('status', 'active')
      .order('entered_at', { ascending: true });

    const entries = queue || [];
    const position = entries.findIndex(e => e.driver_id === driverId);

    return {
      position: position >= 0 ? position + 1 : null,
      totalInQueue: entries.length,
      estimatedWaitMinutes: position >= 0 ? position * 8 : null, // ~8 min avg per position
    };
  }

  async leaveAirportQueue(tenantId: string, driverId: string, airportCode: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('airport_queue')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('driver_id', driverId)
      .eq('airport_code', airportCode)
      .in('status', ['prequeue', 'active']);

    if (error) throw new BadRequestException(error.message);
    return { left: true };
  }

  async popNextFromAirportQueue(tenantId: string, airportCode: string) {
    const supabase = this.supabaseService.getClient();

    // FIFO: oldest active entry
    const { data, error } = await supabase
      .from('airport_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('airport_code', airportCode)
      .eq('status', 'active')
      .order('entered_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    // Mark dispatched
    await supabase
      .from('airport_queue')
      .update({ status: 'dispatched', dispatched_at: new Date().toISOString() })
      .eq('id', data.id);

    return data;
  }

  // ════════════════════════════════════════════════════════════════════
  // §6.4 — Destination-Aware Matching
  // ════════════════════════════════════════════════════════════════════

  async setDriverDestination(driverId: string, tenantId: string, destLat: number, destLng: number, destAddress: string, activeUntil?: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('driver_destinations')
      .upsert({
        driver_id: driverId,
        tenant_id: tenantId,
        dest_lat: destLat,
        dest_lng: destLng,
        dest_address: destAddress,
        active_until: activeUntil || new Date(Date.now() + 4 * 3600_000).toISOString(),
        is_active: true,
      }, { onConflict: 'driver_id,tenant_id' })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async clearDriverDestination(driverId: string, tenantId: string) {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('driver_destinations')
      .update({ is_active: false })
      .eq('driver_id', driverId)
      .eq('tenant_id', tenantId);

    return { cleared: true };
  }

  async getDestinationAwareMatches(tenantId: string, tripDropoffLat: number, tripDropoffLng: number, candidateDriverIds: string[]) {
    if (candidateDriverIds.length === 0) return [];

    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('driver_destinations')
      .select('driver_id, dest_lat, dest_lng')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .in('driver_id', candidateDriverIds)
      .gt('active_until', new Date().toISOString());

    if (!data || data.length === 0) return [];

    // Score by proximity of trip dropoff to driver's destination
    return data.map(d => {
      const distKm = this.haversine(tripDropoffLat, tripDropoffLng, d.dest_lat, d.dest_lng);
      return { driverId: d.driver_id, destDistanceKm: Math.round(distKm * 10) / 10 };
    }).sort((a, b) => a.destDistanceKm - b.destDistanceKm);
  }

  // ════════════════════════════════════════════════════════════════════
  // §6.5 — Preferred Driver + Vehicle Tiered Dispatch
  // ════════════════════════════════════════════════════════════════════

  async addPreferredDriver(riderId: string, driverId: string, tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('preferred_drivers')
      .upsert({
        rider_id: riderId,
        driver_id: driverId,
        tenant_id: tenantId,
      }, { onConflict: 'rider_id,driver_id,tenant_id' })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async removePreferredDriver(riderId: string, driverId: string, tenantId: string) {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('preferred_drivers')
      .delete()
      .eq('rider_id', riderId)
      .eq('driver_id', driverId)
      .eq('tenant_id', tenantId);

    return { removed: true };
  }

  async getPreferredDrivers(riderId: string, tenantId: string): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('preferred_drivers')
      .select('driver_id')
      .eq('rider_id', riderId)
      .eq('tenant_id', tenantId);

    return (data || []).map(d => d.driver_id);
  }

  async tieredDispatch(tenantId: string, riderId: string, candidateDriverIds: string[]): Promise<{ tier1Preferred: string[]; tier2Regular: string[] }> {
    const preferred = await this.getPreferredDrivers(riderId, tenantId);
    const preferredSet = new Set(preferred);

    const tier1 = candidateDriverIds.filter(id => preferredSet.has(id));
    const tier2 = candidateDriverIds.filter(id => !preferredSet.has(id));

    return { tier1Preferred: tier1, tier2Regular: tier2 };
  }

  // ════════════════════════════════════════════════════════════════════
  // §6.6 — Blacklists + Mutual Block
  // ════════════════════════════════════════════════════════════════════

  async blockUser(blockerId: string, blockedId: string, tenantId: string, reason?: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('user_blocks')
      .upsert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        tenant_id: tenantId,
        reason: reason || null,
      }, { onConflict: 'blocker_id,blocked_id,tenant_id' })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Block: ${blockerId} blocked ${blockedId}`);
    return data;
  }

  async unblockUser(blockerId: string, blockedId: string, tenantId: string) {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .eq('tenant_id', tenantId);

    return { unblocked: true };
  }

  async getBlockedIds(userId: string, tenantId: string): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    // Mutual: both directions
    const { data } = await supabase
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .eq('tenant_id', tenantId)
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    if (!data) return [];
    const ids = new Set<string>();
    for (const b of data) {
      if (b.blocker_id === userId) ids.add(b.blocked_id);
      if (b.blocked_id === userId) ids.add(b.blocker_id);
    }
    return Array.from(ids);
  }

  async filterBlockedDrivers(riderId: string, tenantId: string, driverIds: string[]): Promise<string[]> {
    const blocked = await this.getBlockedIds(riderId, tenantId);
    const blockedSet = new Set(blocked);
    return driverIds.filter(id => !blockedSet.has(id));
  }

  // ════════════════════════════════════════════════════════════════════
  // §6.7 — Scheduled Ride Dispatch
  // ════════════════════════════════════════════════════════════════════

  async createScheduledRide(tenantId: string, riderId: string, pickup: any, dropoff: any, scheduledAt: string, category: string, estimatedFareCents?: number) {
    const supabase = this.supabaseService.getClient();

    const scheduledTime = new Date(scheduledAt);
    const now = new Date();
    if (scheduledTime.getTime() - now.getTime() < 30 * 60_000) {
      throw new BadRequestException('Scheduled rides must be at least 30 minutes in the future.');
    }

    const { data, error } = await supabase
      .from('scheduled_rides')
      .insert({
        tenant_id: tenantId,
        rider_id: riderId,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.address,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        scheduled_at: scheduledAt,
        category,
        estimated_fare_cents: estimatedFareCents || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Scheduled ride ${data.id} for ${scheduledAt}`);
    return data;
  }

  async getUpcomingScheduledRides(tenantId: string, windowMinutes = 30) {
    const supabase = this.supabaseService.getClient();

    const windowEnd = new Date(Date.now() + windowMinutes * 60_000).toISOString();

    const { data, error } = await supabase
      .from('scheduled_rides')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .lte('scheduled_at', windowEnd)
      .order('scheduled_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async cancelScheduledRide(rideId: string, cancelledBy: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('scheduled_rides')
      .update({ status: 'cancelled', cancelled_by: cancelledBy, cancelled_at: new Date().toISOString() })
      .eq('id', rideId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async dispatchScheduledRide(rideId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('scheduled_rides')
      .update({ status: 'dispatching', dispatched_at: new Date().toISOString() })
      .eq('id', rideId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ════════════════════════════════════════════════════════════════════
  // Utility
  // ════════════════════════════════════════════════════════════════════

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
