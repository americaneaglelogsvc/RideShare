/**
 * Cross-Tenant Isolation Integration Tests
 *
 * Verifies that Row Level Security (RLS) and application-layer tenant
 * enforcement prevent any data leakage between tenants.
 *
 * Seed tenants (from migration 1022):
 *   GoldRavenia  → a1b2c3d4-0001-4000-8000-000000000001
 *   BlackRavenia → a1b2c3d4-0002-4000-8000-000000000002
 *
 * These tests run against the Supabase test/staging database.
 * Set SUPABASE_URL and SUPABASE_SERVICE_KEY in the test environment.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const TENANT_GOLD = 'a1b2c3d4-0001-4000-8000-000000000001';
const TENANT_BLACK = 'a1b2c3d4-0002-4000-8000-000000000002';

const TABLES_WITH_TENANT_ID = [
  'drivers',
  'vehicles',
  'trips',
  'riders',
  'bookings',
  'payments',
  'ratings',
  'driver_payouts',
  'compliance_documents',
  'dispute_cases',
];

function makeClientForTenant(tenantId: string): SupabaseClient {
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: {
      headers: {
        'x-tenant-id': tenantId,
      },
    },
  });
  return client;
}

async function setTenantContext(client: SupabaseClient, tenantId: string): Promise<void> {
  await client.rpc('set_config', {
    setting_name: 'app.current_tenant_id',
    new_value: tenantId,
    is_local: true,
  }).maybeSingle();
}

describe('Cross-Tenant Isolation — RLS enforcement', () => {
  let goldClient: SupabaseClient;
  let blackClient: SupabaseClient;
  let serviceClient: SupabaseClient;

  const TEST_SKIP = !SUPABASE_URL || !SUPABASE_SERVICE_KEY;

  beforeAll(() => {
    if (TEST_SKIP) return;
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    goldClient = makeClientForTenant(TENANT_GOLD);
    blackClient = makeClientForTenant(TENANT_BLACK);
  });

  if (TEST_SKIP) {
    it.skip('skipped — SUPABASE_URL/SUPABASE_SERVICE_KEY not set (run against staging)', () => {});
    return;
  }

  describe('Seed tenant existence', () => {
    it('GoldRavenia tenant exists in DB', async () => {
      const { data } = await serviceClient
        .from('tenants')
        .select('id, name')
        .eq('id', TENANT_GOLD)
        .maybeSingle();
      expect(data).not.toBeNull();
      expect(data?.name).toBe('GoldRavenia');
    });

    it('BlackRavenia tenant exists in DB', async () => {
      const { data } = await serviceClient
        .from('tenants')
        .select('id, name')
        .eq('id', TENANT_BLACK)
        .maybeSingle();
      expect(data).not.toBeNull();
      expect(data?.name).toBe('BlackRavenia');
    });
  });

  describe('RLS: GoldRavenia cannot read BlackRavenia rows', () => {
    for (const table of TABLES_WITH_TENANT_ID) {
      it(`${table}: GoldRavenia session returns 0 BlackRavenia rows`, async () => {
        await setTenantContext(goldClient, TENANT_GOLD);

        const { data, error } = await goldClient
          .from(table)
          .select('id, tenant_id')
          .eq('tenant_id', TENANT_BLACK);

        if (error && error.code === 'PGRST116') {
          // Table doesn't exist in this env — skip gracefully
          return;
        }

        const leakedRows = (data || []).filter(r => r.tenant_id === TENANT_BLACK);
        expect(leakedRows.length).toBe(0);
      });
    }
  });

  describe('RLS: BlackRavenia cannot read GoldRavenia rows', () => {
    for (const table of TABLES_WITH_TENANT_ID) {
      it(`${table}: BlackRavenia session returns 0 GoldRavenia rows`, async () => {
        await setTenantContext(blackClient, TENANT_BLACK);

        const { data, error } = await blackClient
          .from(table)
          .select('id, tenant_id')
          .eq('tenant_id', TENANT_GOLD);

        if (error && error.code === 'PGRST116') {
          return;
        }

        const leakedRows = (data || []).filter(r => r.tenant_id === TENANT_GOLD);
        expect(leakedRows.length).toBe(0);
      });
    }
  });

  describe('RLS: tenant_id column is NOT NULL on all core tables', () => {
    for (const table of TABLES_WITH_TENANT_ID) {
      it(`${table}: no rows exist with NULL tenant_id`, async () => {
        const { count, error } = await serviceClient
          .from(table)
          .select('*', { count: 'exact', head: true })
          .is('tenant_id', null);

        if (error && error.code === 'PGRST116') return;
        expect(count ?? 0).toBe(0);
      });
    }
  });

  describe('trip_messages: cross-tenant message visibility', () => {
    it('GoldRavenia session returns 0 BlackRavenia trip_messages', async () => {
      await setTenantContext(goldClient, TENANT_GOLD);

      const { data, error } = await goldClient
        .from('trip_messages')
        .select('id, tenant_id')
        .eq('tenant_id', TENANT_BLACK);

      if (error && error.code === 'PGRST116') return;

      const leaked = (data || []).filter(r => r.tenant_id === TENANT_BLACK);
      expect(leaked.length).toBe(0);
    });

    it('BlackRavenia session returns 0 GoldRavenia trip_messages', async () => {
      await setTenantContext(blackClient, TENANT_BLACK);

      const { data, error } = await blackClient
        .from('trip_messages')
        .select('id, tenant_id')
        .eq('tenant_id', TENANT_GOLD);

      if (error && error.code === 'PGRST116') return;

      const leaked = (data || []).filter(r => r.tenant_id === TENANT_GOLD);
      expect(leaked.length).toBe(0);
    });
  });

  describe('platform_terms_acceptances: cross-tenant isolation', () => {
    it('GoldRavenia session cannot read BlackRavenia term acceptances', async () => {
      await setTenantContext(goldClient, TENANT_GOLD);

      const { data, error } = await goldClient
        .from('platform_terms_acceptances')
        .select('id, tenant_id')
        .eq('tenant_id', TENANT_BLACK);

      if (error && error.code === 'PGRST116') return;

      const leaked = (data || []).filter(r => r.tenant_id === TENANT_BLACK);
      expect(leaked.length).toBe(0);
    });
  });
});
