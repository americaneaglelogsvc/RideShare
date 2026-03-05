const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
}

export const riderApiService = new RiderApiService();
export default riderApiService;