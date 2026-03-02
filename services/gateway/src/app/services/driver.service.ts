import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import {
  DriverAuthDto,
  DriverRegistrationDto,
  DriverProfileDto,
  DriverStatusUpdateDto,
  LocationUpdateDto,
  RideOfferDto,
  RideOfferResponseDto,
  EarningsDto,
  TripHistoryDto,
  DriverStatus,
} from '../dto/driver.dto';
import { SupabaseService } from './supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DriverService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async login(tenantId: string, loginDto: DriverAuthDto) {
    const supabase = this.supabaseService.getClient();

    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginDto.email,
        password: loginDto.password,
      });

      if (authError || !authData.user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Get driver profile from database
      const { data: driver, error: profileError } = await supabase
        .from('drivers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', authData.user.id)
        .single();

      if (profileError || !driver) {
        throw new NotFoundException('Driver profile not found');
      }

      return {
        success: true,
        token: authData.session?.access_token,
        driver: {
          id: driver.id,
          firstName: driver.first_name,
          lastName: driver.last_name,
          email: driver.email,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Login failed');
    }
  }

  async register(tenantId: string, registrationDto: DriverRegistrationDto) {
    const supabase = this.supabaseService.getClient();

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registrationDto.email,
        password: registrationDto.password,
      });

      if (authError || !authData.user) {
        throw new BadRequestException('Registration failed: ' + authError?.message);
      }

      // Create driver profile in database
      const { data: driver, error: profileError } = await supabase
        .from('drivers')
        .insert({
          tenant_id: tenantId,
          id: authData.user.id,
          first_name: registrationDto.firstName,
          last_name: registrationDto.lastName,
          email: registrationDto.email,
          phone: registrationDto.phone,
          address: registrationDto.address,
          rating: 0,
          total_trips: 0,
          status: DriverStatus.OFFLINE,
          is_active: false, // Requires onboarding completion
        })
        .select()
        .single();

      if (profileError) {
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new BadRequestException('Failed to create driver profile');
      }

      return {
        success: true,
        driverId: driver.id,
        message: 'Registration successful. Please complete onboarding.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async getProfile(tenantId: string, driverId: string): Promise<DriverProfileDto> {
    const supabase = this.supabaseService.getClient();

    try {
      // Get driver profile with vehicle information
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select(`
          *,
          vehicles (*)
        `)
        .eq('tenant_id', tenantId)
        .eq('id', driverId)
        .single();

      if (driverError || !driver) {
        throw new NotFoundException('Driver not found');
      }

      // Get current location
      const { data: location } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('driver_id', driverId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      return {
        id: driver.id,
        firstName: driver.first_name,
        lastName: driver.last_name,
        email: driver.email,
        phone: driver.phone,
        address: driver.address,
        rating: driver.rating,
        totalTrips: driver.total_trips,
        status: driver.status,
        isActive: driver.is_active,
        currentLocation: location ? {
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed,
        } : undefined,
        vehicle: driver.vehicles?.[0] ? {
          id: driver.vehicles[0].id,
          make: driver.vehicles[0].make,
          model: driver.vehicles[0].model,
          year: driver.vehicles[0].year,
          color: driver.vehicles[0].color,
          licensePlate: driver.vehicles[0].license_plate,
          category: driver.vehicles[0].category,
          photoUrls: driver.vehicles[0].photo_urls,
        } : undefined,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get driver profile');
    }
  }

  async updateProfile(tenantId: string, driverId: string, profileData: Partial<DriverProfileDto>) {
    const supabase = this.supabaseService.getClient();

    try {
      const updateData: any = {};
      
      if (profileData.firstName) updateData.first_name = profileData.firstName;
      if (profileData.lastName) updateData.last_name = profileData.lastName;
      if (profileData.phone) updateData.phone = profileData.phone;
      if (profileData.address) updateData.address = profileData.address;

      const { data: driver, error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('tenant_id', tenantId)
        .eq('id', driverId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to update profile');
      }

      return {
        success: true,
        driver: await this.getProfile(tenantId, driverId),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Profile update failed');
    }
  }

  async updateStatus(tenantId: string, driverId: string, statusUpdate: DriverStatusUpdateDto) {
    const supabase = this.supabaseService.getClient();

    try {
      // Update driver status
      const { error: statusError } = await supabase
        .from('drivers')
        .update({ status: statusUpdate.status })
        .eq('tenant_id', tenantId)
        .eq('id', driverId);

      if (statusError) {
        throw new BadRequestException('Failed to update status');
      }

      // Update location if provided
      if (statusUpdate.location) {
        await this.updateLocation(tenantId, driverId, statusUpdate.location);
      }

      // If going online, potentially send ride offers
      if (statusUpdate.status === DriverStatus.ONLINE) {
        this.simulateRideOffer(tenantId, driverId);
      }

      return {
        success: true,
        status: statusUpdate.status,
        message: `Driver status updated to ${statusUpdate.status}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Status update failed');
    }
  }

  async updateLocation(tenantId: string, driverId: string, location: LocationUpdateDto) {
    const supabase = this.supabaseService.getClient();

    try {
      // Insert new location record
      const { error } = await supabase
        .from('driver_locations')
        .insert({
          tenant_id: tenantId,
          driver_id: driverId,
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed,
        });

      if (error) {
        throw new BadRequestException('Failed to update location');
      }

      return {
        success: true,
        message: 'Location updated successfully',
      };
    } catch (error) {
      throw new BadRequestException('Location update failed');
    }
  }

  async getCurrentOffer(tenantId: string, driverId: string): Promise<RideOfferDto | null> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: offer, error } = await supabase
        .from('ride_offers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !offer) {
        return null;
      }

      return {
        offerId: offer.id,
        tripId: offer.trip_id,
        riderId: 'rider_123', // This would come from the trips table in a full implementation
        riderName: offer.rider_name,
        riderPhone: offer.rider_phone,
        pickup: {
          address: offer.pickup_address,
          lat: offer.pickup_lat,
          lng: offer.pickup_lng,
        },
        dropoff: {
          address: offer.dropoff_address,
          lat: offer.dropoff_lat,
          lng: offer.dropoff_lng,
        },
        estimatedFare: offer.estimated_fare_cents,
        netPayout: offer.net_payout_cents,
        estimatedDistance: offer.estimated_distance_miles,
        estimatedDuration: offer.estimated_duration_minutes,
        pickupEta: offer.pickup_eta_minutes,
        category: offer.category,
        specialInstructions: offer.special_instructions,
        expiresAt: offer.expires_at,
      };
    } catch (error) {
      return null;
    }
  }

  async respondToOffer(tenantId: string, driverId: string, offerId: string, response: RideOfferResponseDto) {
    const supabase = this.supabaseService.getClient();

    try {
      // Get the offer
      const { data: offer, error: offerError } = await supabase
        .from('ride_offers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', offerId)
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .single();

      if (offerError || !offer) {
        throw new NotFoundException('Offer not found or expired');
      }

      // Update offer status
      const newStatus = response.accepted ? 'accepted' : 'declined';
      const { error: updateError } = await supabase
        .from('ride_offers')
        .update({ status: newStatus })
        .eq('tenant_id', tenantId)
        .eq('id', offerId);

      if (updateError) {
        throw new BadRequestException('Failed to update offer status');
      }

      if (response.accepted) {
        // Update driver status to busy
        await supabase
          .from('drivers')
          .update({ status: DriverStatus.EN_ROUTE_PICKUP })
          .eq('tenant_id', tenantId)
          .eq('id', driverId);

        return {
          success: true,
          message: 'Offer accepted. Navigate to pickup location.',
          tripId: offer.trip_id,
        };
      } else {
        return {
          success: true,
          message: 'Offer declined.',
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to respond to offer');
    }
  }

  async getEarnings(tenantId: string, driverId: string, period: string): Promise<EarningsDto> {
    const supabase = this.supabaseService.getClient();

    try {
      let startDate: Date;
      const now = new Date();

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const { data: trips, error } = await supabase
        .from('trips')
        .select('fare_cents, net_payout_cents, commission_cents, duration_minutes')
        .eq('tenant_id', tenantId)
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString());

      if (error) {
        throw new BadRequestException('Failed to get earnings data');
      }

      const totalTrips = trips?.length || 0;
      const grossEarnings = trips?.reduce((sum, trip) => sum + trip.fare_cents, 0) || 0;
      const netEarnings = trips?.reduce((sum, trip) => sum + trip.net_payout_cents, 0) || 0;
      const commission = trips?.reduce((sum, trip) => sum + trip.commission_cents, 0) || 0;
      const totalMinutes = trips?.reduce((sum, trip) => sum + trip.duration_minutes, 0) || 0;
      const onlineHours = totalMinutes / 60;

      return {
        period,
        grossEarnings,
        netEarnings,
        totalTrips,
        onlineHours,
        commission,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get earnings');
    }
  }

  async getTripHistory(tenantId: string, driverId: string, limit: number, offset: number): Promise<TripHistoryDto[]> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new BadRequestException('Failed to get trip history');
      }

      return trips?.map(trip => ({
        tripId: trip.id,
        date: new Date(trip.completed_at).toISOString().split('T')[0],
        time: new Date(trip.completed_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        pickup: trip.pickup_address,
        dropoff: trip.dropoff_address,
        distance: trip.distance_miles,
        duration: trip.duration_minutes,
        fare: trip.fare_cents,
        netEarnings: trip.net_payout_cents,
        rating: trip.rating || 5,
        riderName: 'Anonymous Rider', // In a full implementation, this would come from a riders table
      })) || [];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get trip history');
    }
  }

  async getDashboard(tenantId: string, driverId: string) {
    const supabase = this.supabaseService.getClient();

    try {
      // Get driver info
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', driverId)
        .single();

      if (driverError || !driver) {
        throw new NotFoundException('Driver not found');
      }

      // Get today's earnings
      const todayEarnings = await this.getEarnings(tenantId, driverId, 'today');

      // Get current offer
      const currentOffer = await this.getCurrentOffer(tenantId, driverId);

      return {
        driver: {
          name: `${driver.first_name} ${driver.last_name}`,
          status: driver.status,
          rating: driver.rating,
          totalTrips: driver.total_trips,
        },
        todayStats: {
          earnings: todayEarnings.netEarnings,
          trips: todayEarnings.totalTrips,
          onlineHours: todayEarnings.onlineHours,
        },
        currentOffer,
        hasActiveTrip: driver.status === DriverStatus.BUSY || 
                       driver.status === DriverStatus.EN_ROUTE_PICKUP ||
                       driver.status === DriverStatus.AT_PICKUP ||
                       driver.status === DriverStatus.EN_ROUTE_DROPOFF,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get dashboard data');
    }
  }

  private async simulateRideOffer(tenantId: string, driverId: string) {
    const supabase = this.supabaseService.getClient();

    // Simulate receiving a ride offer after going online
    setTimeout(async () => {
      try {
        // Create a mock trip first
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .insert({
            tenant_id: tenantId,
            driver_id: driverId,
            pickup_address: '123 N Michigan Ave, Chicago, IL',
            dropoff_address: "O'Hare International Airport, Terminal 1",
            pickup_lat: 41.8781,
            pickup_lng: -87.6298,
            dropoff_lat: 41.9786,
            dropoff_lng: -87.9048,
            distance_miles: 18.5,
            duration_minutes: 35,
            fare_cents: 4500,
            net_payout_cents: 3600,
            commission_cents: 900,
            status: 'requested',
            special_instructions: 'Flight departure at 3:30 PM - AA123',
          })
          .select()
          .single();

        if (tripError || !trip) {
          console.error('Failed to create mock trip:', tripError);
          return;
        }

        // Create ride offer
        const expiresAt = new Date(Date.now() + 15000); // 15 seconds
        const { error: offerError } = await supabase
          .from('ride_offers')
          .insert({
            tenant_id: tenantId,
            driver_id: driverId,
            trip_id: trip.id,
            rider_name: 'Sarah Johnson',
            rider_phone: '+1-312-555-0456',
            pickup_address: trip.pickup_address,
            dropoff_address: trip.dropoff_address,
            pickup_lat: trip.pickup_lat,
            pickup_lng: trip.pickup_lng,
            dropoff_lat: trip.dropoff_lat,
            dropoff_lng: trip.dropoff_lng,
            estimated_fare_cents: trip.fare_cents,
            net_payout_cents: trip.net_payout_cents,
            estimated_distance_miles: trip.distance_miles,
            estimated_duration_minutes: trip.duration_minutes,
            pickup_eta_minutes: 8,
            category: 'black_sedan',
            special_instructions: trip.special_instructions,
            expires_at: expiresAt.toISOString(),
          });

        if (offerError) {
          console.error('Failed to create ride offer:', offerError);
        }

        // Auto-expire the offer after 15 seconds
        setTimeout(async () => {
          await supabase
            .from('ride_offers')
            .update({ status: 'expired' })
            .eq('tenant_id', tenantId)
            .eq('trip_id', trip.id)
            .eq('status', 'pending');
        }, 15000);
      } catch (error) {
        console.error('Error simulating ride offer:', error);
      }
    }, 3000); // Send offer 3 seconds after going online
  }
}