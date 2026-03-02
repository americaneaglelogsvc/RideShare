/*
  Independent Concurrency + Tenant Onboarding + Payout Settlement Gate

  Builds on 999_add_multi_tenancy.sql.

  1. driver_identities (global) + driver_profiles (tenant-scoped)
  2. tenant_domain_mappings (host -> tenant_id)
  3. tenant_onboarding (checklist + state machine)
  4. payment_providers (extensible enum table)
  5. payout settlement status on driver_payouts
*/

-- 1A. payment_providers (extensible enum table)
CREATE TABLE IF NOT EXISTS payment_providers (
  code  text PRIMARY KEY,
  name  text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO payment_providers (code, name)
VALUES ('paysurity', 'PaySurity')
ON CONFLICT (code) DO NOTHING;

-- 1B. tenant_domain_mappings (host -> tenant)
CREATE TABLE IF NOT EXISTS tenant_domain_mappings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  host       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_domain_mappings_host ON tenant_domain_mappings(host);

-- 2. driver_identities (global; one per human driver)
CREATE TABLE IF NOT EXISTS driver_identities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid NOT NULL UNIQUE,
  email         text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- 3. driver_profiles (tenant-scoped; one per identity per tenant)
CREATE TABLE IF NOT EXISTS driver_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id),
  driver_identity_id  uuid NOT NULL REFERENCES driver_identities(id),
  first_name          text,
  last_name           text,
  phone               text,
  address             text,
  rating              numeric(3,2) DEFAULT 0,
  total_trips         integer DEFAULT 0,
  status              text DEFAULT 'offline',
  is_active           boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (tenant_id, driver_identity_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_tenant ON driver_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_identity ON driver_profiles(driver_identity_id);

-- 4. Backfill: migrate existing drivers -> driver_identities + driver_profiles
DO $$
DECLARE
  r RECORD;
  new_identity_id uuid;
BEGIN
  FOR r IN SELECT * FROM drivers LOOP
    INSERT INTO driver_identities (id, auth_user_id, email)
    VALUES (r.id, r.id, COALESCE(r.email, 'unknown@legacy'))
    ON CONFLICT (auth_user_id) DO NOTHING;

    SELECT id INTO new_identity_id FROM driver_identities WHERE auth_user_id = r.id;

    INSERT INTO driver_profiles (
      tenant_id, driver_identity_id, first_name, last_name,
      phone, address, rating, total_trips, status, is_active
    )
    VALUES (
      r.tenant_id, new_identity_id, r.first_name, r.last_name,
      r.phone, r.address, r.rating, r.total_trips, r.status, r.is_active
    )
    ON CONFLICT (tenant_id, driver_identity_id) DO NOTHING;
  END LOOP;
END $$;

-- 5. tenant_onboarding
CREATE TYPE onboarding_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'STAFF_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS tenant_onboarding (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid NOT NULL REFERENCES tenants(id) UNIQUE,
  status                          onboarding_status DEFAULT 'DRAFT',

  -- Legal / Financial
  ach_debit_authorization_signed_at timestamptz,
  paid_first_required             boolean DEFAULT false,
  merchant_provider_code          text REFERENCES payment_providers(code),
  merchant_account_reference      text,
  tax_id_last4                    text CHECK (char_length(tax_id_last4) = 4 OR tax_id_last4 IS NULL),
  tax_id_document_url             text,
  business_registration_reference text,

  -- Branding
  primary_hex                     text,
  secondary_hex                   text,
  logo_svg_url                    text,
  app_icon_url                    text,
  terms_url                       text,

  -- Commercial Profile (staff-set)
  demo_duration_days              integer,
  intro_fee_cents                 integer,
  base_monthly_fee_cents_prepaid  integer,
  per_ride_fee_cents              integer,
  per_driver_fee_cents            integer,
  revenue_share_bps               integer,

  -- Workflow
  submitted_at                    timestamptz,
  approved_at                     timestamptz,
  approved_by_user_id             uuid,

  created_at                      timestamptz DEFAULT now(),
  updated_at                      timestamptz DEFAULT now()
);

-- 6. Payout settlement status
CREATE TYPE payout_settlement_status AS ENUM (
  'PENDING_BANK_SETTLEMENT',
  'BANK_SETTLED',
  'PAYOUT_INITIATED',
  'PAID',
  'FAILED'
);

ALTER TABLE driver_payouts
  ADD COLUMN IF NOT EXISTS settlement_status payout_settlement_status
    DEFAULT 'PENDING_BANK_SETTLEMENT';

UPDATE driver_payouts
  SET settlement_status = 'PENDING_BANK_SETTLEMENT'
  WHERE settlement_status IS NULL;
