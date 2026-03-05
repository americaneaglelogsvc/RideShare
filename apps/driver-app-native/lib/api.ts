import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
const TENANT_KEY = 'tenant_id';

class DriverNativeApiService {
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

  // Auth
  async login(payload: { phone: string; password: string }): Promise<any> {
    return this.request('/driver/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  }

  async register(payload: any): Promise<any> {
    return this.request('/driver/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Dashboard
  async getDashboard(): Promise<any> {
    return this.request('/driver/dashboard');
  }

  // Status
  async updateStatus(status: string): Promise<any> {
    return this.request('/driver/status', { method: 'PATCH', body: JSON.stringify({ status }) });
  }

  // Location
  async updateLocation(lat: number, lng: number): Promise<any> {
    return this.request('/driver/location', { method: 'POST', body: JSON.stringify({ lat, lng }) });
  }

  // Offers
  async getCurrentOffers(): Promise<any[]> {
    return this.request('/driver/offers/current');
  }

  async respondToOffer(offerId: string, accept: boolean): Promise<any> {
    return this.request(`/driver/offers/${offerId}/respond`, { method: 'POST', body: JSON.stringify({ accept }) });
  }

  // Profile
  async getProfile(): Promise<any> {
    return this.request('/driver/profile');
  }

  // Earnings
  async getEarnings(): Promise<any> {
    return this.request('/driver/earnings');
  }

  // Trip History
  async getTripHistory(): Promise<any[]> {
    return this.request('/driver/trips/history');
  }

  // Dispatch
  async acceptDispatch(offerId: string): Promise<any> {
    return this.request(`/dispatch/accept-offer/${offerId}`, { method: 'POST' });
  }
}

export const driverApi = new DriverNativeApiService();
