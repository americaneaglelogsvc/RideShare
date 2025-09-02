import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { DispatchService } from './dispatch.service';
import { PricingService } from './pricing.service';

interface BookingRequest {
  quote_id: string;
  rider_name: string;
  rider_phone: string;
  pickup_time: string;
  special_instructions?: string;
}

interface BookingResponse {
  success: boolean;
  booking_id: string;
  driver_eta_minutes: number;
  driver_info?: {
    name: string;
    phone: string;
    vehicle: string;
    license_plate: string;
  };
  message?: string;
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly dispatchService: DispatchService,
    private readonly pricingService: PricingService
  ) {}

  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    const supabase = this.supabaseService.getClient();

    try {
      // Validate quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', request.quote_id)
        .single();

      if (quoteError || !quote) {
        throw new Error('Invalid or expired quote');
      }

      // Create rider record if not exists
      let riderId = await this.getOrCreateRider(request.rider_name, request.rider_phone);

      // Dispatch the ride
      const tripId = await this.dispatchService.dispatchRide({
        riderId,
        riderName: request.rider_name,
        riderPhone: request.rider_phone,
        pickup: quote.pickup_location,
        dropoff: quote.dropoff_location,
        category: quote.category,
        estimatedFare: quote.total_cents,
        specialInstructions: request.special_instructions
      });

      if (!tripId) {
        throw new Error('No drivers available');
      }

      // Create booking record
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          rider_id: riderId,
          trip_id: tripId,
          quote_id: request.quote_id,
          rider_name: request.rider_name,
          rider_phone: request.rider_phone,
          pickup_time: request.pickup_time,
          special_instructions: request.special_instructions,
          status: 'pending'
        })
        .select()
        .single();

      if (bookingError || !booking) {
        throw new Error('Failed to create booking');
      }
      
      return {
        success: true,
        booking_id: booking.id,
        driver_eta_minutes: 0, // Will be updated when driver accepts
        message: 'Booking created successfully. Looking for nearby drivers...'
      };

    } catch (error) {
      console.error('Booking error:', error);
      throw new Error(error.message || 'Booking failed');
    }
  }

  async getBookingStatus(bookingId: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trips (
            *,
            drivers (
              first_name,
              last_name,
              phone,
              vehicles (
                make,
                model,
                year,
                color,
                license_plate
              )
            )
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        throw new Error('Booking not found');
      }

      const trip = booking.trips;
      const driver = trip?.drivers;

      return {
        booking_id: booking.id,
        status: booking.status,
        trip_status: trip?.status,
        driver_info: driver ? {
          name: `${driver.first_name} ${driver.last_name}`,
          phone: driver.phone,
          vehicle: `${driver.vehicles[0]?.year} ${driver.vehicles[0]?.make} ${driver.vehicles[0]?.model}`,
          license_plate: driver.vehicles[0]?.license_plate
        } : null
      };

    } catch (error) {
      console.error('Error getting booking status:', error);
      throw new Error(error.message || 'Failed to get booking status');
    }
  }

  async cancelBooking(bookingId: string) {
    const supabase = this.supabaseService.getClient();

    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (bookingError) {
        throw new Error('Failed to cancel booking');
      }

      // Cancel associated trip and offers
      const { data: booking } = await supabase
        .from('bookings')
        .select('trip_id')
        .eq('id', bookingId)
        .single();

      if (booking?.trip_id) {
        await supabase
          .from('trips')
          .update({ status: 'cancelled' })
          .eq('id', booking.trip_id);

        await supabase
          .from('ride_offers')
          .update({ status: 'cancelled' })
          .eq('trip_id', booking.trip_id);
      }

      return {
        success: true,
        message: 'Booking cancelled successfully'
      };

    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw new Error(error.message || 'Failed to cancel booking');
    }
  }

  private async getOrCreateRider(name: string, phone: string): Promise<string> {
    const supabase = this.supabaseService.getClient();

    try {
      // Check if rider exists
      const { data: existingRider } = await supabase
        .from('riders')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existingRider) {
        return existingRider.id;
      }

      // Create new rider
      const { data: newRider, error } = await supabase
        .from('riders')
        .insert({
          name,
          phone,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error || !newRider) {
        throw new Error('Failed to create rider');
      }

      return newRider.id;

    } catch (error) {
      console.error('Error getting/creating rider:', error);
      throw error;
    }
  }
}