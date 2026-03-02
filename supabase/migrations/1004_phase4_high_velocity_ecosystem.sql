-- ============================================================================
-- Migration 1004: Phase 4 — High-Velocity Ecosystem
-- Tables: compliance_documents, parallel_session_log, distribution_splits
-- Features: Tenant-siloed compliance vault, parallel ride monitoring,
--           atomic 3-way revenue distribution on settlement
-- ============================================================================

-- ── 1. Compliance Documents (M11.4) ────────────────────────────────────────
-- Tenant-siloed document vault; each document belongs to exactly one tenant+driver pair.
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_identity_id UUID NOT NULL REFERENCES driver_identities(id) ON DELETE CASCADE,
  driver_profile_id UUID NOT NULL,
  document_type TEXT NOT NULL,          -- e.g. 'chauffeur_license', 'insurance', 'vehicle_inspection'
  document_name TEXT NOT NULL,
  file_url TEXT,                        -- Supabase storage URL
  file_hash TEXT,                       -- SHA256 of uploaded file for integrity
  status TEXT NOT NULL DEFAULT 'pending_review',  -- pending_review | approved | rejected | expired
  issued_date DATE,
  expiry_date DATE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_docs_tenant ON compliance_documents(tenant_id, created_at DESC);
CREATE INDEX idx_compliance_docs_driver ON compliance_documents(driver_identity_id, tenant_id);
CREATE INDEX idx_compliance_docs_expiry ON compliance_documents(expiry_date) WHERE status = 'approved';
CREATE INDEX idx_compliance_docs_status ON compliance_documents(tenant_id, status);

-- Unique constraint: one active document per type per driver per tenant
CREATE UNIQUE INDEX idx_compliance_docs_unique_active
  ON compliance_documents(tenant_id, driver_profile_id, document_type)
  WHERE status IN ('pending_review', 'approved');

-- ── 2. Parallel Session Log (M9.3) ────────────────────────────────────────
-- Logs every detected instance where a driver_identity is ON_TRIP for 2+ tenants simultaneously.
-- This is a neutral monitoring table — no blocking action is taken.
CREATE TABLE IF NOT EXISTS parallel_session_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_identity_id UUID NOT NULL REFERENCES driver_identities(id) ON DELETE CASCADE,
  concurrent_trips JSONB NOT NULL DEFAULT '[]',   -- Array of { tenant_id, trip_id, status }
  tenant_count INT NOT NULL DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,                        -- Set when overlap ends
  duration_seconds INT,                           -- How long the overlap lasted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parallel_session_identity ON parallel_session_log(driver_identity_id, created_at DESC);
