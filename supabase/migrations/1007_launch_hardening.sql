-- ============================================================================
-- Migration 1007: Final Launch Hardening
-- M1.5: Atomic trip assignment with FOR UPDATE row-level locking
-- M5.11: Referral distribution 4-way split table + marketplace surcharge
-- M9.10: System health metrics tracking
-- ============================================================================

-- ── 1. M1.5: Atomic Trip Assignment RPC (FOR UPDATE) ──────────────────────
-- Prevents two drivers from accepting the same trip at the exact same millisecond.
-- Uses SELECT ... FOR UPDATE SKIP LOCKED to guarantee exactly one winner.
CREATE OR REPLACE FUNCTION atomic_assign_trip(
  p_tenant_id UUID,
  p_trip_id UUID,
  p_driver_id UUID
)
RETURNS TABLE(
  assigned BOOLEAN,
  trip_id UUID,
  trip_status TEXT,
  previous_driver_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip RECORD;
BEGIN
  -- Acquire exclusive row lock — blocks concurrent acceptors
  SELECT t.id, t.status, t.driver_id
  INTO v_trip
  FROM trips t
  WHERE t.id = p_trip_id
    AND t.tenant_id = p_tenant_id
  FOR UPDATE SKIP LOCKED;

  -- If row is already locked by another transaction, SKIP LOCKED returns nothing
  IF v_trip IS NULL THEN
    RETURN QUERY SELECT FALSE, p_trip_id, 'locked'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check trip is still assignable
  IF v_trip.status != 'requested' OR v_trip.driver_id IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_trip.id, v_trip.status, v_trip.driver_id;
    RETURN;
  END IF;

  -- Atomic assignment — single UPDATE within the locked row
  UPDATE trips
  SET driver_id = p_driver_id,
      status = 'assigned'
  WHERE id = p_trip_id
    AND tenant_id = p_tenant_id;

  RETURN QUERY SELECT TRUE, p_trip_id, 'assigned'::TEXT, NULL::UUID;
END;
$$;

-- ── 2. M5.11: Referral Distribution Splits ────────────────────────────────
-- 4-way split for subsidized VIP Spill-Over rides:
--   1. Platform fee (from gross, applied FIRST)
--   2. Origin tenant referral fee
--   3. Fulfilling tenant net
--   4. Driver payout
-- Plus marketplace surcharge credited to UrWay platform account
CREATE TABLE IF NOT EXISTS referral_distribution_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spill_over_id UUID NOT NULL REFERENCES spill_over_referrals(id),
  trip_id UUID NOT NULL REFERENCES trips(id),
  originating_tenant_id UUID NOT NULL REFERENCES tenants(id),
  fulfilling_tenant_id UUID NOT NULL REFERENCES tenants(id),
  driver_id UUID,
  gross_fare_cents INT NOT NULL,
  platform_fee_cents INT NOT NULL,
  referral_fee_cents INT NOT NULL,
  marketplace_surcharge_cents INT NOT NULL DEFAULT 0,
  fulfilling_tenant_net_cents INT NOT NULL,
  driver_payout_cents INT NOT NULL,
  subsidy_debit_cents INT NOT NULL DEFAULT 0,
  fee_breakdown JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ref_dist_originating ON referral_distribution_splits(originating_tenant_id, created_at DESC);
CREATE INDEX idx_ref_dist_fulfilling ON referral_distribution_splits(fulfilling_tenant_id, created_at DESC);
CREATE UNIQUE INDEX idx_ref_dist_trip ON referral_distribution_splits(trip_id);

-- ── 3. M9.10: System Health Pulse table ───────────────────────────────────
-- Lightweight snapshots for the /health/detailed internal endpoint
CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  db_pool_active INT NOT NULL DEFAULT 0,
  db_pool_idle INT NOT NULL DEFAULT 0,
  db_pool_max INT NOT NULL DEFAULT 0,
  db_pool_saturation_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  socket_latency_ms INT NOT NULL DEFAULT 0,
  agent_response_time_ms INT NOT NULL DEFAULT 0,
  active_trips INT NOT NULL DEFAULT 0,
  active_drivers INT NOT NULL DEFAULT 0,
  error_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  alerts JSONB DEFAULT '[]',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_snapshots_recorded ON system_health_snapshots(recorded_at DESC);

-- Auto-cleanup: keep only 7 days of snapshots
CREATE OR REPLACE FUNCTION cleanup_old_health_snapshots()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM system_health_snapshots
  WHERE recorded_at < (now() - INTERVAL '7 days');
END;
$$;

-- ── 4. Add marketplace_surcharge_bps to tenant_onboarding ─────────────────
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS marketplace_surcharge_bps INT DEFAULT 200;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS referral_fee_bps INT DEFAULT 300;
