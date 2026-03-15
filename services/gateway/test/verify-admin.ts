const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const API = 'http://localhost:9000';

async function main() {
  // 1. Auth with driver1 (known-working credentials)
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ email: 'driver1@tenantalpha.com', password: 'Password123!' }),
  });
  const authData = await authRes.json();
  const token = authData.access_token;
  console.log('AUTH:', token ? '✅ OK (token obtained)' : '❌ FAIL');
  if (!token) { console.log('Auth response:', JSON.stringify(authData)); return; }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': '11111111-1111-1111-1111-111111111111',
  };

  // 2. Test endpoints
  const endpoints = [
    ['GET', '/health'],
    ['GET', '/admin/trips/live'],
    ['GET', '/admin/alerts'],
    ['GET', '/admin/drivers/statuses'],
    ['GET', '/admin/metrics/realtime'],
    ['GET', '/admin/tenants'],
    ['GET', '/admin/jobs/stats'],
    ['GET', '/dispatch/realtime/poll/offers/d2000000-0000-0000-a000-000000000001'],
    ['GET', '/payments/test-nonexist'],
  ];

  for (const [method, ep] of endpoints) {
    try {
      const res = await fetch(`${API}${ep}`, { method, headers });
      const data = await res.json();
      const summary = Array.isArray(data)
        ? `[array] count=${data.length}`
        : JSON.stringify(data).slice(0, 200);
      const icon = res.status < 300 ? '✅' : res.status === 401 ? '🔒' : res.status === 403 ? '⛔' : '⚠️';
      console.log(`${icon} ${res.status} ${method} ${ep} → ${summary}`);
    } catch (err: any) {
      console.log(`❌ ERR ${method} ${ep} → ${err.message}`);
    }
  }
}

main().catch(console.error);
