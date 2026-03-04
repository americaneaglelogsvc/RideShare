import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// §4.1 Booking types: on-demand, scheduled, hourly
// Hourly/chauffeur-by-the-hour bookings with minimum duration and overage billing

export interface HourlyBookingInput {
  tenantId: string;
  riderId: string;
  driverCategory: 'black_sedan' | 'black_suv' | 'black_ev';
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  scheduledStart: string; // ISO datetime
  durationHours: number; // minimum 2
  specialInstructions?: string;
  preferredDriverId?: string;
}

export interface HourlyBooking {
  id: string;
  tenantId: string;
  riderId: string;
  driverId: string | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  durationHours: number;
  hourlyRateCents: number;
  estimatedTotalCents: number;
  actualDurationMinutes: number | null;
  actualTotalCents: number | null;
  overageMinutes: number;
  overageRateCentsPerMin: number;
  scheduledStart: string;
  actualStart: string | null;
  actualEnd: string | null;
}

@Injectable()
export class HourlyBookingService {
  private readonly logger = new Logger(HourlyBookingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async createBooking(input: HourlyBookingInput): Promise<HourlyBooking> {
    if (input.durationHours < 2) {
      throw new BadRequestException('Minimum hourly booking is 2 hours');
    }
    if (input.durationHours > 12) {
      throw new BadRequestException('Maximum hourly booking is 12 hours');
    }

    const supabase = this.supabaseService.getClient();

    // Get hourly rate from tenant config
    const hourlyRateCents = await this.getHourlyRate(input.tenantId, input.driverCategory);
    const overageRateCentsPerMin = Math.ceil(hourlyRateCents / 60 * 1.5); // 1.5x overage
    const estimatedTotalCents = hourlyRateCents * input.durationHours;

    const { data, error } = await supabase
      .from('hourly_bookings')
      .insert({
        tenant_id: input.tenantId,
        rider_id: input.riderId,
        driver_category: input.driverCategory,
        pickup_address: input.pickupAddress,
        pickup_lat: input.pickupLat,
        pickup_lng: input.pickupLng,
        scheduled_start: input.scheduledStart,
        duration_hours: input.durationHours,
        hourly_rate_cents: hourlyRateCents,
        estimated_total_cents: estimatedTotalCents,
        overage_rate_cents_per_min: overageRateCentsPerMin,
        special_instructions: input.specialInstructions || null,
        preferred_driver_id: input.preferredDriverId || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Hourly booking created: ${data.id} — ${input.durationHours}h @ ${hourlyRateCents}c/hr`);
    return this.mapBooking(data);
  }

  async confirmBooking(bookingId: string, driverId: string): Promise<HourlyBooking> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('hourly_bookings')
      .update({ driver_id: driverId, status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Hourly booking ${bookingId} confirmed with driver ${driverId}`);
    return this.mapBooking(data);
  }

  async startBooking(bookingId: string): Promise<HourlyBooking> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('hourly_bookings')
      .update({ status: 'in_progress', actual_start: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('status', 'confirmed')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return this.mapBooking(data);
  }

  async completeBooking(bookingId: string): Promise<HourlyBooking> {
    const supabase = this.supabaseService.getClient();

    // Get current booking
    const { data: booking } = await supabase
      .from('hourly_bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('status', 'in_progress')
      .single();

    if (!booking) throw new BadRequestException('Booking not found or not in progress');

    const actualEnd = new Date();
    const actualStart = new Date(booking.actual_start);
    const actualDurationMinutes = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / 60_000);
    const bookedMinutes = booking.duration_hours * 60;
    const overageMinutes = Math.max(0, actualDurationMinutes - bookedMinutes);

    // Calculate final total: booked hours + overage
    const baseCents = booking.hourly_rate_cents * booking.duration_hours;
    const overageCents = overageMinutes * booking.overage_rate_cents_per_min;
    const actualTotalCents = baseCents + overageCents;

    const { data, error } = await supabase
      .from('hourly_bookings')
      .update({
        status: 'completed',
        actual_end: actualEnd.toISOString(),
        actual_duration_minutes: actualDurationMinutes,
        overage_minutes: overageMinutes,
        actual_total_cents: actualTotalCents,
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(
      `Hourly booking ${bookingId} completed: ${actualDurationMinutes}min, ` +
      `overage=${overageMinutes}min, total=${actualTotalCents}c`
    );
    return this.mapBooking(data);
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<HourlyBooking> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('hourly_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq('id', bookingId)
      .in('status', ['pending', 'confirmed'])
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return this.mapBooking(data);
  }

  async getBooking(bookingId: string): Promise<HourlyBooking> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('hourly_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) throw new BadRequestException(error.message);
    return this.mapBooking(data);
  }

  async listRiderBookings(riderId: string, tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('hourly_bookings')
      .select('*')
      .eq('rider_id', riderId)
      .eq('tenant_id', tenantId)
      .order('scheduled_start', { ascending: false })
      .limit(50);

    if (error) throw new BadRequestException(error.message);
    return (data || []).map(this.mapBooking);
  }

  private async getHourlyRate(tenantId: string, category: string): Promise<number> {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('tenant_pricing_policies')
      .select('policy_data')
      .eq('tenant_id', tenantId)
      .eq('policy_type', 'hourly_rates')
      .eq('is_active', true)
      .maybeSingle();

    if (data?.policy_data?.[category]) {
      return data.policy_data[category];
    }

    // Default rates (cents per hour)
    const defaults: Record<string, number> = {
      black_sedan: 7500,  // $75/hr
      black_suv: 9500,    // $95/hr
      black_ev: 8500,     // $85/hr
    };

    return defaults[category] || 7500;
  }

  private mapBooking(row: any): HourlyBooking {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      riderId: row.rider_id,
      driverId: row.driver_id,
      status: row.status,
      durationHours: row.duration_hours,
      hourlyRateCents: row.hourly_rate_cents,
      estimatedTotalCents: row.estimated_total_cents,
      actualDurationMinutes: row.actual_duration_minutes,
      actualTotalCents: row.actual_total_cents,
      overageMinutes: row.overage_minutes || 0,
      overageRateCentsPerMin: row.overage_rate_cents_per_min,
      scheduledStart: row.scheduled_start,
      actualStart: row.actual_start,
      actualEnd: row.actual_end,
    };
  }
}
