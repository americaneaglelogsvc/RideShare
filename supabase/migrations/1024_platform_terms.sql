-- ============================================================================
-- Migration 1024: Platform Terms of Service Acceptance Gate
--
-- CEO directive: UWD is a SaaS platform only. Tenants (the rideshare operators)
-- are solely responsible for regulatory compliance in their jurisdictions.
-- This table captures the timestamped legal acceptance at onboarding.
-- ============================================================================

-- 1. platform_terms_versions — tracks each version of the ToS
CREATE TABLE IF NOT EXISTS platform_terms_versions (
  version     text PRIMARY KEY,
  effective_at timestamptz NOT NULL DEFAULT now(),
  summary     text,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO platform_terms_versions (version, summary)
VALUES (
  'v1.0.0',
  'UrWayDispatch SaaS Platform Terms of Service — Subscriber is the rideshare operator; UWD provides software only.'
) ON CONFLICT (version) DO NOTHING;

-- 2. platform_terms_acceptances — audit log of tenant acceptance
CREATE TABLE IF NOT EXISTS platform_terms_acceptances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  accepted_by     uuid NOT NULL,
  terms_version   text NOT NULL REFERENCES platform_terms_versions(version),
  ip_address      text,
  user_agent      text,
  accepted_at     timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, terms_version)
);

CREATE INDEX IF NOT EXISTS idx_terms_acceptances_tenant ON platform_terms_acceptances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_version ON platform_terms_acceptances(terms_version);

-- 3. Row Level Security — tenants can only see their own acceptance records
ALTER TABLE platform_terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant-scoped terms acceptances"
  ON platform_terms_acceptances FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid)
  WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- 4. Audit log view for UWD ops (service role only — RLS bypassed)
CREATE OR REPLACE VIEW platform_terms_audit AS
SELECT
  pta.id,
  t.name            AS tenant_name,
  pta.tenant_id,
  pta.accepted_by,
  pta.terms_version,
  ptv.effective_at  AS terms_effective_at,
  pta.ip_address,
  pta.accepted_at
FROM platform_terms_acceptances pta
JOIN tenants t ON t.id = pta.tenant_id
JOIN platform_terms_versions ptv ON ptv.version = pta.terms_version
ORDER BY pta.accepted_at DESC;
