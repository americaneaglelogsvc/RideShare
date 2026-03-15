const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'http://localhost:9000';

export async function apiFetch<T = any>(
  endpoint: string,
  opts: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    // Get auth token if available (client-side only)
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const authHeaders: Record<string, string> = {};
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE.replace(/\/$/, '')}${endpoint}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(opts.headers || {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || String(e) };
  }
}

// ── Ops Console ──
export const opsApi = {
  getLiveTrips: () => apiFetch('/admin/trips/live'),
  getAlerts: () => apiFetch('/admin/alerts'),
  getDriverStatuses: () => apiFetch('/admin/drivers/statuses'),
  getMetrics: () => apiFetch('/admin/metrics/realtime'),
};

// ── Owner Console ──
export const ownerApi = {
  getDashboard: (tenantId: string) => apiFetch(`/tenants/${tenantId}/dashboard`),
  getBranding: (tenantId: string) => apiFetch(`/tenants/${tenantId}/branding`),
  getFleet: (tenantId: string) => apiFetch(`/tenants/${tenantId}/fleet`),
  getPolicies: (tenantId: string) => apiFetch(`/tenants/${tenantId}/policies`),
  getDrivers: (tenantId: string) => apiFetch(`/tenants/${tenantId}/drivers`),
  getReports: (tenantId: string) => apiFetch(`/tenants/${tenantId}/reports`),
};

// ── Platform Admin ──
export const platformApi = {
  getTenants: () => apiFetch('/admin/tenants'),
  getSystemHealth: () => apiFetch('/health/detailed'),
  suspendTenant: (tenantId: string, reason: string) =>
    apiFetch(`/admin/tenants/${tenantId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  runTests: () => apiFetch('/admin/tests/run', { method: 'POST' }),
};
