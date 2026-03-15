-- Patch: add tenant_id columns that 999_add_multi_tenancy.sql failed to add
-- (the IF NOT EXISTS constraint syntax is not supported in plain PostgreSQL)

DO $$
DECLARE
  legacy_tenant_id uuid;
BEGIN
  -- Get or create legacy tenant
  SELECT id INTO legacy_tenant_id FROM tenants WHERE name = 'legacy-default';
  IF legacy_tenant_id IS NULL THEN
    INSERT INTO tenants (name) VALUES ('legacy-default') RETURNING id INTO legacy_tenant_id;
  END IF;

  -- Add tenant_id to all tables that need it
  BEGIN ALTER TABLE drivers ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE vehicles ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE driver_locations ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE trips ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE ride_offers ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE riders ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE bookings ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE quotes ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE payments ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE ratings ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE airport_queues ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE driver_payouts ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE payment_refunds ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE saved_payment_methods ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE driver_bank_accounts ADD COLUMN tenant_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END;

  -- Backfill
  UPDATE drivers SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE vehicles SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE driver_locations SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE trips SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE ride_offers SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE riders SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE bookings SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE quotes SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE payments SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE ratings SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE airport_queues SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE driver_payouts SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE payment_refunds SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE saved_payment_methods SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
  UPDATE driver_bank_accounts SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
END $$;

-- Create missing tables from later migrations that failed due to auth schema
-- tenant_api_keys
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  label text DEFAULT 'default',
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES tenants(id),
  role text NOT NULL DEFAULT 'rider',
  created_at timestamptz DEFAULT now()
);

-- driver_profiles (multi-tenant driver view)
CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  driver_identity_id uuid REFERENCES driver_identities(id),
  status text DEFAULT 'offline',
  is_active boolean DEFAULT true,
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Corporate accounts
CREATE TABLE IF NOT EXISTS corporate_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  company_name text NOT NULL,
  account_code text UNIQUE,
  billing_email text,
  is_active boolean DEFAULT true,
  budget_limit numeric(12,2),
  created_at timestamptz DEFAULT now()
);

-- Microsites
CREATE TABLE IF NOT EXISTS tenant_microsites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  subdomain text UNIQUE NOT NULL,
  is_published boolean DEFAULT false,
  branding jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Microsite widgets
CREATE TABLE IF NOT EXISTS microsite_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  microsite_id uuid REFERENCES tenant_microsites(id),
  widget_type text NOT NULL,
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Policy center
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  policy_type text NOT NULL,
  version integer DEFAULT 1,
  status text DEFAULT 'draft',
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz
);

-- Pricing policies
CREATE TABLE IF NOT EXISTS pricing_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  base_fare numeric(10,2) DEFAULT 0,
  per_mile_rate numeric(10,2) DEFAULT 0,
  per_minute_rate numeric(10,2) DEFAULT 0,
  surge_cap numeric(4,2) DEFAULT 3.0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- In-app messages
CREATE TABLE IF NOT EXISTS in_app_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  trip_id uuid REFERENCES trips(id),
  sender_id uuid NOT NULL,
  sender_type text NOT NULL,
  message_text text NOT NULL,
  is_masked boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Compliance checks
CREATE TABLE IF NOT EXISTS compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  driver_id uuid NOT NULL,
  check_type text NOT NULL,
  status text DEFAULT 'pending',
  result jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Background checks
CREATE TABLE IF NOT EXISTS background_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  driver_id uuid NOT NULL,
  status text DEFAULT 'initiated',
  provider text,
  result jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Outbound webhooks
CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  url text NOT NULL,
  event_types text[] DEFAULT '{}',
  secret text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES outbound_webhooks(id),
  event_type text NOT NULL,
  payload jsonb,
  response_code integer,
  delivered_at timestamptz DEFAULT now()
);

-- Disclosure records
CREATE TABLE IF NOT EXISTS disclosure_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  rider_id uuid NOT NULL,
  disclosure_type text NOT NULL,
  version text DEFAULT '1.0',
  accepted boolean DEFAULT false,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tenant airport geofences
CREATE TABLE IF NOT EXISTS tenant_airport_geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  airport_code text NOT NULL,
  zone_type text NOT NULL,
  zone_name text,
  coordinates jsonb,
  center_lat double precision,
  center_lng double precision,
  radius_meters integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ledger entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  trip_id uuid REFERENCES trips(id),
  event_type text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Skinning / branding
CREATE TABLE IF NOT EXISTS tenant_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  primary_color text DEFAULT '#000000',
  logo_url text,
  brand_name text,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- QR attribution
CREATE TABLE IF NOT EXISTS qr_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  code text UNIQUE NOT NULL,
  campaign text,
  target_url text,
  scan_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  trip_id uuid REFERENCES trips(id),
  rider_id uuid,
  reason text NOT NULL,
  status text DEFAULT 'open',
  resolution text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Rider disputes
CREATE TABLE IF NOT EXISTS rider_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  trip_id uuid REFERENCES trips(id),
  rider_id uuid NOT NULL,
  dispute_type text NOT NULL,
  description text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Split payments
CREATE TABLE IF NOT EXISTS split_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  trip_id uuid REFERENCES trips(id),
  payer_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Hourly bookings
CREATE TABLE IF NOT EXISTS hourly_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  rider_id uuid NOT NULL,
  driver_id uuid,
  hours integer NOT NULL DEFAULT 1,
  hourly_rate numeric(10,2) NOT NULL,
  status text DEFAULT 'pending',
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  rider_id uuid NOT NULL,
  pickup_time timestamptz NOT NULL,
  pickup_address text,
  dropoff_address text,
  vehicle_type text DEFAULT 'sedan',
  status text DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

-- Vehicle configs
CREATE TABLE IF NOT EXISTS vehicle_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  description text,
  base_fare numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Passenger needs
CREATE TABLE IF NOT EXISTS passenger_accessibility_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  rider_id uuid NOT NULL,
  need_type text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Approval requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  request_type text NOT NULL,
  entity_id uuid,
  status text DEFAULT 'pending',
  reviewer_id uuid,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- Fraud scores
CREATE TABLE IF NOT EXISTS fraud_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  score numeric(5,2) DEFAULT 0,
  factors jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Tenant analytics cache
CREATE TABLE IF NOT EXISTS tenant_analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  metric_name text NOT NULL,
  metric_value jsonb,
  period text DEFAULT 'daily',
  computed_at timestamptz DEFAULT now()
);

-- Create indexes for tenant_id on all new tables
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant ON tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_tenant ON driver_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_corporate_accounts_tenant ON corporate_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant ON ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_trip ON ledger_entries(trip_id);
CREATE INDEX IF NOT EXISTS idx_disputes_tenant ON disputes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_tenant ON compliance_checks(tenant_id);
