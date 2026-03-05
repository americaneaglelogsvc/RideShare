# Tenant Isolation Architecture — UrWayDispatch

## Model: Shared Database + Row Level Security (RLS)

UrWayDispatch uses a **single shared Supabase PostgreSQL database** with tenant isolation enforced through two complementary mechanisms:

1. **`tenant_id` UUID column** on every domain table — every row is tagged to its owner tenant
2. **PostgreSQL Row Level Security (RLS) policies** — the database itself enforces that a session can only read/write rows matching the session's `app.current_tenant_id` setting

This is the industry-standard model used by Stripe, Shopify, PagerDuty, and the majority of B2B SaaS platforms.

---

## Why Not Separate Databases Per Tenant?

| Separate DB per tenant | Shared DB + RLS (current) |
|---|---|
| Absolute physical isolation | Strong logical isolation enforced at DB engine level |
| $X per tenant minimum (Supabase Pro = $25+/project) | Single cost — scales with data volume only |
| Schema migrations must run N times | One migration run covers all tenants |
| Connection pooling requires per-tenant routing | Single PgBouncer pool, tenant set at session open |
| Harder to run cross-tenant analytics for UWD ops | Cross-tenant queries available to service role only |

**Verdict:** Shared DB + RLS provides pay-as-you-grow cost with strong isolation guarantees when RLS is correctly configured and tested.

---

## How the Session Tenant Variable Works

Every API request sets the Postgres session variable before any query executes:

```sql
SELECT set_config('app.current_tenant_id', '<uuid>', true);
```

RLS policies on each table check this variable:

```sql
CREATE POLICY "Tenant-scoped trips"
  ON trips FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
```

The application sets this via `SupabaseService.getClientForTenant(tenantId)` before passing the client to any service method.

---

## Tables Protected by RLS

All tables with `tenant_id` have RLS enabled. As of migration `1022`:

| Table group | Migration | Policy type |
|---|---|---|
| Core: drivers, vehicles, trips, riders, bookings, payments, ratings | `999_add_multi_tenancy.sql` | tenant_id match |
| Compliance, disputes, consent | `1008_phase7_iron_shield.sql` | tenant_id match |
| Billing, onboarding | `1002_phase2_billing_onboarding.sql` | tenant_id match |
| RBAC roles, policies | `1009`, `1010` | tenant_id match |
| Messages (`trip_messages`) | `1023_in_app_messaging_rls.sql` | tenant_id match |
| Terms acceptances | `1024_platform_terms.sql` | tenant_id match |

---

## Automated Verification

Cross-tenant isolation is verified by the integration test suite at:

```
tests/integration/cross-tenant-isolation.spec.ts
```

Tests use the two seed tenants provisioned in migration `1022`:
- **GoldRavenia** — `a1b2c3d4-0001-4000-8000-000000000001`
- **BlackRavenia** — `a1b2c3d4-0002-4000-8000-000000000002`

The suite asserts:
- GoldRavenia session returns 0 BlackRavenia rows on all core tables
- BlackRavenia session returns 0 GoldRavenia rows on all core tables
- No rows exist with `NULL tenant_id` on any table
- `trip_messages` cross-tenant isolation
- `platform_terms_acceptances` cross-tenant isolation

These tests run in CI on every push to `main` via `deploy_staging_on_main.yml`.

---

## Super-Admin Access (UWD Internal)

UWD super-admin and sub-super-admin roles connect using the **Supabase service role key** which bypasses RLS entirely. This is intentional — UWD operations staff need cross-tenant visibility for:
- Audit and compliance investigations
- Message moderation
- Support escalations
- Billing and usage analytics

This key is stored in GCP Secret Manager and is **never** exposed to tenant users or their API calls.
