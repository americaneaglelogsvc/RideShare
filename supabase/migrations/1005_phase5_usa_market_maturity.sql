-- ============================================================================
-- Migration 1005: Phase 5 — USA Market Maturity & Global Resilience
-- Tables: geo_zones, dispute_cases, consent_records, idempotency_keys
-- Features: Mile-based PostGIS, polygon pricing zones, chargeback orchestration,
--           cryptographic consent, PII auto-masking, idempotency enforcement
-- ============================================================================

-- ── 1. Geo Zones (M7.3) ───────────────────────────────────────────────────
-- PostGIS polygon-based pricing zones (e.g., "Manhattan Premium", "Brooklyn Standard")
CREATE TABLE IF NOT EXISTS geo_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  zone_type TEXT NOT NULL DEFAULT 'standard',   -- standard | premium | airport | surge
  boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,   -- PostGIS polygon
  price_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  per_mile_rate_cents INT,                       -- Override per-mile rate if set
  base_fare_override_cents INT,                  -- Override base fare if set
  surge_floor NUMERIC(3,2) DEFAULT 1.0,          -- Minimum surge in this zone
  surge_cap NUMERIC(3,2) DEFAULT 2.0,            -- Maximum surge in this zone
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geo_zones_tenant ON geo_zones(tenant_id) WHERE is_active = TRUE;
CREATE INDEX idx_geo_zones_boundary ON geo_zones USING GIST(boundary);

-- ── 2. Dispute Cases (M5.5) ───────────────────────────────────────────────
-- Chargeback & dispute orchestration for PaySurity events
CREATE TABLE IF NOT EXISTS dispute_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL,
  transaction_id TEXT NOT NULL,                   -- PaySurity transaction reference
  driver_id UUID,
  rider_id TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',       -- initiated | evidence_submitted | won | lost | expired
  dispute_type TEXT NOT NULL DEFAULT 'chargeback', -- chargeback | refund_dispute | fraud
  disputed_amount_cents INT NOT NULL,
  original_fare_cents INT NOT NULL,
  reason TEXT,
  evidence_package JSONB DEFAULT '{}',            -- GPS traces, timestamps, trip data
  evidence_submitted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  paysurity_dispute_id TEXT,                      -- External dispute ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_tenant ON dispute_cases(tenant_id, created_at DESC);
CREATE INDEX idx_dispute_status ON dispute_cases(status) WHERE status IN ('initiated', 'evidence_submitted');
CREATE INDEX idx_dispute_trip ON dispute_cases(trip_id);
CREATE UNIQUE INDEX idx_dispute_unique_transaction ON dispute_cases(transaction_id);

-- Add disputed_balance_cents to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS disputed_balance_cents INT DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pending_balance_cents INT DEFAULT 0;

-- ── 3. Consent Records (M12.3) ───────────────────────────────────────────
-- Cryptographic consent/signature records for driver-tenant agreements
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_identity_id UUID NOT NULL REFERENCES driver_identities(id) ON DELETE CASCADE,
  driver_profile_id UUID NOT NULL,
  document_type TEXT NOT NULL,                    -- service_agreement | privacy_policy | tos | nda
  document_version TEXT NOT NULL,                 -- e.g., "v2.1"
  document_hash TEXT NOT NULL,                    -- SHA256 of the document content at signing time
  signature_hash TEXT NOT NULL,                   -- SHA256(identity_id + document_hash + signed_at)
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,                         -- NULL = no expiry
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_tenant ON consent_records(tenant_id, driver_identity_id);
CREATE INDEX idx_consent_driver ON consent_records(driver_identity_id, document_type);
CREATE INDEX idx_consent_active ON consent_records(tenant_id, driver_profile_id)
  WHERE revoked_at IS NULL;

-- ── 4. Idempotency Keys (M1.3) ───────────────────────────────────────────
-- Stores idempotency keys for payment/distribution POST requests
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  tenant_id UUID,
  endpoint TEXT NOT NULL,                         -- e.g., '/payments/process', '/distribution/settle'
  request_hash TEXT NOT NULL,                     -- SHA256 of request body
  response_status INT,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE UNIQUE INDEX idx_idempotency_unique ON idempotency_keys(idempotency_key, endpoint);
CREATE INDEX idx_idempotency_expiry ON idempotency_keys(expires_at);

-- Cleanup function: delete expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < now();
END;
$$;

