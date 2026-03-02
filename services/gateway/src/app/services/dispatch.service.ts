import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { RealtimeService } from './realtime.service';
import { LedgerService } from './ledger.service';

export enum TripStatus {
  REQUESTED = 'requested',
  ASSIGNED = 'assigned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
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
        console.error('Error finding drivers:', error);
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
      console.error('Error in findAvailableDrivers:', error);
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
        console.warn('PostGIS RPC unavailable, falling back to in-memory search:', error.message);
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
      console.error('Geospatial search error, falling back:', err);
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
        console.log('No available drivers found');
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
        console.error('Error creating trip:', tripError);
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
      console.error('Error dispatching ride:', error);
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
        console.error('Error sending ride offer:', error);
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
      console.error('Error in sendRideOffer:', error);
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

      await this.realtimeService.emitTripStateChanged({
        tripId,
        status: TripStatus.ASSIGNED,
        driverId,
      });

      return { success: true, trip: updatedTrip };

    } catch (e: any) {
      console.error('acceptOffer failed:', e?.message || e);
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

      await this.realtimeService.emitTripStateChanged({
        tripId,
        status: TripStatus.ACTIVE,
        driverId: updatedTrip.driver_id,
      });

      return { success: true, trip: updatedTrip };

    } catch (e: any) {
      console.error('startTrip failed:', e?.message || e);
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
      console.error('completeTrip failed:', e?.message || e);
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
      console.error('Error accepting ride offer:', error);
      return false;
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