CREATE INDEX idx_parallel_session_active ON parallel_session_log(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_parallel_session_created ON parallel_session_log(created_at DESC);

-- ── 3. Distribution Splits (M5.4) ─────────────────────────────────────────
-- Atomic 3-way revenue split recorded upon bank settlement.
-- Invariant: platform_fee_cents + tenant_net_cents + driver_payout_cents = gross_amount_cents
CREATE TABLE IF NOT EXISTS distribution_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID,                                  -- driver_profile_id
  driver_identity_id UUID,                         -- for cross-tenant aggregation
  ledger_entry_id UUID,                            -- FK to ledger_entries
  settlement_transaction_id TEXT,                   -- PaySurity transaction reference
  gross_amount_cents INT NOT NULL,
  platform_fee_cents INT NOT NULL,
  tenant_net_cents INT NOT NULL,
  driver_payout_cents INT NOT NULL,
  fee_breakdown JSONB DEFAULT '{}',                -- { revenue_share_bps, per_ride_fee_cents, min_floor_cents, surge_multiplier }
  status TEXT NOT NULL DEFAULT 'settled',           -- settled | reversed | disputed
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_distribution_trip ON distribution_splits(trip_id);
CREATE INDEX idx_distribution_tenant ON distribution_splits(tenant_id, created_at DESC);
CREATE INDEX idx_distribution_driver ON distribution_splits(driver_identity_id, created_at DESC);
CREATE INDEX idx_distribution_settlement ON distribution_splits(settlement_transaction_id);

-- Constraint: exactly one split per trip (idempotency)
CREATE UNIQUE INDEX idx_distribution_unique_trip ON distribution_splits(trip_id);

-- Constraint: 3-way split must sum to gross
ALTER TABLE distribution_splits
  ADD CONSTRAINT chk_distribution_zero_sum
  CHECK (platform_fee_cents + tenant_net_cents + driver_payout_cents = gross_amount_cents);

-- ── 4. Compliance Hard-Gate RPC (M11.4) ────────────────────────────────────
-- Returns drivers eligible for dispatch: only those with ALL required documents
-- in 'approved' status and not expired for the given tenant.
CREATE OR REPLACE FUNCTION check_driver_compliance(
  p_tenant_id UUID,
  p_driver_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired_count INT;
  v_rejected_count INT;
BEGIN
  -- Check for any expired approved documents
  SELECT COUNT(*) INTO v_expired_count
  FROM compliance_documents
  WHERE tenant_id = p_tenant_id
    AND driver_profile_id = p_driver_profile_id
    AND status = 'approved'
    AND expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE;

  IF v_expired_count > 0 THEN
    -- Mark them as expired
    UPDATE compliance_documents
    SET status = 'expired', updated_at = now()
    WHERE tenant_id = p_tenant_id
      AND driver_profile_id = p_driver_profile_id
      AND status = 'approved'
      AND expiry_date IS NOT NULL
      AND expiry_date < CURRENT_DATE;

    RETURN FALSE;
  END IF;

  -- Check for rejected documents
  SELECT COUNT(*) INTO v_rejected_count
  FROM compliance_documents
  WHERE tenant_id = p_tenant_id
    AND driver_profile_id = p_driver_profile_id
    AND status = 'rejected';

  IF v_rejected_count > 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- ── 5. Detect Parallel Sessions RPC (M9.3) ────────────────────────────────
-- Returns all driver_identities currently ON_TRIP for 2+ tenants simultaneously.
CREATE OR REPLACE FUNCTION detect_parallel_sessions()
RETURNS TABLE(
  identity_id UUID,
  tenant_count BIGINT,
  active_trips JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.driver_identity_id AS identity_id,
    COUNT(DISTINCT dp.tenant_id) AS tenant_count,
    jsonb_agg(jsonb_build_object(
      'tenant_id', dp.tenant_id,
      'profile_id', dp.id,
      'status', dp.status,
      'trip_id', t.id
    )) AS active_trips
  FROM driver_profiles dp
  JOIN trips t ON t.driver_id = dp.id
    AND t.tenant_id = dp.tenant_id
    AND t.status IN ('assigned', 'active')
  WHERE dp.status IN ('en_route_pickup', 'at_pickup', 'en_route_dropoff', 'busy', 'on_trip')
    AND dp.is_active = TRUE
  GROUP BY dp.driver_identity_id
  HAVING COUNT(DISTINCT dp.tenant_id) >= 2;
END;
$$;

-- ── 6. Enhanced find_nearest_drivers for Compliance Gate (M7.2 + M11.4) ───
-- Overwrite the Phase 3 version to also enforce compliance hard-gate.
CREATE OR REPLACE FUNCTION find_nearest_drivers(
  p_tenant_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION DEFAULT 5000,
  p_category TEXT DEFAULT 'economy',
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  driver_profile_id UUID,
  distance_meters DOUBLE PRECISION,
  rating NUMERIC,
  category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id AS driver_profile_id,
    ST_Distance(
      dl.geom,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters,
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
      p_radius_meters
    )
    AND dl.updated_at >= (now() - INTERVAL '5 minutes')
    -- M11.4 Compliance Hard-Gate: exclude drivers with expired/rejected documents
    AND check_driver_compliance(p_tenant_id, dp.id) = TRUE
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;
