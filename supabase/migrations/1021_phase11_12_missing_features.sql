-- Phase 11/12 Missing Features: Ratings, Messaging, Fleet, Documents, Split Pay, Hourly Bookings

-- §4.5/§5.7 Trip Ratings (bi-directional)
CREATE TABLE IF NOT EXISTS trip_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  rater_id UUID NOT NULL,
  rater_role TEXT NOT NULL CHECK (rater_role IN ('rider','driver')),
  ratee_id UUID NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON trip_ratings(ratee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_trip ON trip_ratings(trip_id);

ALTER TABLE trip_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ratings_tenant_iso ON trip_ratings
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Cached rating columns on profiles
DO $$ BEGIN
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS cached_rating NUMERIC(3,2) DEFAULT 5.00;
  ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- §4.6/§5.7 In-Trip Messaging
CREATE TABLE IF NOT EXISTS trip_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('rider','driver','system')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','location','eta_update','system')),
  content TEXT NOT NULL,
  masked_content TEXT,
  read_at TIMESTAMPTZ,
  read_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_trip ON trip_messages(trip_id, created_at);

ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_tenant_iso ON trip_messages
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §5.8 Fleet Owners
CREATE TABLE IF NOT EXISTS fleet_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  tax_id TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval','active','suspended','inactive')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_owners_tenant ON fleet_owners(tenant_id, status);

ALTER TABLE fleet_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY fleet_owners_tenant_iso ON fleet_owners
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Fleet Vehicles
CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_owner_id UUID NOT NULL REFERENCES fleet_owners(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  color TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  vin TEXT,
  category TEXT NOT NULL DEFAULT 'black_sedan' CHECK (category IN ('black_sedan','black_suv','black_ev')),
  insurance_expiry DATE,
  registration_expiry DATE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','in_use','maintenance','retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_owner ON fleet_vehicles(fleet_owner_id, status);

ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY fleet_vehicles_tenant_iso ON fleet_vehicles
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Fleet Driver Assignments
CREATE TABLE IF NOT EXISTS fleet_driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_owner_id UUID NOT NULL REFERENCES fleet_owners(id),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id),
  driver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  UNIQUE(vehicle_id, driver_id)
);

-- §5.1/§3.8 Driver Documents (OCR + Specialized Credentials)
CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  document_type TEXT NOT NULL CHECK (document_type IN (
    'drivers_license','vehicle_registration','insurance',
    'chauffeur_license','tsa_badge','nemt_certification','medical_card','background_check'
  )),
  file_url TEXT NOT NULL,
  file_key TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  ocr_confidence NUMERIC(4,3) DEFAULT 0,
  ocr_raw_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','needs_review','verified','rejected','expired')),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_docs ON driver_documents(driver_id, document_type, status);

ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY driver_docs_tenant_iso ON driver_documents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §4.3 Split Pay
CREATE TABLE IF NOT EXISTS split_pay_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  participant_id UUID,
  participant_email TEXT,
  participant_phone TEXT,
  amount_cents INT NOT NULL,
  share_type TEXT NOT NULL DEFAULT 'equal' CHECK (share_type IN ('equal','fixed_amount','percentage')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','paid','failed')),
  initiated_by UUID NOT NULL,
  responded_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_split_pay_trip ON split_pay_requests(trip_id);

ALTER TABLE split_pay_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY split_pay_tenant_iso ON split_pay_requests
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §4.1 Hourly Bookings
CREATE TABLE IF NOT EXISTS hourly_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  rider_id UUID NOT NULL,
  driver_id UUID,
  driver_category TEXT NOT NULL DEFAULT 'black_sedan',
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  duration_hours INT NOT NULL CHECK (duration_hours BETWEEN 2 AND 12),
  hourly_rate_cents INT NOT NULL,
  estimated_total_cents INT NOT NULL,
  overage_rate_cents_per_min INT NOT NULL DEFAULT 0,
  actual_duration_minutes INT,
  overage_minutes INT DEFAULT 0,
  actual_total_cents INT,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  special_instructions TEXT,
  preferred_driver_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hourly_bookings_tenant ON hourly_bookings(tenant_id, status, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_hourly_bookings_rider ON hourly_bookings(rider_id, created_at DESC);

ALTER TABLE hourly_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY hourly_bookings_tenant_iso ON hourly_bookings
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
