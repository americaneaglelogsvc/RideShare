/*
  1002_phase2_billing_onboarding.sql
  Phase 2: Operational Automation & Onboarding Lifecycle

  1. tenants: add billing columns (next_billing_date, billing_status)
  2. tenant_onboarding: add ACH authorization + branding columns
  3. tenant_profiles: create table for branding assets
  4. onboarding_links: secure UUID-based invitation links
  5. billing_events: audit trail for subscription billing
  6. notification_log: outbound email/event log
  7. driver_heartbeats: distributed heartbeat for ghost-session prevention
*/

-- 1. Billing columns on tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_billing_date date;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_status text DEFAULT 'CURRENT';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_failed_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_failure_reason text;

-- 2. ACH authorization on tenant_onboarding
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS ach_mandate_reference text;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS ach_bank_last4 text;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS ach_authorized_at timestamptz;

-- 3. Tenant branding profiles
CREATE TABLE IF NOT EXISTS tenant_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL UNIQUE REFERENCES tenants(id),
  primary_hex     text DEFAULT '#1E40AF',
  secondary_hex   text DEFAULT '#F59E0B',
  logo_svg_url    text,
  app_icon_url    text,
  welcome_message text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_profiles_tenant_id ON tenant_profiles(tenant_id);
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage tenant profiles"
  ON tenant_profiles FOR ALL TO authenticated USING (true);

-- 4. Onboarding invitation links
CREATE TABLE IF NOT EXISTS onboarding_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token           uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id),
  email           text NOT NULL,
  company_name    text,
  status          text DEFAULT 'PENDING',
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  claimed_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_links_token ON onboarding_links(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_links_email ON onboarding_links(email);
ALTER TABLE onboarding_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage onboarding links"
  ON onboarding_links FOR ALL TO authenticated USING (true);

-- 5. Billing events audit trail
CREATE TABLE IF NOT EXISTS billing_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  event_type      text NOT NULL,
  amount_cents    integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'PENDING',
  payment_reference text,
  failure_reason  text,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read billing events"
  ON billing_events FOR SELECT TO authenticated USING (true);

-- 6. Notification log
CREATE TABLE IF NOT EXISTS notification_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id),
  recipient_email text NOT NULL,
  event_type      text NOT NULL,
  subject         text,
  status          text DEFAULT 'QUEUED',
  sent_at         timestamptz,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_tenant_id ON notification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_event_type ON notification_log(event_type);
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read notification log"
  ON notification_log FOR SELECT TO authenticated USING (true);

-- 7. Driver heartbeats (per-tenant-profile)
CREATE TABLE IF NOT EXISTS driver_heartbeats (
  driver_profile_id uuid PRIMARY KEY REFERENCES driver_profiles(id),
  tenant_id         uuid NOT NULL REFERENCES tenants(id),
  last_ping_at      timestamptz NOT NULL DEFAULT now(),
  connection_status text DEFAULT 'ONLINE'
);

CREATE INDEX IF NOT EXISTS idx_driver_heartbeats_tenant_id ON driver_heartbeats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_heartbeats_last_ping ON driver_heartbeats(last_ping_at);
ALTER TABLE driver_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can update own heartbeat"
  ON driver_heartbeats FOR ALL TO authenticated
  USING (
    driver_profile_id IN (
      SELECT dp.id FROM driver_profiles dp
      JOIN driver_identities di ON dp.driver_identity_id = di.id
      WHERE di.auth_user_id = auth.uid()
    )
  );
