import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * k6 Load Test — RideShare Gateway API
 * Target: Cloud Run staging (rideoo-487904)
 *
 * Run: k6 run --env BASE_URL=https://rideshare-gateway-xxxxx-uc.a.run.app tests/k6/load-test.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TENANT_ID = __ENV.TENANT_ID || 'load-test-tenant';

const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '1m', target: 50 },    // sustained load
    { duration: '2m', target: 100 },   // peak load
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95th percentile < 2s
    http_req_failed: ['rate<0.05'],     // <5% error rate
    errors: ['rate<0.05'],
    health_latency: ['p(99)<500'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  'x-tenant-id': TENANT_ID,
};

export default function () {
  group('Health Check', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health`);
    healthLatency.add(Date.now() - start);
    const ok = check(res, {
      'health status 200': (r) => r.status === 200,
      'health has ok=true': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body && body.ok === true;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  group('Correlation ID Propagation', () => {
    const res = http.get(`${BASE_URL}/health`);
    const ok = check(res, {
      'has x-request-id header': (r) => !!r.headers['X-Request-Id'] || !!r.headers['x-request-id'],
    });
    errorRate.add(!ok);
  });

  group('Pricing Quote (public)', () => {
    const res = http.post(`${BASE_URL}/pricing/quote`, JSON.stringify({
      pickupLat: 41.8781, pickupLng: -87.6298,
      dropoffLat: 41.9742, dropoffLng: -87.9073,
      vehicleCategory: 'black_sedan',
    }), { headers });
    const ok = check(res, {
      'pricing returns 200 or 201': (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!ok);
  });

  group('Rate Limiting (429 + Retry-After)', () => {
    // Rapid-fire 20 requests to trigger rate limiter
    let gotRateLimited = false;
    for (let i = 0; i < 20; i++) {
      const res = http.get(`${BASE_URL}/health`);
      if (res.status === 429) {
        gotRateLimited = true;
        check(res, {
          'rate-limit has Retry-After header': (r) => !!r.headers['Retry-After'] || !!r.headers['retry-after'],
        });
        break;
      }
    }
    // Rate limiting may not trigger in all environments — that's OK
  });

  group('DLQ Stats (admin)', () => {
    const res = http.get(`${BASE_URL}/admin/jobs/stats`, { headers });
    check(res, {
      'job stats responds': (r) => r.status === 200 || r.status === 401 || r.status === 403,
    });
  });

  group('Disclosures (public)', () => {
    const res = http.get(`${BASE_URL}/disclosures/${TENANT_ID}/active`, { headers });
    check(res, {
      'disclosures responds': (r) => r.status === 200 || r.status === 404,
    });
  });

  group('Lead Capture (POST)', () => {
    const res = http.post(`${BASE_URL}/leads`, JSON.stringify({
      name: `k6-user-${__VU}`,
      email: `k6-${__VU}@loadtest.local`,
      source: 'k6_load_test',
    }), { headers });
    check(res, {
      'lead capture responds': (r) => r.status === 201 || r.status === 200 || r.status === 400,
    });
  });

  group('Standard Error Envelope', () => {
    const res = http.get(`${BASE_URL}/nonexistent-endpoint-404`);
    check(res, {
      '404 returns structured error': (r) => {
        if (r.status !== 404) return true; // skip if route exists
        try {
          const body = JSON.parse(r.body);
          return body.error !== undefined || body.message !== undefined;
        } catch { return false; }
      },
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'tests/k6/results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, opts) {
  // k6 built-in summary - this is a placeholder for the built-in handleSummary
  return JSON.stringify(data.metrics, null, 2);
}
