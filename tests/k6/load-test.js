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

  // NOTE:
  // The current staging OpenAPI surface is intentionally small (and most
  // endpoints require auth). For repeatable load testing without secrets,
  // we target only the public /health endpoint.
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
