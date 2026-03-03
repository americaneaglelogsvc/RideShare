import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

interface QuoteRequest {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  category: string;
  tenantId?: string;
}

interface QuoteResponse {
  estimated_fare_cents: number;
  estimated_duration_minutes: number;
  line_items: Array<{
    name: string;
    amount_cents: number;
    description?: string;
  }>;
}

@Injectable()
export class PricingService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async calculateQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const supabase = this.supabaseService.getClient();

    try {
      // Calculate base distance and time
      const distance = this.calculateDistance(
        request.pickup.lat,
        request.pickup.lng,
        request.dropoff.lat,
        request.dropoff.lng
      );
      
      const estimatedDuration = Math.ceil(distance * 2.5); // 2.5 minutes per mile average
      
      // G17: Get tenant-scoped surge multiplier from database
      const surgeMultiplier = await this.getCurrentSurgeMultiplier(
        request.pickup.lat,
        request.pickup.lng,
        request.tenantId
      );

      // Base pricing structure
      const baseFare = this.getBaseFare(request.category);
      const distanceFare = distance * this.getDistanceRate(request.category);
      const timeFare = estimatedDuration * this.getTimeRate(request.category);
      
      // Airport fee if applicable
      const airportFee = this.calculateAirportFee(request.pickup, request.dropoff);
      
      // Calculate surge pricing
      const surgeCap = 2.0; // Maximum 2x surge
      const effectiveSurge = Math.min(surgeMultiplier, surgeCap);
      
      const subtotal = (baseFare + distanceFare + timeFare + airportFee) * effectiveSurge;
      
      // Line items for transparency
      const lineItems = [
        {
          name: 'Base Fare',
          amount_cents: Math.round(baseFare * 100)
        },
        {
          name: 'Distance',
          amount_cents: Math.round(distanceFare * 100),
          description: `${distance.toFixed(1)} miles`
        },
        {
          name: 'Time',
          amount_cents: Math.round(timeFare * 100),
          description: `${estimatedDuration} minutes`
        }
      ];

      if (airportFee > 0) {
        lineItems.push({
          name: 'Airport Fee',
          amount_cents: Math.round(airportFee * 100)
        });
      }
      
      if (effectiveSurge > 1.0) {
        lineItems.push({
          name: 'Surge Pricing',
          amount_cents: Math.round((subtotal - (baseFare + distanceFare + timeFare + airportFee)) * 100),
          description: `${effectiveSurge.toFixed(1)}x multiplier`
        });
      }

      return {
        estimated_fare_cents: Math.round(subtotal * 100),
        estimated_duration_minutes: estimatedDuration,
        line_items: lineItems
      };

    } catch (error) {
      console.error('Error calculating quote:', error);
      throw new Error('Failed to calculate quote');
    }
  }

  private async getCurrentSurgeMultiplier(lat: number, lng: number, tenantId?: string): Promise<number> {
    const supabase = this.supabaseService.getClient();

    try {
      // G17: Tenant-scoped demand query — only count trips for this tenant
      let query = supabase
        .from('trips')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: recentTrips, error } = await query;

      if (error || !recentTrips) {
        return 1.0; // Default no surge
      }

      // Simple surge calculation based on recent demand
      const demandCount = recentTrips.length;
      
      if (demandCount > 20) return 1.8;
      if (demandCount > 15) return 1.5;
      if (demandCount > 10) return 1.3;
      if (demandCount > 5) return 1.2;
      
      return 1.0;

    } catch (error) {
      console.error('Error calculating surge:', error);
      return 1.0;
    }
  }

  private calculateAirportFee(pickup: any, dropoff: any): number {
    const airports = [
      { name: 'ORD', lat: 41.9786, lng: -87.9048, fee: 5.00 },
      { name: 'MDW', lat: 41.7868, lng: -87.7524, fee: 3.00 }
    ];

    for (const airport of airports) {
      const pickupDistance = this.calculateDistance(pickup.lat, pickup.lng, airport.lat, airport.lng);
      const dropoffDistance = this.calculateDistance(dropoff.lat, dropoff.lng, airport.lat, airport.lng);
      
      // If pickup or dropoff is within 2 miles of airport
      if (pickupDistance <= 2 || dropoffDistance <= 2) {
        return airport.fee;
      }
    }

    return 0;
  }

  private getBaseFare(category: string): number {
    switch (category) {
      case 'economy': return 2.50;
      case 'premium': return 4.00;
      case 'luxury': return 6.00;
      default: return 2.50;
    }
  }

  private getDistanceRate(category: string): number {
    switch (category) {
      case 'economy': return 1.25;
      case 'premium': return 1.75;
      case 'luxury': return 2.50;
      default: return 1.25;
    }
  }

  private getTimeRate(category: string): number {
    switch (category) {
      case 'economy': return 0.25;
      case 'premium': return 0.35;
      case 'luxury': return 0.50;
      default: return 0.25;
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}