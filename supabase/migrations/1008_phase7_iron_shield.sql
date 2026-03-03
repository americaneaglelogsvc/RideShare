-- ============================================================================
-- Migration 1008: Phase 7.0 — Iron Shield
-- Row Level Security for Phase 4/5/6.5/Hardening tables
-- Compliance Gatekeeper support columns
-- Trip cancellation support
-- ============================================================================

-- ── 1. RLS: Phase 4 tables ─────────────────────────────────────────────────

ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped compliance documents"
  ON compliance_documents FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

ALTER TABLE parallel_session_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read parallel session log"
  ON parallel_session_log FOR SELECT TO authenticated USING (true);

ALTER TABLE distribution_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped distribution splits"
  ON distribution_splits FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ── 2. RLS: Phase 5 tables ─────────────────────────────────────────────────

ALTER TABLE geo_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped geo zones"
  ON geo_zones FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

ALTER TABLE dispute_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped dispute cases"
  ON dispute_cases FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped consent records"
  ON consent_records FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages idempotency keys"
  ON idempotency_keys FOR ALL TO authenticated USING (true);

-- ── 3. RLS: Phase 6.5 tables ──────────────────────────────────────────────

ALTER TABLE vip_riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped VIP riders"
  ON vip_riders FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

ALTER TABLE vip_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped VIP alerts"
  ON vip_alerts FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped discount codes"
  ON discount_codes FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

ALTER TABLE spill_over_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped spill-over referrals (originating)"
  ON spill_over_referrals FOR ALL TO authenticated
  USING (
    originating_tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR fulfilling_tenant_id = (current_setting('app.current_tenant_id', true))::uuid
  );

-- ── 4. RLS: Launch Hardening tables ───────────────────────────────────────

ALTER TABLE referral_distribution_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped referral distribution splits"
  ON referral_distribution_splits FOR ALL TO authenticated
  USING (
    originating_tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR fulfilling_tenant_id = (current_setting('app.current_tenant_id', true))::uuid
  );

ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read health snapshots"
  ON system_health_snapshots FOR SELECT TO authenticated USING (true);

-- ── 5. Trip cancellation support ──────────────────────────────────────────

ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_fee_cents INT DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_by TEXT; -- 'rider' | 'driver' | 'system'
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- ── 6. Compliance gatekeeper: ensure onboarding status is queryable ───────

CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_status
  ON tenant_onboarding(tenant_id, status);

-- ── 7. Branding Requests (V.2: Customization Fees & Approval Workflow) ──

CREATE TABLE IF NOT EXISTS branding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  change_type TEXT NOT NULL,  -- 'custom_css' | 'custom_assets' | 'both'
  css_overrides JSONB,
  asset_urls JSONB,
  notes TEXT,
  one_time_fee_cents INT NOT NULL DEFAULT 0,
  monthly_surcharge_cents INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review | approved | rejected | activated
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branding_requests_tenant ON branding_requests(tenant_id, created_at DESC);
ALTER TABLE branding_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant-scoped branding requests"
  ON branding_requests FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ── 8. Spill-Over & Skinning columns on tenant_onboarding ───────────────

ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS spill_over_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS custom_css_json JSONB;

-- ── 9. Ledger metadata column (for TRIP_ASSIGNED / TRIP_CANCELLED context) ──

ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS metadata JSONB;
