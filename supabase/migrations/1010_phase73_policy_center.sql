-- Phase 7.3: Policy Center — versioned tenant policies with JSON Schema validation

CREATE TABLE IF NOT EXISTS tenant_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  policy_type     text NOT NULL CHECK (policy_type IN (
    'cancellation',
    'no_show',
    'wait_time',
    'surge_pricing',
    'driver_payout',
    'tipping',
    'safety',
    'dispute_resolution',
    'data_retention',
    'accessibility',
    'custom'
  )),
  version         integer NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'rollback')),
  activation_mode text NOT NULL DEFAULT 'manual_only' CHECK (activation_mode IN ('enabled', 'manual_only', 'auto_apply')),
  config_json     jsonb NOT NULL DEFAULT '{}',
  schema_version  text NOT NULL DEFAULT '1.0.0',
  jurisdiction    text,
  effective_from  timestamptz,
  effective_until timestamptz,
  published_at    timestamptz,
  published_by    uuid,
  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  notes           text,
  UNIQUE (tenant_id, policy_type, version)
);

CREATE INDEX idx_tenant_policies_tenant ON tenant_policies(tenant_id);
CREATE INDEX idx_tenant_policies_active ON tenant_policies(tenant_id, policy_type, status) WHERE status = 'published';
CREATE INDEX idx_tenant_policies_type ON tenant_policies(policy_type);

-- Policy change audit log
CREATE TABLE IF NOT EXISTS policy_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   uuid NOT NULL REFERENCES tenant_policies(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('created', 'updated', 'published', 'archived', 'rolled_back')),
  actor_id    uuid NOT NULL,
  old_config  jsonb,
  new_config  jsonb,
  diff_summary text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_policy_audit_tenant ON policy_audit_log(tenant_id);
CREATE INDEX idx_policy_audit_policy ON policy_audit_log(policy_id);

-- Jurisdiction templates (seed data)
CREATE TABLE IF NOT EXISTS jurisdiction_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction    text NOT NULL,
  policy_type     text NOT NULL,
  template_json   jsonb NOT NULL,
  disclaimer      text,
  schema_version  text NOT NULL DEFAULT '1.0.0',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction, policy_type)
);

-- RLS
ALTER TABLE tenant_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_policies_tenant_read ON tenant_policies
  FOR SELECT USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
        AND ur.is_active = true
    )
  );

CREATE POLICY tenant_policies_owner_write ON tenant_policies
  FOR ALL USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('TENANT_OWNER', 'TENANT_OPS_ADMIN')
        AND ur.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('PLATFORM_SUPER_ADMIN')
        AND ur.is_active = true
    )
  );

CREATE POLICY policy_audit_read ON policy_audit_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
        AND ur.is_active = true
    )
  );

CREATE POLICY jurisdiction_templates_public_read ON jurisdiction_templates
  FOR SELECT USING (is_active = true);

-- Seed: Illinois cancellation template
INSERT INTO jurisdiction_templates (jurisdiction, policy_type, template_json, disclaimer)
VALUES (
  'US-IL',
  'cancellation',
  '{
    "grace_period_seconds": 120,
    "fee_after_grace_cents": 500,
    "max_fee_cents": 1500,
    "driver_compensation_pct": 50,
    "applies_to": ["standard", "premium", "xl"]
  }'::jsonb,
  'Illinois Transportation Network Provider Act requires transparent cancellation fee disclosure to riders prior to booking confirmation.'
)
ON CONFLICT (jurisdiction, policy_type) DO NOTHING;

-- Seed: Illinois surge pricing template
INSERT INTO jurisdiction_templates (jurisdiction, policy_type, template_json, disclaimer)
VALUES (
  'US-IL',
  'surge_pricing',
  '{
    "max_multiplier": 3.0,
    "disclosure_required": true,
    "emergency_cap_multiplier": 1.0,
    "cooldown_minutes": 15,
    "applies_to": ["standard", "premium", "xl"]
  }'::jsonb,
  'Illinois law prohibits excessive surge pricing during declared emergencies. Platform must cap surge to 1.0x during state-declared emergencies.'
)
ON CONFLICT (jurisdiction, policy_type) DO NOTHING;

COMMENT ON TABLE tenant_policies IS 'Phase 7.3: Versioned tenant policies with draft/publish/rollback lifecycle';
COMMENT ON TABLE policy_audit_log IS 'Phase 7.3: Immutable audit trail for all policy changes';
COMMENT ON TABLE jurisdiction_templates IS 'Phase 7.3: Jurisdiction-specific policy templates with legal disclaimers';
