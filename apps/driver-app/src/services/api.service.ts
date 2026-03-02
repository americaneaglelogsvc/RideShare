const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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

class ApiService {
  private token: string | null = null;
  private tenantId: string | null = null;

  constructor() {
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('driver_token');
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

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

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

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/driver/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.token) {
      this.token = response.token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('driver_token', response.token);
      }
    }

    return response;
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
  }): Promise<ApiResponse> {
    return this.request('/driver/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  logout(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('driver_token');
    }
  }

  // Profile
  async getProfile(): Promise<DriverProfile> {
    return this.request<DriverProfile>('/driver/profile');
  }

  async updateProfile(profileData: Partial<DriverProfile>): Promise<ApiResponse<DriverProfile>> {
    return this.request('/driver/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Status and Location
  async updateStatus(status: string, location?: { lat: number; lng: number; heading?: number; speed?: number }): Promise<ApiResponse> {
    return this.request('/driver/status', {
      method: 'PUT',
      body: JSON.stringify({ status, location }),
    });
  }

  async updateLocation(location: { lat: number; lng: number; heading?: number; speed?: number }): Promise<ApiResponse> {
    return this.request('/driver/location', {
      method: 'POST',
      body: JSON.stringify(location),
    });
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return this.request<DashboardData>('/driver/dashboard');
  }

  // Ride Offers
  async getCurrentOffer(): Promise<RideOffer | null> {
    return this.request<RideOffer | null>('/driver/offers/current');
  }

  async respondToOffer(offerId: string, accepted: boolean, reason?: string): Promise<ApiResponse> {
    return this.request(`/driver/offers/${offerId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ offerId, accepted, reason }),
    });
  }

  // Earnings
  async getEarnings(period: string = 'week'): Promise<EarningsData> {
    return this.request<EarningsData>(`/driver/earnings?period=${period}`);
  }

  // Trip History
  async getTripHistory(limit: number = 20, offset: number = 0): Promise<TripHistory[]> {
    return this.request<TripHistory[]>(`/driver/trips/history?limit=${limit}&offset=${offset}`);
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiService = new ApiService();
export default apiService;