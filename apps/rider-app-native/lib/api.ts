import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
const TENANT_KEY = 'tenant_id';

class RiderNativeApiService {
  private tenantId: string | null = null;
  private token: string | null = null;

  async init(): Promise<void> {
    this.tenantId = await SecureStore.getItemAsync(TENANT_KEY);
    this.token = await SecureStore.getItemAsync('auth_token');
  }

  async setTenantId(tenantId: string): Promise<void> {
    this.tenantId = tenantId;
    await SecureStore.setItemAsync(TENANT_KEY, tenantId);
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    await SecureStore.setItemAsync('auth_token', token);
  }

  async clearAuth(): Promise<void> {
    this.token = null;
    await SecureStore.deleteItemAsync('auth_token');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers as Record<string, string> || {}),
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`API ${response.status}: ${body}`);
    }
    return response.json();
  }

  // Health
  async health(): Promise<{ ok: boolean }> {
    return this.request('/health');
  }

  // Pricing
  async getQuote(payload: {
    category: string;
    service: string;
    pickup: { lat: number; lng: number; address: string };
    dropoff: { lat: number; lng: number; address: string };
  }): Promise<any> {
    return this.request('/pricing/quote', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Booking
  async bookRide(payload: any): Promise<any> {
    return this.request('/reservations/book', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getBookingStatus(bookingId: string): Promise<any> {
    return this.request(`/reservations/${bookingId}/status`);
  }

  async cancelBooking(bookingId: string): Promise<any> {
    return this.request(`/reservations/${bookingId}/cancel`, { method: 'POST' });
  }

  // Ride History
  async getRideHistory(): Promise<any[]> {
    return this.request('/rider/disputes');
  }

  // Ratings
  async submitRating(payload: { tripId: string; rating: number; tags?: string[]; comment?: string }): Promise<any> {
    return this.request('/rider/ratings', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Messaging
  async getMessages(tripId: string): Promise<any[]> {
    return this.request(`/rider/messages/${tripId}`);
  }

  async sendMessage(tripId: string, content: string): Promise<any> {
    return this.request(`/rider/messages/${tripId}`, { method: 'POST', body: JSON.stringify({ content }) });
  }

  // Support / Disputes
  async getDisputes(): Promise<any[]> {
    return this.request('/rider/disputes');
  }

  async createDispute(payload: any): Promise<any> {
    return this.request('/rider/disputes', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Consent
  async getConsents(): Promise<any[]> {
    return this.request('/rider/consents');
  }

  async updateConsent(consentType: string, granted: boolean): Promise<any> {
    return this.request('/rider/consents', { method: 'POST', body: JSON.stringify({ consentType, granted }) });
  }

  // Split Pay
  async initiateSplitPay(payload: any): Promise<any> {
    return this.request('/rider/split-pay', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Hourly Booking
  async createHourlyBooking(payload: any): Promise<any> {
    return this.request('/rider/hourly-booking', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Scheduled Booking
  async createScheduledBooking(payload: any): Promise<any> {
    return this.request('/rider/scheduled', { method: 'POST', body: JSON.stringify(payload) });
  }
}

export const riderApi = new RiderNativeApiService();
