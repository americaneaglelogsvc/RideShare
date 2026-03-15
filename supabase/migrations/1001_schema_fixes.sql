/*
  1001_schema_fixes.sql
  Fixes G2, G5, G13, G14, G19, G23 from the UWD Grand Audit.

  1. tenants: add missing columns (slug, owner_email, owner_name, is_active, is_suspended)
  2. trips: drop NOT NULL on driver_id (allow trip creation before driver assignment)
  3. driver_profiles: add email column
  4. driver_identities: add suspension fields
  5. tenant_onboarding: add paysurity_merchant_id and pricing fields
  6. ledger_entries: create table
  7. RLS policies: add tenant_id filtering
*/

-- 1. Fix tenants table (G2): add columns expected by tenant.service.ts
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_email text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Backfill existing tenants
UPDATE tenants SET slug = name, is_active = true WHERE slug IS NULL;

-- 2. Fix trips.driver_id NOT NULL constraint (G5)
ALTER TABLE trips ALTER COLUMN driver_id DROP NOT NULL;

-- 3. Add email to driver_profiles (G23)
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS email text;

-- 4. Add suspension fields to driver_identities (for kill-switch M8)
ALTER TABLE driver_identities ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE driver_identities ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE driver_identities ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 5. Add paysurity_merchant_id and pricing fields to tenant_onboarding (G19, M5.1)
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS paysurity_merchant_id text;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS min_platform_fee_cents integer DEFAULT 250;

-- Ensure pricing columns exist (some may already be present from 1000)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_onboarding' AND column_name = 'revenue_share_bps') THEN
    ALTER TABLE tenant_onboarding ADD COLUMN revenue_share_bps integer DEFAULT 500;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_onboarding' AND column_name = 'per_ride_fee_cents') THEN
    ALTER TABLE tenant_onboarding ADD COLUMN per_ride_fee_cents integer DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_onboarding' AND column_name = 'base_monthly_fee_cents_prepaid') THEN
    ALTER TABLE tenant_onboarding ADD COLUMN base_monthly_fee_cents_prepaid integer DEFAULT 0;
  END IF;
END $$;

-- 6. Create ledger_entries table (G13)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  trip_id         uuid REFERENCES trips(id),
  driver_id       uuid,
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  fare_cents      integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  tenant_net_cents   integer NOT NULL DEFAULT 0,
  driver_payout_cents integer NOT NULL DEFAULT 0,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_id ON ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_trip_id ON ledger_entries(trip_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_event_type ON ledger_entries(event_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read all ledger entries"
  ON ledger_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- 7. Update RLS policies to include tenant_id (G14)
-- Drop old policies and create tenant-aware ones

-- drivers table
DROP POLICY IF EXISTS "Drivers can read own data" ON drivers;
CREATE POLICY "Drivers can read own data within tenant"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR tenant_id IN (
    SELECT dp.tenant_id FROM driver_profiles dp
    JOIN driver_identities di ON dp.driver_identity_id = di.id
    WHERE di.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Drivers can update own data" ON drivers;
CREATE POLICY "Drivers can update own data within tenant"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR tenant_id IN (
    SELECT dp.tenant_id FROM driver_profiles dp
    JOIN driver_identities di ON dp.driver_identity_id = di.id
    WHERE di.auth_user_id = auth.uid()
  ));

-- driver_profiles table
DROP POLICY IF EXISTS "Profiles scoped to identity" ON driver_profiles;
CREATE POLICY "Profiles scoped to identity"
  ON driver_profiles
  FOR SELECT
  TO authenticated
  USING (
    driver_identity_id IN (
      SELECT id FROM driver_identities WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Profiles update scoped to identity" ON driver_profiles;
CREATE POLICY "Profiles update scoped to identity"
  ON driver_profiles
  FOR UPDATE
  TO authenticated
  USING (
    driver_identity_id IN (
      SELECT id FROM driver_identities WHERE auth_user_id = auth.uid()
    )
  );

-- trips table: add tenant scope
DROP POLICY IF EXISTS "Drivers can read own trips" ON trips;
CREATE POLICY "Drivers can read own trips within tenant"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT dp.id FROM driver_profiles dp
      JOIN driver_identities di ON dp.driver_identity_id = di.id
      WHERE di.auth_user_id = auth.uid()
    )
    OR driver_id IS NULL
  );

-- ride_offers table: add tenant scope
DROP POLICY IF EXISTS "Drivers can read own offers" ON ride_offers;
CREATE POLICY "Drivers can read own offers within tenant"
  ON ride_offers
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT dp.id FROM driver_profiles dp
      JOIN driver_identities di ON dp.driver_identity_id = di.id
      WHERE di.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Drivers can update own offers" ON ride_offers;
CREATE POLICY "Drivers can update own offers within tenant"
  ON ride_offers
  FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT dp.id FROM driver_profiles dp
      JOIN driver_identities di ON dp.driver_identity_id = di.id
      WHERE di.auth_user_id = auth.uid()
    )
  );
