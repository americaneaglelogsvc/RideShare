const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rideshare-gateway-73967865619.us-central1.run.app';

export interface QuoteRequest {
  category: string;
  service: string;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoff: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface QuoteResponse {
  total_cents: number;
  line_items: Array<{
    name: string;
    amount_cents: number;
    description?: string;
  }>;
  surge_multiplier: number;
  surge_cap: number;
  eta_minutes: number;
  quote_id: string;
}

export interface BookingRequest {
  quote_id: string;
  rider_name: string;
  rider_phone: string;
  pickup_time?: string;
  special_instructions?: string;
  vehicle_type?: string;
}

export interface BookingResponse {
  success: boolean;
  booking_id: string;
  driver_eta_minutes: number;
  driver_info?: {
    name: string;
    phone: string;
    vehicle: string;
    license_plate: string;
  };
}

export interface PassengerRequirements {
  passenger_count: number;
  immediacy: 'immediate' | 'scheduled';
  scheduled_time?: string;
  luggage_size: 'none' | 'small' | 'medium' | 'large' | 'extra_large';
  unaccompanied_minors: boolean;
  minors_ages?: number[];
  special_assistance: boolean;
  assistance_type?: 'wheelchair' | 'mobility' | 'visual' | 'hearing' | 'medical' | 'other';
  assistance_details?: string;
  ride_preference: 'economy' | 'standard' | 'premium' | 'luxury';
}

export interface BookingFlowRequest {
  requirements: PassengerRequirements;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoff: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface VehicleRecommendation {
  vehicle_type: string;
  display_name: string;
  match_score: number;
  match_reasons: string[];
  estimated_fare_cents: number;
  capacity: number;
  luggage_capacity: string;
  features: string[];
}

export interface BookingFlowResponse {
  passenger_requirements: PassengerRequirements;
  vehicle_recommendations: VehicleRecommendation[];
  estimated_duration_minutes: number;
  estimated_distance_miles: number;
  nextSteps: string[];
}

class RiderApiService {
  private tenantId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.tenantId = localStorage.getItem('tenant_id');
    }
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant_id', tenantId);
    }
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
    return this.request<QuoteResponse>('/pricing/quote', {
      method: 'POST',
      body: JSON.stringify(quoteRequest),
    });
  }

  async bookRide(bookingRequest: BookingRequest): Promise<BookingResponse> {
    return this.request<BookingResponse>('/reservations/book', {
      method: 'POST',
      body: JSON.stringify(bookingRequest),
    });
  }

  async getBookingStatus(bookingId: string) {
    return this.request(`/reservations/${bookingId}/status`);
  }

  async cancelBooking(bookingId: string) {
    return this.request(`/reservations/${bookingId}/cancel`, {
      method: 'POST',
    });
  }

  async processPassengerRequirements(request: BookingFlowRequest): Promise<BookingFlowResponse> {
    try {
      return this.request<BookingFlowResponse>('/booking-flow/process-requirements', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.warn('Booking flow API failed, using mock data:', error);

      const mockVehicles: VehicleRecommendation[] = [
        {
          vehicle_type: 'economy_sedan',
          display_name: 'Economy Sedan',
          match_score: 85,
          match_reasons: ['Accommodates 1 passengers', 'Adequate medium luggage space', 'Matches standard preference'],
          estimated_fare_cents: 2500,
          capacity: 4,
          luggage_capacity: 'medium',
          features: ['Air Conditioning', 'Music System'],
        },
        {
          vehicle_type: 'standard_suv',
          display_name: 'Standard SUV',
          match_score: 75,
          match_reasons: ['Accommodates 1 passengers', 'Adequate medium luggage space', 'More space available'],
          estimated_fare_cents: 3500,
          capacity: 6,
          luggage_capacity: 'large',
          features: ['Air Conditioning', 'Music System', 'Extra Storage'],
        },
        {
          vehicle_type: 'premium_sedan',
          display_name: 'Premium Sedan',
          match_score: 70,
          match_reasons: ['Accommodates 1 passengers', 'Adequate medium luggage space', 'Extra comfort features'],
          estimated_fare_cents: 4500,
          capacity: 4,
          luggage_capacity: 'medium',
          features: ['Leather Seats', 'Premium Sound', 'Climate Control'],
        },
      ];

      return {
        passenger_requirements: request.requirements,
        vehicle_recommendations: mockVehicles,
        estimated_duration_minutes: 25,
        estimated_distance_miles: 10.2,
        nextSteps: [
          'Select a vehicle from the recommended options',
          'Confirm pickup and dropoff locations',
          'Review fare estimate and trip details',
          'Enter payment information',
          'Confirm booking',
        ],
      };
    }
  }
}

export const riderApiService = new RiderApiService();
export default riderApiService;