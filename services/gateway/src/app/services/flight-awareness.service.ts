import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { firstValueFrom } from 'rxjs';

// §19: Flight Awareness — track flight status for airport pickups
// Adjusts scheduled ride dispatch time based on actual arrival

export interface FlightInfo {
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  scheduledArrival: string;
  estimatedArrival: string | null;
  actualArrival: string | null;
  status: 'scheduled' | 'en_route' | 'landed' | 'arrived' | 'cancelled' | 'diverted' | 'unknown';
  gate: string | null;
  terminal: string | null;
  baggageClaim: string | null;
  delayMinutes: number;
}

@Injectable()
export class FlightAwarenessService {
  private readonly logger = new Logger(FlightAwarenessService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async trackFlight(flightNumber: string, date: string): Promise<FlightInfo> {
    const apiKey = this.configService.get<string>('FLIGHT_API_KEY');

    if (apiKey) {
      try {
        return await this.fetchFromApi(flightNumber, date, apiKey);
      } catch (e: any) {
        this.logger.warn(`Flight API failed for ${flightNumber}: ${e.message}, using fallback`);
      }
    }

    // Fallback: check local cache
    return this.getFromCache(flightNumber, date);
  }

  private async fetchFromApi(flightNumber: string, date: string, apiKey: string): Promise<FlightInfo> {
    // AviationStack or FlightAware compatible endpoint
    const baseUrl = this.configService.get<string>('FLIGHT_API_URL') || 'https://api.aviationstack.com/v1/flights';

    const response = await firstValueFrom(
      this.httpService.get(baseUrl, {
        params: { access_key: apiKey, flight_iata: flightNumber, flight_date: date },
        timeout: 5000,
      }),
    );

    const flight = response.data?.data?.[0];
    if (!flight) {
      return this.unknownFlight(flightNumber);
    }

    const info: FlightInfo = {
      flightNumber,
      airline: flight.airline?.name || 'Unknown',
      departureAirport: flight.departure?.iata || '',
      arrivalAirport: flight.arrival?.iata || '',
      scheduledArrival: flight.arrival?.scheduled || '',
      estimatedArrival: flight.arrival?.estimated || null,
      actualArrival: flight.arrival?.actual || null,
      status: this.mapStatus(flight.flight_status),
      gate: flight.arrival?.gate || null,
      terminal: flight.arrival?.terminal || null,
      baggageClaim: flight.arrival?.baggage || null,
      delayMinutes: flight.arrival?.delay || 0,
    };

    // Cache it
    await this.cacheFlightInfo(info, date);
    return info;
  }

  private async getFromCache(flightNumber: string, date: string): Promise<FlightInfo> {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('flight_cache')
      .select('*')
      .eq('flight_number', flightNumber.toUpperCase())
      .eq('flight_date', date)
      .maybeSingle();

    if (data) {
      return data.info as FlightInfo;
    }

    return this.unknownFlight(flightNumber);
  }

  private async cacheFlightInfo(info: FlightInfo, date: string) {
    try {
      const supabase = this.supabaseService.getClient();

      await supabase.from('flight_cache').upsert({
        flight_number: info.flightNumber.toUpperCase(),
        flight_date: date,
        info,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'flight_number,flight_date' });
    } catch (e: any) {
      this.logger.debug(`Flight cache write failed: ${e.message}`);
    }
  }

  async linkFlightToRide(rideId: string, flightNumber: string, date: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('ride_flight_links')
      .upsert({
        ride_id: rideId,
        flight_number: flightNumber.toUpperCase(),
        flight_date: date,
      }, { onConflict: 'ride_id' })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Flight ${flightNumber} linked to ride ${rideId}`);
    return data;
  }

  async getAdjustedPickupTime(rideId: string): Promise<{ adjustedTime: string | null; delayMinutes: number; flightStatus: string }> {
    const supabase = this.supabaseService.getClient();

    const { data: link } = await supabase
      .from('ride_flight_links')
      .select('flight_number, flight_date')
      .eq('ride_id', rideId)
      .maybeSingle();

    if (!link) return { adjustedTime: null, delayMinutes: 0, flightStatus: 'no_flight_linked' };

    const flight = await this.trackFlight(link.flight_number, link.flight_date);

    const arrival = flight.estimatedArrival || flight.scheduledArrival;
    // Add 20 min buffer for deplaning + baggage
    const adjustedMs = new Date(arrival).getTime() + 20 * 60_000;

    return {
      adjustedTime: new Date(adjustedMs).toISOString(),
      delayMinutes: flight.delayMinutes,
      flightStatus: flight.status,
    };
  }

  private mapStatus(status: string): FlightInfo['status'] {
    const map: Record<string, FlightInfo['status']> = {
      scheduled: 'scheduled',
      active: 'en_route',
      landed: 'landed',
      arrived: 'arrived',
      cancelled: 'cancelled',
      diverted: 'diverted',
    };
    return map[status] || 'unknown';
  }

  private unknownFlight(flightNumber: string): FlightInfo {
    return {
      flightNumber,
      airline: 'Unknown',
      departureAirport: '',
      arrivalAirport: '',
      scheduledArrival: '',
      estimatedArrival: null,
      actualArrival: null,
      status: 'unknown',
      gate: null,
      terminal: null,
      baggageClaim: null,
      delayMinutes: 0,
    };
  }
}
