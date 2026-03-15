-- Phase 15: Testing + Reliability (M12)
-- JOB-QUE-0001: Job queue table
-- ENV-0001: Environment config validation
-- TIME-TZ-0001: Timezone-aware scheduling
-- API-ERR-0001 / API-IDEM-0001: Standardized error + idempotency improvements

-- Job queue (JOB-QUE-0001)
CREATE TABLE IF NOT EXISTS job_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue           text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 3,
  run_at          timestamptz NOT NULL DEFAULT now(),
  error           text,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_queue_status_run ON job_queue(status, run_at) WHERE status = 'pending';
CREATE INDEX idx_job_queue_queue ON job_queue(queue);

-- Environment config audit (ENV-0001)
CREATE TABLE IF NOT EXISTS env_config_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key      text NOT NULL,
  is_set          boolean NOT NULL,
  source          text NOT NULL CHECK (source IN ('env', 'vault', 'config_file', 'default')),
  checked_at      timestamptz NOT NULL DEFAULT now()
);

-- Timezone-aware scheduling config (TIME-TZ-0001)
CREATE TABLE IF NOT EXISTS tenant_timezone_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  timezone        text NOT NULL DEFAULT 'America/Chicago',
  business_hours_start text DEFAULT '06:00',
  business_hours_end text DEFAULT '22:00',
  scheduling_enabled boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Standardized API error log (API-ERR-0001)
CREATE TABLE IF NOT EXISTS api_error_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      text,
  method          text NOT NULL,
  path            text NOT NULL,
  status_code     integer NOT NULL,
  error_code      text,
  error_message   text,
  tenant_id       uuid,
  user_id         uuid,
  stack_trace     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_error_log_time ON api_error_log(created_at DESC);
CREATE INDEX idx_api_error_log_code ON api_error_log(error_code);

-- GCP auth secrets reference (GCP-AUTH-0001)
CREATE TABLE IF NOT EXISTS secret_references (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  provider        text NOT NULL DEFAULT 'env' CHECK (provider IN ('env', 'gcp_secret_manager', 'aws_ssm', 'vault')),
  secret_path     text NOT NULL,
  version         text DEFAULT 'latest',
  last_rotated_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO secret_references (name, provider, secret_path)
VALUES
  ('SUPABASE_URL', 'env', 'SUPABASE_URL'),
  ('SUPABASE_ANON_KEY', 'env', 'SUPABASE_ANON_KEY'),
  ('SUPABASE_SERVICE_ROLE_KEY', 'env', 'SUPABASE_SERVICE_ROLE_KEY'),
  ('JWT_SECRET', 'env', 'JWT_SECRET'),
  ('FLUIDPAY_API_KEY', 'env', 'FLUIDPAY_API_KEY'),
  ('FCM_SERVER_KEY', 'env', 'FCM_SERVER_KEY'),
  ('AWS_ACCESS_KEY_ID', 'env', 'AWS_ACCESS_KEY_ID'),
  ('AWS_SECRET_ACCESS_KEY', 'env', 'AWS_SECRET_ACCESS_KEY')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE env_config_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_timezone_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_queue_admin ON job_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN','PLATFORM_OPS') AND ur.is_active = true)
);

CREATE POLICY env_audit_admin ON env_config_audit FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY tz_config_tenant ON tenant_timezone_config FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY error_log_admin ON api_error_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN','PLATFORM_OPS') AND ur.is_active = true)
);

CREATE POLICY secrets_admin ON secret_references FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

COMMENT ON TABLE job_queue IS 'Phase 15: Persistent job queue with retry and exponential backoff';
COMMENT ON TABLE env_config_audit IS 'Phase 15: Environment variable presence audit log';
COMMENT ON TABLE tenant_timezone_config IS 'Phase 15: Per-tenant timezone and business hours config';
COMMENT ON TABLE api_error_log IS 'Phase 15: Centralized API error logging for observability';
COMMENT ON TABLE secret_references IS 'Phase 15: Secret manager references for rotation tracking';
