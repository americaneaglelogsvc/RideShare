import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { RealtimeService } from './realtime.service';

/**
 * M7.2: Parallel Offer Distribution Engine
 *
 * Key design principles:
 * - Multi-Ping: When a trip is created for Tenant A, only drivers with an "online"
 *   profile for Tenant A receive pings — scoped to the Tenant A channel.
 * - Non-Blocking: If a driver is ON_TRIP for Tenant B, their Tenant A profile is
 *   still eligible if it's "online". The system does NOT suppress cross-tenant offers.
 * - Driver Autonomy: The system never blocks; the driver manually chooses which
 *   "Instant Offer" to accept.
 * - First-Accept Wins: The first driver to ACCEPT for a given trip_id within
 *   that tenant's pool atomically wins the ride (optimistic concurrency lock).
 */

export interface InstantOffer {
  offerId: string;
  tenantId: string;
  tripId: string;
  riderName: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  estimatedFareCents: number;
  estimatedDistanceMiles: number;
  estimatedDurationMinutes: number;
  pickupEtaMinutes: number;
  category: string;
  specialInstructions?: string;
  expiresAt: string;
}

@Injectable()
export class OfferService {
  private readonly logger = new Logger(OfferService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly realtimeService: RealtimeService,
  ) {}

  /**
   * Broadcast instant offers to ALL eligible drivers for a tenant.
   * This is the "Multi-Ping" — tenant-scoped, non-blocking.
   *
   * A driver who is ON_TRIP for Tenant B but "online" for Tenant A
   * WILL receive the Tenant A ping. The system does not block.
   */
  async broadcastInstantOffers(
    tenantId: string,
    tripId: string,
    driverIds: string[],
    tripData: {
      riderName: string;
      riderPhone: string;
      pickup: { address: string; lat: number; lng: number };
      dropoff: { address: string; lat: number; lng: number };
      fareCents: number;
      distanceMiles: number;
      durationMinutes: number;
      category: string;
      specialInstructions?: string;
    },
    etas: Map<string, number>,
  ): Promise<string[]> {
    const supabase = this.supabaseService.getClient();
    const expiresAt = new Date(Date.now() + 20_000); // 20-second offer window
    const offerIds: string[] = [];

    for (const driverId of driverIds) {
      try {
        const eta = etas.get(driverId) ?? 5;

        const { data: offer, error } = await supabase
          .from('ride_offers')
          .insert({
            tenant_id: tenantId,
            driver_id: driverId,
            trip_id: tripId,
            rider_name: tripData.riderName,
            rider_phone: tripData.riderPhone,
            pickup_address: tripData.pickup.address,
            dropoff_address: tripData.dropoff.address,
            pickup_lat: tripData.pickup.lat,
            pickup_lng: tripData.pickup.lng,
            dropoff_lat: tripData.dropoff.lat,
            dropoff_lng: tripData.dropoff.lng,
            estimated_fare_cents: tripData.fareCents,
            net_payout_cents: 0, // Will be calculated on acceptance
            estimated_distance_miles: tripData.distanceMiles,
            estimated_duration_minutes: tripData.durationMinutes,
            pickup_eta_minutes: eta,
            category: tripData.category,
            special_instructions: tripData.specialInstructions,
            expires_at: expiresAt.toISOString(),
          })
          .select('id')
          .single();

        if (error) {
          this.logger.warn(`Failed to create offer for driver ${driverId}: ${error.message}`);
          continue;
        }

        if (offer) {
          offerIds.push(offer.id);

          // Emit tenant-scoped WebSocket event for this driver
          await this.emitInstantOffer(tenantId, driverId, {
            offerId: offer.id,
            tenantId,
            tripId,
            riderName: tripData.riderName,
            pickup: tripData.pickup,
            dropoff: tripData.dropoff,
            estimatedFareCents: tripData.fareCents,
            estimatedDistanceMiles: tripData.distanceMiles,
            estimatedDurationMinutes: tripData.durationMinutes,
            pickupEtaMinutes: eta,
            category: tripData.category,
            specialInstructions: tripData.specialInstructions,
            expiresAt: expiresAt.toISOString(),
          });
        }
      } catch (err: any) {
        this.logger.error(`Offer broadcast error for driver ${driverId}: ${err.message}`);
      }
    }

    // Schedule auto-expiry for all offers that weren't accepted
    this.scheduleOfferExpiry(tenantId, tripId, 20_000);

    this.logger.log(
      `M7.2: Broadcast ${offerIds.length} instant offers for trip ${tripId} (tenant ${tenantId})`,
    );

    return offerIds;
  }

