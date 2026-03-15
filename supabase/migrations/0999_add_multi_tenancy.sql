/*
  Multi-tenancy foundations

  - Adds a tenants table
  - Adds tenant_id to existing domain tables
  - Backfills existing rows to a default legacy tenant

  NOTE: This is intended as a non-breaking migration for the current Supabase-backed scaffolding.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

INSERT INTO tenants (name)
VALUES ('legacy-default')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  legacy_tenant_id uuid;
BEGIN
  SELECT id INTO legacy_tenant_id FROM tenants WHERE name = 'legacy-default';

  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE ride_offers ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE riders ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE ratings ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE airport_queues ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE driver_payouts ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE payment_refunds ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE saved_payment_methods ADD COLUMN IF NOT EXISTS tenant_id uuid;
  ALTER TABLE driver_bank_accounts ADD COLUMN IF NOT EXISTS tenant_id uuid;

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

ALTER TABLE drivers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE driver_locations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE trips ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ride_offers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE riders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE quotes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ratings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE airport_queues ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE driver_payouts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payment_refunds ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE saved_payment_methods ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE driver_bank_accounts ALTER COLUMN tenant_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE drivers ADD CONSTRAINT drivers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE vehicles ADD CONSTRAINT vehicles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trips ADD CONSTRAINT trips_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ride_offers ADD CONSTRAINT ride_offers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE riders ADD CONSTRAINT riders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE quotes ADD CONSTRAINT quotes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ratings ADD CONSTRAINT ratings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE airport_queues ADD CONSTRAINT airport_queues_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE driver_payouts ADD CONSTRAINT driver_payouts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payment_refunds ADD CONSTRAINT payment_refunds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE saved_payment_methods ADD CONSTRAINT saved_payment_methods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE driver_bank_accounts ADD CONSTRAINT driver_bank_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_tenant_id ON driver_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_tenant_id ON trips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ride_offers_tenant_id ON ride_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_riders_tenant_id ON riders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ratings_tenant_id ON ratings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_airport_queues_tenant_id ON airport_queues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_tenant_id ON driver_payouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_tenant_id ON payment_refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_tenant_id ON saved_payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_bank_accounts_tenant_id ON driver_bank_accounts(tenant_id);
