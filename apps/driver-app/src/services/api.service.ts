const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:9000';
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Types ──

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  rating: number;
  totalTrips: number;
  status: string;
  isActive: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
    category: string;
    photoUrls?: string[];
  };
}

export interface RideOffer {
  offerId: string;
  tripId: string;
  riderId: string;
  riderName: string;
  riderPhone?: string;
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
  estimatedFare: number;
  netPayout: number;
  estimatedDistance: number;
  estimatedDuration: number;
  pickupEta: number;
  category: string;
  specialInstructions?: string;
  expiresAt: string;
}

export interface DashboardData {
  driver: {
    name: string;
    status: string;
    rating: number;
    totalTrips: number;
  };
  todayStats: {
    earnings: number;
    trips: number;
    onlineHours: number;
  };
  currentOffer?: RideOffer;
  hasActiveTrip: boolean;
}

export interface EarningsData {
  period: string;
  grossEarnings: number;
  netEarnings: number;
  totalTrips: number;
  onlineHours: number;
  commission: number;
}

export interface TripHistory {
  tripId: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  distance: number;
  duration: number;
  fare: number;
  netEarnings: number;
  rating: number;
  riderName: string;
}

// ── Service ──

class ApiService {
  private supabase: SupabaseClient;
  private tenantId: string | null = null;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'driver-app-auth',
      },
    });

    if (typeof window !== 'undefined') {
      this.tenantId = localStorage.getItem('tenant_id');
    }
  }

  // ── Supabase Auth ──

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant_id', tenantId);
    }
  }

  getTenantId(): string | null {
    return this.tenantId;
  }


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
      const msg = errorBody?.message || `HTTP ${response.status}`;
      throw new Error(msg);
    }

    return response.json();
  }

  // ── Authentication (Supabase-backed) ──

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const session = data.session!;
    const user = data.user!;

    // Fetch driver profile from gateway to get driver-specific info
    let driverProfile: any = {};
    try {
      driverProfile = await this.request('/driver/profile');
    } catch {
      // Profile endpoint may not exist yet — use user metadata
    }

    return {
      success: true,
      token: session.access_token,
      driver: {
        id: driverProfile?.id || user.id,
        firstName: driverProfile?.firstName || user.user_metadata?.first_name || 'Driver',
        lastName: driverProfile?.lastName || user.user_metadata?.last_name || '',
        email: user.email || credentials.email,
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
  }): Promise<ApiResponse> {
    const { error } = await this.supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          role: 'driver',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Registration successful. Check your email for verification.' };
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    return !!data.session;
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  // ── Profile ──

  async getProfile(): Promise<DriverProfile> {
    // Try the gateway endpoint first
    try {
      return await this.request<DriverProfile>('/driver/profile');
    } catch {
      // Fallback: build profile from Supabase + driver_profiles table
      const { data: session } = await this.supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const userId = session.session.user.id;
      const { data: profile } = await this.supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        // Try matching by email
        const { data: profileByEmail } = await this.supabase
          .from('driver_profiles')
          .select('*')
          .eq('email', session.session.user.email)
          .single();

        if (!profileByEmail) throw new Error('Driver profile not found');
        return this.mapProfile(profileByEmail);
      }

      return this.mapProfile(profile);
    }
  }

  private mapProfile(p: any): DriverProfile {
    return {
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      phone: p.phone || '',
      address: p.address,
      rating: p.rating || 5.0,
      totalTrips: p.total_trips || 0,
      status: p.status || 'offline',
      isActive: p.is_active ?? false,
    };
  }

  async updateProfile(profileData: Partial<DriverProfile>): Promise<ApiResponse<DriverProfile>> {
    return this.request('/driver/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // ── Status and Location ──

  async updateStatus(status: string, location?: { lat: number; lng: number; heading?: number; speed?: number }): Promise<ApiResponse> {
    try {
      return await this.request('/driver/status', {
        method: 'PUT',
        body: JSON.stringify({ status, location }),
      });
    } catch {
      // Fallback: update driver_profiles directly
      const { data: session } = await this.supabase.auth.getSession();
      if (!session.session) return { success: false, error: 'Not authenticated' };

      const { error } = await this.supabase
        .from('driver_profiles')
        .update({ status, is_active: status === 'online' })
        .eq('email', session.session.user.email);

      return error
        ? { success: false, error: error.message }
        : { success: true, message: `Status updated to ${status}` };
    }
  }

  async updateLocation(location: { lat: number; lng: number; heading?: number; speed?: number }): Promise<ApiResponse> {
    try {
      return await this.request('/driver/location', {
        method: 'POST',
        body: JSON.stringify(location),
      });
    } catch {
      // Fallback: update driver_locations directly
      const { data: session } = await this.supabase.auth.getSession();
      if (!session.session) return { success: false, error: 'Not authenticated' };

      const { data: profile } = await this.supabase
        .from('driver_profiles')
        .select('id')
        .eq('email', session.session.user.email)
        .single();

      if (!profile) return { success: false, error: 'Profile not found' };

      const { error } = await this.supabase
        .from('driver_locations')
        .upsert({
          driver_id: profile.id,
          lat: location.lat,
          lng: location.lng,
          heading: location.heading || 0,
          speed: location.speed || 0,
          updated_at: new Date().toISOString(),
        });

      return error
        ? { success: false, error: error.message }
        : { success: true, message: 'Location updated' };
    }
  }

  // ── Dashboard ──

  async getDashboard(): Promise<DashboardData> {
    try {
      return await this.request<DashboardData>('/driver/dashboard');
    } catch {
      // Build dashboard from profile data
      const profile = await this.getProfile();
      return {
        driver: {
          name: `${profile.firstName} ${profile.lastName}`,
          status: profile.status,
          rating: profile.rating,
          totalTrips: profile.totalTrips,
        },
        todayStats: {
          earnings: 0,
          trips: 0,
          onlineHours: 0,
        },
        hasActiveTrip: false,
      };
    }
  }

  // ── Trip Lifecycle (Wire to real dispatch endpoints) ──

  async acceptTrip(tripId: string, driverId: string): Promise<ApiResponse> {
    return this.request('/dispatch/accept-trip', {
      method: 'PUT',
      body: JSON.stringify({ trip_id: tripId, driver_id: driverId }),
    });
  }

  async startTrip(tripId: string): Promise<ApiResponse> {
    return this.request('/dispatch/start-trip', {
      method: 'PUT',
      body: JSON.stringify({ trip_id: tripId }),
    });
  }

  async completeTrip(tripId: string): Promise<ApiResponse> {
    return this.request('/dispatch/complete-trip', {
      method: 'PUT',
      body: JSON.stringify({ trip_id: tripId }),
    });
  }

  async cancelTrip(tripId: string, reason?: string): Promise<ApiResponse> {
    return this.request('/dispatch/cancel-trip', {
      method: 'PUT',
      body: JSON.stringify({ trip_id: tripId, cancelled_by: 'driver', reason }),
    });
  }

  // ── Ride Offers ──

  async getCurrentOffer(): Promise<RideOffer | null> {
    return this.request<RideOffer | null>('/driver/offers/current');
  }

  async respondToOffer(offerId: string, accepted: boolean, reason?: string): Promise<ApiResponse> {
    return this.request(`/driver/offers/${offerId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ offerId, accepted, reason }),
    });
  }

  // ── Earnings ──

  async getEarnings(period: string = 'week'): Promise<EarningsData> {
    return this.request<EarningsData>(`/driver/earnings?period=${period}`);
  }

  // ── Trip History ──

  async getTripHistory(limit: number = 20, offset: number = 0): Promise<TripHistory[]> {
    return this.request<TripHistory[]>(`/driver/trips/history?limit=${limit}&offset=${offset}`);
  }
}

export const apiService = new ApiService();
export default apiService;