  /**
   * First-Accept-Wins: Atomically accept an offer using optimistic concurrency.
   * Only the first driver to hit ACCEPT for a trip_id wins.
   */
  async acceptInstantOffer(
    tenantId: string,
    driverId: string,
    offerId: string,
  ): Promise<{ success: boolean; tripId?: string; message: string }> {
    const supabase = this.supabaseService.getClient();

    try {
      // Step 1: Validate the offer is still pending
      const { data: offer, error: offerError } = await supabase
        .from('ride_offers')
        .select('id, trip_id, status, expires_at')
        .eq('tenant_id', tenantId)
        .eq('id', offerId)
        .eq('driver_id', driverId)
        .single();

      if (offerError || !offer) {
        return { success: false, message: 'Offer not found' };
      }

      if (offer.status !== 'pending') {
        return { success: false, message: 'Offer is no longer available' };
      }

      if (new Date(offer.expires_at) < new Date()) {
        return { success: false, message: 'Offer has expired' };
      }

      // Step 2: Atomic trip assignment — first-accept-wins via optimistic lock
      const { data: assignedTrip, error: assignError } = await supabase
        .from('trips')
        .update({
          driver_id: driverId,
          status: 'assigned',
        })
        .eq('tenant_id', tenantId)
        .eq('id', offer.trip_id)
        .eq('status', 'requested')
        .is('driver_id', null)
        .select('id')
        .single();

      if (assignError || !assignedTrip) {
        // Another driver already won this trip
        await supabase
          .from('ride_offers')
          .update({ status: 'declined' })
          .eq('id', offerId);

        return { success: false, message: 'Trip already assigned to another driver' };
      }

      // Step 3: Mark this offer as accepted, decline all others for this trip
      await supabase
        .from('ride_offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      await supabase
        .from('ride_offers')
        .update({ status: 'declined' })
        .eq('tenant_id', tenantId)
        .eq('trip_id', offer.trip_id)
        .neq('id', offerId)
        .eq('status', 'pending');

      // Step 4: Update driver profile status for THIS tenant only
      await supabase
        .from('driver_profiles')
        .update({ status: 'en_route_pickup' })
        .eq('tenant_id', tenantId)
        .eq('id', driverId);

      // Step 5: Emit realtime event
      await this.realtimeService.emitTripStateChanged({
        tripId: offer.trip_id,
        status: 'assigned',
        driverId,
      });

      this.logger.log(
        `M7.2: Driver ${driverId} won trip ${offer.trip_id} (tenant ${tenantId}) — first-accept-wins`,
      );

      return {
        success: true,
        tripId: offer.trip_id,
        message: 'Offer accepted. Navigate to pickup.',
      };
    } catch (err: any) {
      this.logger.error(`acceptInstantOffer failed: ${err.message}`);
      return { success: false, message: 'Accept failed — try again' };
    }
  }

  /**
   * Emit a tenant-scoped instant offer to a specific driver via Supabase Realtime.
   * The channel name is `tenant:{tenantId}:driver:{driverId}` ensuring
   * Tenant A offers never leak to Tenant B channels.
   */
  private async emitInstantOffer(
    tenantId: string,
    driverId: string,
    offer: InstantOffer,
  ): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();
      const channelName = `tenant:${tenantId}:driver:${driverId}`;

      const channel = supabase.channel(channelName).subscribe();

      await channel.send({
        type: 'broadcast',
        event: 'instant_offer',
        payload: offer,
      });

      // Clean up — the driver's persistent connection will pick up the message
      setTimeout(() => {
        channel.unsubscribe().catch(() => {});
      }, 5000);
    } catch (err: any) {
      this.logger.warn(`Failed to emit instant offer: ${err.message}`);
    }
  }

  /**
   * Schedule auto-expiry for all pending offers on a trip.
   */
  private scheduleOfferExpiry(tenantId: string, tripId: string, delayMs: number): void {
    setTimeout(async () => {
      try {
        const supabase = this.supabaseService.getClient();
        await supabase
          .from('ride_offers')
          .update({ status: 'expired' })
          .eq('tenant_id', tenantId)
          .eq('trip_id', tripId)
          .eq('status', 'pending');
      } catch (err: any) {
        this.logger.warn(`Offer expiry failed for trip ${tripId}: ${err.message}`);
      }
    }, delayMs);
  }

  /**
   * Get all active (pending) offers for a driver across a specific tenant.
   * Supports the multi-tenant overlay in the driver app.
   */
  async getActiveOffersForDriver(
    tenantId: string,
    driverId: string,
  ): Promise<InstantOffer[]> {
    const supabase = this.supabaseService.getClient();

    const { data: offers, error } = await supabase
      .from('ride_offers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('driver_id', driverId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !offers) return [];

    return offers.map((o: any) => ({
      offerId: o.id,
      tenantId: o.tenant_id,
      tripId: o.trip_id,
      riderName: o.rider_name,
      pickup: { address: o.pickup_address, lat: o.pickup_lat, lng: o.pickup_lng },
      dropoff: { address: o.dropoff_address, lat: o.dropoff_lat, lng: o.dropoff_lng },
      estimatedFareCents: o.estimated_fare_cents,
      estimatedDistanceMiles: o.estimated_distance_miles,
      estimatedDurationMinutes: o.estimated_duration_minutes,
      pickupEtaMinutes: o.pickup_eta_minutes,
      category: o.category,
      specialInstructions: o.special_instructions,
      expiresAt: o.expires_at,
    }));
  }
}
