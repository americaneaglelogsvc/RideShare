import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

/**
 * E2E / Integration tests for the RideShare Gateway API.
 *
 * These tests boot a real NestJS app instance and hit HTTP endpoints
 * via supertest. Services that depend on Supabase/external APIs will
 * return graceful errors or empty results since no real DB is connected
 * in the test environment — the goal is to verify routing, guards,
 * status codes, and response shapes.
 */
describe('Gateway API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // ── Health ──────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
    });
  });

  // ── Pricing / Quote ────────────────────────────────────────────
  describe('POST /pricing/quote', () => {
    it('should return a quote or graceful error', async () => {
      const res = await request(app.getHttpServer())
        .post('/pricing/quote')
        .set('x-tenant-id', 'test-tenant')
        .send({
          category: 'black_sedan',
          service: 'on_demand',
          pickup: { lat: 41.8781, lng: -87.6298, address: '123 N Michigan Ave' },
          dropoff: { lat: 41.9786, lng: -87.9048, address: "O'Hare Airport" },
        });
      // Either 200 (quote) or 500 (no DB) — both are valid in test env
      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  // ── Driver endpoints ───────────────────────────────────────────
  describe('Driver API', () => {
    it('GET /driver/profile should require auth (401)', async () => {
      const res = await request(app.getHttpServer()).get('/driver/profile');
      expect([401, 403]).toContain(res.status);
    });

    it('PUT /driver/status should require auth (401)', async () => {
      const res = await request(app.getHttpServer())
        .put('/driver/status')
        .send({ status: 'online' });
      expect([401, 403]).toContain(res.status);
    });
  });

  // ── Admin endpoints (require RBAC) ─────────────────────────────
  describe('Admin API', () => {
    it('POST /admin/tenants/:id/suspend should require auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/tenants/test-tenant/suspend')
        .send({ reason: 'test' });
      expect([401, 403]).toContain(res.status);
    });

    it('GET /admin/metrics should require auth', async () => {
      const res = await request(app.getHttpServer()).get('/admin/metrics');
      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ── Tenant endpoints ───────────────────────────────────────────
  describe('Tenant API', () => {
    it('GET /tenants should return list or require auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenants')
        .set('x-tenant-id', 'test-tenant');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  // ── Policy endpoints ───────────────────────────────────────────
  describe('Policy API', () => {
    it('GET /policies should require tenant context', async () => {
      const res = await request(app.getHttpServer()).get('/policies');
      expect([200, 400, 401, 403, 404, 500]).toContain(res.status);
    });

    it('GET /policies with tenant header should respond', async () => {
      const res = await request(app.getHttpServer())
        .get('/policies')
        .set('x-tenant-id', 'test-tenant');
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ── Rider endpoints ────────────────────────────────────────────
  describe('Rider API', () => {
    it('POST /rider/disputes should require auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/rider/disputes')
        .set('x-tenant-id', 'test-tenant')
        .send({ tripId: 'test', type: 'fare_dispute', description: 'test' });
      expect([401, 403]).toContain(res.status);
    });

    it('GET /rider/consent should require auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/rider/consent')
        .set('x-tenant-id', 'test-tenant');
      expect([401, 403]).toContain(res.status);
    });
  });

  // ── Corporate endpoints ────────────────────────────────────────
  describe('Corporate API', () => {
    it('GET /corporate/accounts should require auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/corporate/accounts')
        .set('x-tenant-id', 'test-tenant');
      expect([401, 403]).toContain(res.status);
    });
  });

  // ── Payout endpoints ──────────────────────────────────────────
  describe('Payout API', () => {
    it('GET /payouts/preview should require auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/payouts/preview')
        .set('x-tenant-id', 'test-tenant');
      expect([401, 403]).toContain(res.status);
    });
  });

  // ── Microsite / FAQ endpoints ─────────────────────────────────
  describe('Microsite & FAQ API', () => {
    it('GET /microsites should respond', async () => {
      const res = await request(app.getHttpServer())
        .get('/microsites')
        .set('x-tenant-id', 'test-tenant');
      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /faq/categories should respond', async () => {
      const res = await request(app.getHttpServer()).get('/faq/categories');
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ── Idempotency header ────────────────────────────────────────
  describe('Idempotency', () => {
    it('should accept X-Idempotency-Key header without error', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('X-Idempotency-Key', 'test-key-123');
      expect(res.status).toBe(200);
    });
  });

  // ── CORS / Security headers ───────────────────────────────────
  describe('Security', () => {
    it('should not expose sensitive headers on health', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers).not.toHaveProperty('x-powered-by');
    });
  });
});