-- ── 5. Update find_nearest_drivers to use MILES (USA Localization) ────────
-- p_radius_miles replaces p_radius_meters; conversion: miles * 1609.34 = meters
DROP FUNCTION IF EXISTS find_nearest_drivers(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INT);
CREATE OR REPLACE FUNCTION find_nearest_drivers(
  p_tenant_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_miles DOUBLE PRECISION DEFAULT 5.0,
  p_category TEXT DEFAULT 'economy',
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  driver_profile_id UUID,
  distance_meters DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION,
  rating NUMERIC,
  category TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_radius_meters DOUBLE PRECISION;
BEGIN
  -- USA Localization: convert miles to meters for PostGIS spatial index
  v_radius_meters := p_radius_miles * 1609.34;

  RETURN QUERY
  SELECT
    dp.id AS driver_profile_id,
    ST_Distance(
      dl.geom,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters,
    ST_Distance(
      dl.geom,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1609.34 AS distance_miles,
    dp.rating,
    v.category
  FROM driver_profiles dp
  JOIN driver_locations dl ON dl.driver_id = dp.id AND dl.tenant_id = dp.tenant_id
  LEFT JOIN vehicles v ON v.driver_id = dp.id AND v.category = p_category
  WHERE dp.tenant_id = p_tenant_id
    AND dp.status = 'online'
    AND dp.is_active = TRUE
    AND dl.geom IS NOT NULL
    AND ST_DWithin(
      dl.geom,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      v_radius_meters
    )
    AND dl.updated_at >= (now() - INTERVAL '5 minutes')
    -- M11.4 Compliance Hard-Gate
    AND check_driver_compliance(p_tenant_id, dp.id) = TRUE
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;

-- ── 6. Geo-Zone Lookup RPC ───────────────────────────────────────────────
-- Given a lat/lng, find which pricing zone(s) contain that point.
CREATE OR REPLACE FUNCTION find_geo_zone(
  p_tenant_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS TABLE(
  zone_id UUID,
  zone_name TEXT,
  zone_type TEXT,
  price_multiplier NUMERIC,
  per_mile_rate_cents INT,
  base_fare_override_cents INT,
  surge_floor NUMERIC,
  surge_cap NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gz.id AS zone_id,
    gz.zone_name,
    gz.zone_type,
    gz.price_multiplier,
    gz.per_mile_rate_cents,
    gz.base_fare_override_cents,
    gz.surge_floor,
    gz.surge_cap
  FROM geo_zones gz
  WHERE gz.tenant_id = p_tenant_id
    AND gz.is_active = TRUE
    AND ST_Covers(
      gz.boundary,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    )
  ORDER BY gz.zone_type DESC  -- premium zones take priority
  LIMIT 1;
END;
$$;

-- ── 7. Driver Density per Square Mile RPC (for dynamic surge) ─────────────
CREATE OR REPLACE FUNCTION get_driver_density_per_sq_mile(
  p_tenant_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_miles DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE(
  online_drivers BIGINT,
  area_sq_miles DOUBLE PRECISION,
  drivers_per_sq_mile DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_radius_meters DOUBLE PRECISION;
  v_count BIGINT;
  v_area DOUBLE PRECISION;
BEGIN
  v_radius_meters := p_radius_miles * 1609.34;
  v_area := 3.14159 * p_radius_miles * p_radius_miles;

  SELECT COUNT(*) INTO v_count
  FROM driver_profiles dp
  JOIN driver_locations dl ON dl.driver_id = dp.id AND dl.tenant_id = dp.tenant_id
  WHERE dp.tenant_id = p_tenant_id
    AND dp.status = 'online'
    AND dp.is_active = TRUE
    AND dl.geom IS NOT NULL
    AND ST_DWithin(
      dl.geom,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      v_radius_meters
    )
    AND dl.updated_at >= (now() - INTERVAL '5 minutes');

  RETURN QUERY SELECT v_count, v_area,
    CASE WHEN v_area > 0 THEN v_count::DOUBLE PRECISION / v_area ELSE 0 END;
END;
$$;

-- ── 8. PII Auto-Masking for trips older than 2 years (M12.3) ─────────────
CREATE OR REPLACE FUNCTION mask_old_trip_pii()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE trips
  SET
    pickup_address = '*** MASKED ***',
    dropoff_address = '*** MASKED ***',
    special_instructions = NULL
  WHERE completed_at < (now() - INTERVAL '2 years')
    AND pickup_address != '*** MASKED ***'
    AND status = 'completed';

  -- Mask rider info in ride_offers older than 2 years
  UPDATE ride_offers
  SET
    rider_name = '*** MASKED ***',
    rider_phone = '*** MASKED ***',
    pickup_address = '*** MASKED ***',
    dropoff_address = '*** MASKED ***'
  WHERE created_at < (now() - INTERVAL '2 years')
    AND rider_name != '*** MASKED ***';
END;
$$;
