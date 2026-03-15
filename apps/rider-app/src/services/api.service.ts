import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// ── Types ──

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

export interface Trip {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  fare_cents: number;
  created_at: string;
  completed_at?: string;
  driver_name?: string;
  distance_miles?: number;
}

// ── Service ──

class RiderApiService {
  private supabase: SupabaseClient;
  private tenantId: string | null = null;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'rider-app-auth',
      },
    });

    if (typeof window !== 'undefined') {
      this.tenantId = localStorage.getItem('tenant_id');
    }
  }

  // ── Tenant Management ──

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant_id', tenantId);
    }
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  // ── Auth ──

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  }

  async signup(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { ...metadata, role: 'rider' } },
    });
    if (error) throw new Error(error.message);
    return data;
  }

  async logout() {
    await this.supabase.auth.signOut();
  }

  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    return !!data.session;
  }

  // ── Internal HTTP ──

  private async getToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ── Booking Flow ──

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
    return this.request<BookingFlowResponse>('/booking-flow/process-requirements', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ── Trip History ──

  async getTrips(limit: number = 20): Promise<Trip[]> {
    try {
      return await this.request<Trip[]>(`/rider/trips?limit=${limit}`);
    } catch {
      // Fallback: query trips directly from Supabase
      const { data: session } = await this.supabase.auth.getSession();
      if (!session.session) return [];

      const { data: rider } = await this.supabase
        .from('riders')
        .select('id')
        .eq('email', session.session.user.email)
        .single();

      if (!rider) return [];

      const { data: trips } = await this.supabase
        .from('trips')
        .select('*')
        .eq('rider_id', rider.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (trips || []).map((t: any) => ({
        id: t.id,
        status: t.status,
        pickup_address: t.pickup_address,
        dropoff_address: t.dropoff_address,
        fare_cents: t.fare_cents,
        created_at: t.created_at,
        completed_at: t.completed_at,
        distance_miles: t.distance_miles,
      }));
    }
  }

  // ── Real-time Trip Status ──

  subscribeToTrip(tripId: string, callback: (trip: any) => void) {
    return this.supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  }
}

export const riderApiService = new RiderApiService();
export default riderApiService;