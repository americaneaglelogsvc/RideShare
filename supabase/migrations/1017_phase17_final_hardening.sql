-- Phase 17: Final Hardening (M14)
-- AUD-EVT-0001: Centralized audit event system
-- GCP-ARCH-0001/0002: Architecture documentation + multi-region readiness
-- PII-BASE-0001: PII protection and data subject rights

-- Centralized audit events (AUD-EVT-0001)
CREATE TABLE IF NOT EXISTS audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid,
  actor_id        uuid NOT NULL,
  actor_type      text NOT NULL CHECK (actor_type IN ('user', 'system', 'cron', 'webhook')),
  event_type      text NOT NULL,
  resource_type   text NOT NULL,
  resource_id     text NOT NULL,
  action          text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'reject', 'escalate')),
  changes         jsonb,
  metadata        jsonb DEFAULT '{}',
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_tenant ON audit_events(tenant_id, created_at DESC);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_events_type ON audit_events(event_type);

-- PII data subject access requests (PII-BASE-0001)
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid,
  user_id         uuid NOT NULL,
  request_type    text NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  reason          text,
  processed_by    uuid,
  completed_at    timestamptz,
  data_export_url text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sla_deadline    timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_dsr_user ON data_subject_requests(user_id);
CREATE INDEX idx_dsr_status ON data_subject_requests(status);

-- PII field registry: tracks which tables/columns contain PII (PII-BASE-0001)
CREATE TABLE IF NOT EXISTS pii_field_registry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      text NOT NULL,
  column_name     text NOT NULL,
  pii_category    text NOT NULL CHECK (pii_category IN ('name', 'email', 'phone', 'address', 'ssn_tin', 'payment', 'location', 'biometric', 'ip_address', 'device_id')),
  masking_strategy text NOT NULL DEFAULT 'redact' CHECK (masking_strategy IN ('redact', 'hash', 'encrypt', 'tokenize', 'none')),
  retention_days  integer,
  notes           text,
  UNIQUE (table_name, column_name)
);

-- Seed PII registry with known PII fields
INSERT INTO pii_field_registry (table_name, column_name, pii_category, masking_strategy) VALUES
  ('driver_profiles', 'phone', 'phone', 'redact'),
  ('driver_profiles', 'email', 'email', 'redact'),
  ('driver_profiles', 'ssn_last4', 'ssn_tin', 'encrypt'),
  ('rider_profiles', 'phone', 'phone', 'redact'),
  ('rider_profiles', 'email', 'email', 'redact'),
  ('trips', 'pickup_address', 'address', 'hash'),
  ('trips', 'dropoff_address', 'address', 'hash'),
  ('payment_consent_log', 'ip_address', 'ip_address', 'hash'),
  ('legal_consents', 'ip_address', 'ip_address', 'hash'),
  ('booking_velocity_log', 'ip_address', 'ip_address', 'hash'),
  ('booking_velocity_log', 'device_fingerprint', 'device_id', 'hash'),
  ('tax_documents', 'tin_vault_ref', 'ssn_tin', 'tokenize')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- GCP architecture metadata (GCP-ARCH-0001, GCP-ARCH-0002)
CREATE TABLE IF NOT EXISTS deployment_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment     text NOT NULL UNIQUE CHECK (environment IN ('development', 'staging', 'production')),
  region          text NOT NULL DEFAULT 'us-central1',
  secondary_region text,
  cloud_provider  text NOT NULL DEFAULT 'gcp',
  container_image text,
  min_instances   integer NOT NULL DEFAULT 1,
  max_instances   integer NOT NULL DEFAULT 10,
  cpu_limit       text DEFAULT '2',
  memory_limit    text DEFAULT '4Gi',
  database_tier   text DEFAULT 'db-custom-4-16384',
  cdn_enabled     boolean NOT NULL DEFAULT true,
  waf_enabled     boolean NOT NULL DEFAULT true,
  auto_scaling    boolean NOT NULL DEFAULT true,
  health_check_path text DEFAULT '/health',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO deployment_config (environment, region, secondary_region, min_instances, max_instances)
VALUES
  ('development', 'us-central1', null, 1, 2),
  ('staging', 'us-central1', null, 1, 4),
  ('production', 'us-central1', 'us-east1', 2, 10)
ON CONFLICT (environment) DO NOTHING;

-- Feature gates for gradual rollout (M14)
CREATE TABLE IF NOT EXISTS feature_gates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key     text NOT NULL UNIQUE,
  description     text,
  enabled_global  boolean NOT NULL DEFAULT false,
  enabled_tenants uuid[] DEFAULT '{}',
  enabled_users   uuid[] DEFAULT '{}',
  rollout_pct     integer NOT NULL DEFAULT 0 CHECK (rollout_pct >= 0 AND rollout_pct <= 100),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO feature_gates (feature_key, description, enabled_global, rollout_pct)
VALUES
  ('instant_cashout', 'Driver instant cash-out feature', false, 0),
  ('corporate_accounts', 'Corporate account management', false, 0),
  ('booking_widget', 'Embeddable booking widget', true, 100),
  ('surge_pricing', 'Dynamic surge pricing', true, 100),
  ('push_notifications', 'FCM push notifications', true, 100),
  ('sse_fallback', 'SSE fallback for realtime', true, 100),
  ('dispute_auto_refund', 'Automatic refund for small disputes', false, 0),
  ('tax_document_generation', '1099-K generation', false, 0)
ON CONFLICT (feature_key) DO NOTHING;

-- RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii_field_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_read ON audit_events FOR SELECT USING (
  (tenant_id IS NOT NULL AND tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER','TENANT_OPS_ADMIN') AND ur.is_active = true))
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN','PLATFORM_OPS') AND ur.is_active = true)
);

CREATE POLICY dsr_own ON data_subject_requests FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY pii_registry_admin ON pii_field_registry FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY deploy_config_admin ON deployment_config FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY feature_gates_read ON feature_gates FOR SELECT USING (true);
CREATE POLICY feature_gates_write ON feature_gates FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

COMMENT ON TABLE audit_events IS 'Phase 17: Centralized audit event log for all system actions';
COMMENT ON TABLE data_subject_requests IS 'Phase 17: GDPR/CCPA data subject request tracking';
COMMENT ON TABLE pii_field_registry IS 'Phase 17: Registry of PII fields with masking strategies';
COMMENT ON TABLE deployment_config IS 'Phase 17: GCP deployment configuration per environment';
COMMENT ON TABLE feature_gates IS 'Phase 17: Feature flag gates for gradual rollout';
