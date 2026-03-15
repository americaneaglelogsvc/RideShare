import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { RealtimeService } from './realtime.service';
import { LedgerService } from './ledger.service';

export enum TripStatus {
  REQUESTED = 'requested',
  ASSIGNED = 'assigned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

const DEFAULT_MAX_DISTANCE_MILES = 5;
const MILES_TO_METERS = 1609.34;
const BASE_FARE_CENTS = 500;
const PER_MILE_CENTS = 150;

interface RideRequest {
  tenantId: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  dropoff: {
    address: string;
    lat: number;
    lng: number;
  };
  category: string;
  estimatedFare: number;
  specialInstructions?: string;
}

interface DriverMatch {
  driverId: string;
  distanceMiles: number;
  eta: number;
  rating: number;
  vehicleCategory: string;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly realtimeService: RealtimeService,
    private readonly ledgerService: LedgerService
  ) {}

  async radiusSearchDrivers(
    tenantId: string,
    pickupLat: number,
    pickupLng: number,
    category: string,
    maxDistanceMiles: number = DEFAULT_MAX_DISTANCE_MILES
  ): Promise<DriverMatch[]> {
    return this.findAvailableDrivers(tenantId, pickupLat, pickupLng, category, maxDistanceMiles);
  }

  async findAvailableDrivers(
    tenantId: string,
    pickupLat: number,
    pickupLng: number,
    category: string,
    maxDistanceMiles: number = DEFAULT_MAX_DISTANCE_MILES
  ): Promise<DriverMatch[]> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: drivers, error } = await supabase
        .from('driver_profiles')
        .select(`
          id,
          rating,
          driver_identity_id,
          vehicles!inner (
            category
          ),
          driver_locations!inner (
            lat,
            lng,
            updated_at
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'online')
        .eq('is_active', true)
        .eq('vehicles.category', category)
        .gte('driver_locations.updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('rating', { ascending: false });

      if (error || !drivers) {
        this.logger.error('Error finding drivers:', error);
        return [];
      }

      const matches: DriverMatch[] = [];

      for (const driver of drivers) {
        const driverLat = driver.driver_locations[0]?.lat;
        const driverLng = driver.driver_locations[0]?.lng;

        if (driverLat === null || driverLat === undefined || driverLng === null || driverLng === undefined) continue;

        const distanceMiles = this.calculateDistanceMiles(pickupLat, pickupLng, driverLat, driverLng);

        if (distanceMiles <= maxDistanceMiles) {
          const eta = Math.ceil(distanceMiles * 2);

          matches.push({
            driverId: driver.id,
            distanceMiles,
            eta,
            rating: driver.rating,
            vehicleCategory: driver.vehicles[0].category
          });
        }
      }

      return matches.sort((a, b) => {
        if (a.distanceMiles !== b.distanceMiles) {
          return a.distanceMiles - b.distanceMiles;
        }
        return b.rating - a.rating;
      });

    } catch (error) {
      this.logger.error('Error in findAvailableDrivers:', error);
      return [];
    }
  }

  /**
   * M7.1: PostGIS-powered geospatial driver discovery.
   * Uses ST_DWithin for fast spatial index lookup, strictly tenant-scoped.
   * Returns Top 10 nearest available drivers within radiusMiles.
   */
  async findNearestDriversGeo(
    tenantId: string,
    pickupLat: number,
    pickupLng: number,
    category: string,
    radiusMiles: number = DEFAULT_MAX_DISTANCE_MILES,
    limit: number = 10,
  ): Promise<DriverMatch[]> {
    const supabase = this.supabaseService.getClient();

    try {
      // Use Supabase RPC to call a PostGIS spatial query
      const { data, error } = await supabase.rpc('find_nearest_drivers', {
        p_tenant_id: tenantId,
        p_lat: pickupLat,
        p_lng: pickupLng,
        p_radius_miles: radiusMiles,
        p_category: category,
        p_limit: limit,
      });

      if (error) {
        this.logger.warn('PostGIS RPC unavailable, falling back to in-memory search:', error.message);
        const fallback = await this.findAvailableDrivers(tenantId, pickupLat, pickupLng, category, radiusMiles);
        return fallback.slice(0, limit);
      }

      return (data || []).map((row: any) => ({
        driverId: row.driver_profile_id,
        distanceMiles: Math.round((row.distance_meters / MILES_TO_METERS) * 100) / 100,
        eta: Math.ceil((row.distance_meters / MILES_TO_METERS) * 2),
        rating: row.rating || 5.0,
        vehicleCategory: row.category || category,
      }));
    } catch (err) {
      this.logger.error('Geospatial search error, falling back:', err);
      const fallback = await this.findAvailableDrivers(tenantId, pickupLat, pickupLng, category, radiusMiles);
      return fallback.slice(0, limit);
    }
  }

  async dispatchRide(rideRequest: RideRequest): Promise<string | null> {
    const supabase = this.supabaseService.getClient();

    try {
      const availableDrivers = await this.findAvailableDrivers(
        rideRequest.tenantId,
        rideRequest.pickup.lat,
        rideRequest.pickup.lng,
        rideRequest.category
      );

      if (availableDrivers.length === 0) {
        this.logger.log('No available drivers found');
        return null;
      }

      const tripDistanceMiles = this.calculateDistanceMiles(
        rideRequest.pickup.lat,
        rideRequest.pickup.lng,
        rideRequest.dropoff.lat,
        rideRequest.dropoff.lng
      );

      const estimatedFareCents = this.calculateEstimatedFareCents(tripDistanceMiles);

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          tenant_id: rideRequest.tenantId,
          rider_id: rideRequest.riderId,
          pickup_address: rideRequest.pickup.address,
          dropoff_address: rideRequest.dropoff.address,
          pickup_lat: rideRequest.pickup.lat,
          pickup_lng: rideRequest.pickup.lng,
          dropoff_lat: rideRequest.dropoff.lat,
          dropoff_lng: rideRequest.dropoff.lng,
          distance_miles: tripDistanceMiles,
          fare_cents: estimatedFareCents,
          net_payout_cents: 0,
          commission_cents: 0,
          status: TripStatus.REQUESTED,
          special_instructions: rideRequest.specialInstructions
        })
        .select()
        .single();

      if (tripError || !trip) {
        this.logger.error('Error creating trip:', tripError);
        return null;
      }

      const topDrivers = availableDrivers.slice(0, 3);
      const offerPromises = topDrivers.map(driver => this.sendRideOffer(driver, trip, rideRequest));

      await Promise.all(offerPromises);

      await this.realtimeService.emitTripStateChanged({
        tripId: trip.id,
        status: TripStatus.REQUESTED,
      });

      return trip.id;

    } catch (error) {
      this.logger.error('Error dispatching ride:', error);
      return null;
    }
  }

  async sendRideOffer(driver: DriverMatch, trip: any, rideRequest: RideRequest) {
    const supabase = this.supabaseService.getClient();

    const expiresAt = new Date(Date.now() + 15000);

    try {
      const { error } = await supabase
        .from('ride_offers')
        .insert({
          tenant_id: rideRequest.tenantId,
          driver_id: driver.driverId,
          trip_id: trip.id,
          rider_name: rideRequest.riderName,
          rider_phone: rideRequest.riderPhone,
          pickup_address: rideRequest.pickup.address,
          dropoff_address: rideRequest.dropoff.address,
          pickup_lat: rideRequest.pickup.lat,
          pickup_lng: rideRequest.pickup.lng,
          dropoff_lat: rideRequest.dropoff.lat,
          dropoff_lng: rideRequest.dropoff.lng,
          estimated_fare_cents: trip.fare_cents,
          net_payout_cents: trip.net_payout_cents,
          estimated_distance_miles: trip.distance_miles,
          estimated_duration_minutes: Math.ceil(trip.distance_miles * 2.5),
          pickup_eta_minutes: driver.eta,
          category: rideRequest.category,
          special_instructions: rideRequest.specialInstructions,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        this.logger.error('Error sending ride offer:', error);
      }

      setTimeout(async () => {
        await supabase
          .from('ride_offers')
          .update({ status: 'expired' })
          .eq('tenant_id', rideRequest.tenantId)
          .eq('driver_id', driver.driverId)
          .eq('trip_id', trip.id)
          .eq('status', 'pending');
      }, 15000);

    } catch (error) {
      this.logger.error('Error in sendRideOffer:', error);
    }
  }

  async acceptOffer(tenantId: string, tripId: string, driverId: string): Promise<{ success: boolean; trip?: any; message?: string }> {
    const supabase = this.supabaseService.getClient();

    try {
      // M1.5: Use atomic_assign_trip RPC with FOR UPDATE row-level locking
      const { data: lockResult, error: lockError } = await supabase.rpc('atomic_assign_trip', {
        p_tenant_id: tenantId,
        p_trip_id: tripId,
        p_driver_id: driverId,
      });

      const assignment = lockResult?.[0] || lockResult;
      const assigned = assignment?.assigned === true;

      if (lockError || !assigned) {
        return {
          success: false,
          message: 'Trip is no longer available to accept',
        };
      }

      // Fetch the updated trip
      const { data: updatedTrip } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      // H1: Record TRIP_ASSIGNED ledger event for audit trail
      await this.ledgerService.recordLedgerEvent({
        eventType: 'TRIP_ASSIGNED',
        tripId,
        tenantId,
        driverId,
        fareCents: updatedTrip?.fare_cents || 0,
      });

      await this.realtimeService.emitTripStateChanged({
        tripId,
        status: TripStatus.ASSIGNED,
        driverId,
      });

      return { success: true, trip: updatedTrip };

    } catch (e: any) {
      this.logger.error('acceptOffer failed:', e?.message || e);
      return { success: false, message: 'acceptOffer failed' };
    }
  }

  async startTrip(tenantId: string, tripId: string): Promise<{ success: boolean; trip?: any; message?: string }> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: updatedTrip, error } = await supabase
        .from('trips')
        .update({ status: TripStatus.ACTIVE })
        .eq('tenant_id', tenantId)
        .eq('id', tripId)
        .eq('status', TripStatus.ASSIGNED)
        .select('*')
        .single();

      if (error || !updatedTrip) {
        return { success: false, message: 'Trip cannot be started in its current state' };
      }

      // H1: Record TRIP_STARTED ledger event for audit trail
      await this.ledgerService.recordLedgerEvent({
        eventType: 'TRIP_STARTED',
        tripId,
        tenantId,
        driverId: updatedTrip.driver_id,
        fareCents: updatedTrip.fare_cents || 0,
      });

      await this.realtimeService.emitTripStateChanged({
        tripId,
        status: TripStatus.ACTIVE,
        driverId: updatedTrip.driver_id,
      });

      return { success: true, trip: updatedTrip };

    } catch (e: any) {
      this.logger.error('startTrip failed:', e?.message || e);
      return { success: false, message: 'startTrip failed' };
    }
  }

  async completeTrip(tenantId: string, tripId: string): Promise<{ success: boolean; trip?: any; message?: string }> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: updatedTrip, error } = await supabase
        .from('trips')
        .update({ status: TripStatus.COMPLETED })
        .eq('tenant_id', tenantId)
        .eq('id', tripId)
        .eq('status', TripStatus.ACTIVE)
        .select('*')
        .single();

      if (error || !updatedTrip) {
        return { success: false, message: 'Trip cannot be completed in its current state' };
      }

      const fees = await this.calculateTenantFees(tenantId, updatedTrip.fare_cents);

      await supabase
        .from('trips')
        .update({
          net_payout_cents: fees.driverPayoutCents,
          commission_cents: fees.platformFeeCents,
        })
        .eq('id', tripId);

      await this.ledgerService.recordTripFare({
        tripId,
        tenantId,
        driverId: updatedTrip.driver_id,
        fareCents: updatedTrip.fare_cents,
        platformFeeCents: fees.platformFeeCents,
        tenantNetCents: fees.tenantNetCents,
        driverPayoutCents: fees.driverPayoutCents,
      });

      await this.realtimeService.emitTripStateChanged({
        tripId,
        status: TripStatus.COMPLETED,
        driverId: updatedTrip.driver_id,
      });

      return { success: true, trip: updatedTrip };

    } catch (e: any) {
      this.logger.error('completeTrip failed:', e?.message || e);
      return { success: false, message: 'completeTrip failed' };
    }
  }

  async acceptRideOffer(tenantId: string, driverId: string, offerId: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: offer, error: offerError } = await supabase
        .from('ride_offers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', offerId)
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .single();

      if (offerError || !offer) {
        return false;
      }

      // M1.5: Use atomic_assign_trip RPC with FOR UPDATE row-level locking
      // This prevents the race condition where two drivers accept simultaneously
      const { data: lockResult, error: lockError } = await supabase.rpc('atomic_assign_trip', {
        p_tenant_id: tenantId,
        p_trip_id: offer.trip_id,
        p_driver_id: driverId,
      });

      const assignment = lockResult?.[0] || lockResult;
      const assigned = assignment?.assigned === true;

      if (lockError || !assigned) {
        // This driver lost the race — mark their offer as declined
        await supabase
          .from('ride_offers')
          .update({ status: 'declined' })
          .eq('id', offerId);
        return false;
      }

      // Winner: mark offer as accepted
      await supabase
        .from('ride_offers')
        .update({ status: 'accepted' })
        .eq('tenant_id', tenantId)
        .eq('id', offerId);

      // Decline all other pending offers for this trip
      await supabase
        .from('ride_offers')
        .update({ status: 'declined' })
        .eq('tenant_id', tenantId)
        .eq('trip_id', offer.trip_id)
        .neq('id', offerId)
        .eq('status', 'pending');

      await supabase
        .from('driver_profiles')
        .update({ status: 'en_route_pickup' })
        .eq('tenant_id', tenantId)
        .eq('id', driverId);

      await this.realtimeService.emitTripStateChanged({
        tripId: offer.trip_id,
        status: TripStatus.ASSIGNED,
        driverId,
      });

      return true;

    } catch (error) {
      this.logger.error('Error accepting ride offer:', error);
      return false;
    }
  }

  // C4: Cancel a trip — supports rider, driver, or system cancellation
  async cancelTrip(
    tenantId: string,
    tripId: string,
    cancelledBy: 'rider' | 'driver' | 'system',
    reason?: string,
  ): Promise<{ success: boolean; trip?: any; cancellationFeeCents?: number; message?: string }> {
    const supabase = this.supabaseService.getClient();

    try {
      // Fetch current trip state
      const { data: trip, error: fetchError } = await supabase
        .from('trips')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', tripId)
        .single();

      if (fetchError || !trip) {
        return { success: false, message: 'Trip not found' };
      }

      // Can only cancel trips that are requested, assigned, or active
      if (![TripStatus.REQUESTED, TripStatus.ASSIGNED, TripStatus.ACTIVE].includes(trip.status as TripStatus)) {
        return { success: false, message: `Trip cannot be cancelled in '${trip.status}' state` };
      }

      // Calculate cancellation fee: apply fee if trip is ASSIGNED or ACTIVE and cancelled by rider
      let cancellationFeeCents = 0;
      if (cancelledBy === 'rider' && trip.status !== TripStatus.REQUESTED) {
        // Late cancel penalty: $5.00 flat + 10% of estimated fare
        const lateCancelFlat = 500;
        const lateCancelPct = Math.floor((trip.fare_cents || 0) * 0.10);
        cancellationFeeCents = lateCancelFlat + lateCancelPct;
      }

      // Update trip to cancelled
      const { data: updatedTrip, error: updateError } = await supabase
        .from('trips')
        .update({
          status: TripStatus.CANCELLED,
          cancelled_by: cancelledBy,
          cancellation_reason: reason || null,
          cancellation_fee_cents: cancellationFeeCents,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', tripId)
        .eq('tenant_id', tenantId)
        .select('*')
        .single();

      if (updateError || !updatedTrip) {
        return { success: false, message: 'Failed to cancel trip' };
      }

      // Release driver back to available if assigned
      if (trip.driver_id) {
        await supabase
          .from('driver_profiles')
          .update({ status: 'online' })
          .eq('tenant_id', tenantId)
          .eq('id', trip.driver_id);
      }

      // Decline all pending offers for this trip
      await supabase
        .from('ride_offers')
        .update({ status: 'declined' })
        .eq('tenant_id', tenantId)
        .eq('trip_id', tripId)
        .eq('status', 'pending');

      // Record TRIP_CANCELLED ledger event
      await this.ledgerService.recordLedgerEvent({
        eventType: 'TRIP_CANCELLED',
        tripId,
        tenantId,
        driverId: trip.driver_id || null,
        fareCents: cancellationFeeCents,
        metadata: { cancelled_by: cancelledBy, reason },
      });

      await this.realtimeService.emitTripStateChanged({
        tripId,
        status: TripStatus.CANCELLED as any,
        driverId: trip.driver_id,
      });

      return {
        success: true,
        trip: updatedTrip,
        cancellationFeeCents,
        message: cancellationFeeCents > 0
          ? `Trip cancelled. Cancellation fee: $${(cancellationFeeCents / 100).toFixed(2)} USD.`
          : 'Trip cancelled. No fee applied.',
      };

    } catch (e: any) {
      this.logger.error('cancelTrip failed:', e?.message || e);
      return { success: false, message: 'cancelTrip failed' };
    }
  }

  // ── Adjustment types ─────────────────────────────────────────────────────

  async adjustTrip(
    tenantId: string,
    tripId: string,
    adjustments: Array<{
      type: 'extra_stop' | 'mess_fee' | 'damage_fee' | 'route_deviation' | 'min_wage_supplement' | 'wait_time' | 'toll' | 'gratuity' | 'discount';
      description: string;
      amount_cents?: number;
      applied_by?: string;
      metadata?: Record<string, any>;
    }>,
  ): Promise<{ success: boolean; adjustments?: any[]; new_fare_cents?: number; message?: string }> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', tripId)
        .single();

      if (tripErr || !trip) {
        return { success: false, message: 'Trip not found' };
      }

      if (!['active', 'completed'].includes(trip.status)) {
        return { success: false, message: `Cannot adjust trip in '${trip.status}' state` };
      }

      // Resolve per-tenant policy amounts for automatic types
      const { data: policy } = await supabase
        .from('tenant_pricing_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      const resolvedAdjustments = adjustments.map(adj => {
        let amount = adj.amount_cents ?? 0;
        if (amount === 0 && policy) {
          switch (adj.type) {
            case 'extra_stop':      amount = policy.extra_stop_fee_cents  ?? 200;   break;
            case 'mess_fee':        amount = policy.mess_fee_cents         ?? 15000; break;
            case 'damage_fee':      amount = policy.damage_fee_cents       ?? 25000; break;
            case 'route_deviation': {
              const devPct = policy.route_deviation_pct ?? 15;
              amount = Math.floor((trip.fare_cents || 0) * devPct / 100);
              break;
            }
            case 'min_wage_supplement': {
              if (policy.min_wage_cents_per_hour && trip.trip_duration_minutes) {
                const earnedCents = trip.net_payout_cents || trip.fare_cents || 0;
                const durationHrs = trip.trip_duration_minutes / 60;
                const minWageTotal = Math.ceil(policy.min_wage_cents_per_hour * durationHrs);
                amount = Math.max(0, minWageTotal - earnedCents);
              }
              break;
            }
          }
        }
        return { ...adj, amount_cents: amount };
      });

      const insertRows = resolvedAdjustments.map(adj => ({
        trip_id:         tripId,
        tenant_id:       tenantId,
        adjustment_type: adj.type,
        description:     adj.description,
        amount_cents:    adj.amount_cents,
        applied_by:      adj.applied_by || 'system',
        metadata:        adj.metadata || {},
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('trip_adjustments')
        .insert(insertRows)
        .select();

      if (insertErr) {
        return { success: false, message: insertErr.message };
      }

      const totalAdj = resolvedAdjustments.reduce((s, a) => s + (a.amount_cents || 0), 0);
      const newFareCents = (trip.fare_cents || 0) + totalAdj;

      await supabase
        .from('trips')
        .update({
          adjustment_total_cents: (trip.adjustment_total_cents || 0) + totalAdj,
          final_fare_cents: newFareCents,
        })
        .eq('id', tripId);

      for (const adj of resolvedAdjustments) {
        await this.ledgerService.recordLedgerEvent({
          eventType: `TRIP_ADJUSTMENT_${adj.type.toUpperCase()}`,
          tripId,
          tenantId,
          driverId: trip.driver_id,
          fareCents: adj.amount_cents || 0,
          metadata: { adjustment_type: adj.type, description: adj.description },
        });
      }

      return { success: true, adjustments: inserted, new_fare_cents: newFareCents };

    } catch (e: any) {
      this.logger.error('adjustTrip failed:', e?.message || e);
      return { success: false, message: 'adjustTrip failed' };
    }
  }

  async closeTrip(
    tenantId: string,
    tripId: string,
    closedBy: string = 'system',
  ): Promise<{ success: boolean; trip?: any; reconciliation?: any; message?: string }> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', tripId)
        .single();

      if (tripErr || !trip) {
        return { success: false, message: 'Trip not found' };
      }

      if (trip.status !== 'completed') {
        return { success: false, message: `Trip must be in completed state to close. Current: ${trip.status}` };
      }

      // Sum all adjustments
      const { data: adjustments } = await supabase
        .from('trip_adjustments')
        .select('adjustment_type, amount_cents')
        .eq('trip_id', tripId);

      const adjTotal = (adjustments || []).reduce((s: number, a: any) => s + (a.amount_cents || 0), 0);
      const finalFare = (trip.fare_cents || 0) + adjTotal;

      // Re-calculate fees on final fare
      const fees = await this.calculateTenantFees(tenantId, finalFare);

      const { data: closed, error: closeErr } = await supabase
        .from('trips')
        .update({
          status:                   'closed',
          closed_at:                new Date().toISOString(),
          closed_by:                closedBy,
          final_fare_cents:         finalFare,
          adjustment_total_cents:   adjTotal,
          net_payout_cents:         fees.driverPayoutCents,
          commission_cents:         fees.platformFeeCents,
        })
        .eq('id', tripId)
        .eq('tenant_id', tenantId)
        .select('*')
        .single();

      if (closeErr || !closed) {
        return { success: false, message: 'Failed to close trip' };
      }

      await this.ledgerService.recordLedgerEvent({
        eventType: 'TRIP_CLOSED',
        tripId,
        tenantId,
        driverId: trip.driver_id,
        fareCents: finalFare,
        metadata: {
          quoted_fare_cents:    trip.fare_cents,
          adjustment_total:     adjTotal,
          final_fare_cents:     finalFare,
          driver_payout_cents:  fees.driverPayoutCents,
          platform_fee_cents:   fees.platformFeeCents,
          closed_by:            closedBy,
        },
      });

      const reconciliation = {
        trip_id:              tripId,
        tenant_id:            tenantId,
        quoted_fare_cents:    trip.fare_cents,
        adjustment_total:     adjTotal,
        final_fare_cents:     finalFare,
        platform_fee_cents:   fees.platformFeeCents,
        driver_payout_cents:  fees.driverPayoutCents,
        adjustments:          adjustments || [],
        status:               'closed',
        closed_at:            closed.closed_at,
      };

      return { success: true, trip: closed, reconciliation };

    } catch (e: any) {
      this.logger.error('closeTrip failed:', e?.message || e);
      return { success: false, message: 'closeTrip failed' };
    }
  }

  private async calculateTenantFees(tenantId: string, fareCents: number): Promise<{
    platformFeeCents: number;
    tenantNetCents: number;
    driverPayoutCents: number;
  }> {
    const supabase = this.supabaseService.getClient();

    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('revenue_share_bps, per_ride_fee_cents, min_platform_fee_cents')
      .eq('tenant_id', tenantId)
      .single();

    const revenueShareBps = onboarding?.revenue_share_bps ?? 500;
    const perRideFeeCents = onboarding?.per_ride_fee_cents ?? 100;
    const minPlatformFeeCents = onboarding?.min_platform_fee_cents ?? 250;

    const calculatedFee = Math.floor(fareCents * revenueShareBps / 10000) + perRideFeeCents;
    const platformFeeCents = Math.max(calculatedFee, minPlatformFeeCents);
    const tenantNetCents = fareCents - platformFeeCents;
    const driverPayoutCents = tenantNetCents;

    return { platformFeeCents, tenantNetCents, driverPayoutCents };
  }

  private calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateEstimatedFareCents(distanceMiles: number): number {
    const distanceCharge = Math.round(distanceMiles * PER_MILE_CENTS);
    return BASE_FARE_CENTS + distanceCharge;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
