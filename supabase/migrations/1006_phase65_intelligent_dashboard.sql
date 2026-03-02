-- ============================================================================
-- Migration 1006: Phase 6.5 — The Intelligent Tenant-Admin Dashboard
-- Tables: vip_riders, vip_alerts, discount_codes, spill_over_referrals
-- Materialized Views: mv_tenant_fleet_utilization, mv_tenant_service_level,
--                     mv_tenant_revenue_summary, mv_vip_performance
-- Columns: tenant_onboarding gains self-service settings
-- ============================================================================

-- ── 1. VIP Riders (M9.8) ──────────────────────────────────────────────────
-- Tracks rider VIP status per tenant with lifetime value and retention data
CREATE TABLE IF NOT EXISTS vip_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rider_id TEXT NOT NULL,                          -- external rider identifier
  rider_name TEXT,
  rider_email TEXT,
  rider_phone TEXT,
  tier TEXT NOT NULL DEFAULT 'standard',            -- standard | silver | gold | platinum
  lifetime_value_cents INT NOT NULL DEFAULT 0,      -- total fare cents across all trips
  trip_count INT NOT NULL DEFAULT 0,
  last_trip_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_score NUMERIC(5,2) DEFAULT 100.0,       -- 0-100, recalculated by cron
  is_at_risk BOOLEAN NOT NULL DEFAULT FALSE,
  subsidy_received_cents INT NOT NULL DEFAULT 0,    -- total subsidies given to retain
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_vip_riders_tenant_rider ON vip_riders(tenant_id, rider_id);
CREATE INDEX idx_vip_riders_tier ON vip_riders(tenant_id, tier) WHERE tier != 'standard';
CREATE INDEX idx_vip_riders_at_risk ON vip_riders(tenant_id) WHERE is_at_risk = TRUE;

-- ── 2. VIP Alerts (M11.8) ─────────────────────────────────────────────────
-- Dashboard alert center for VIP tier maintenance and other operational alerts
CREATE TABLE IF NOT EXISTS vip_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,                         -- vip_at_risk | vip_downgrade | subsidy_budget_low | fulfillment_drop
  severity TEXT NOT NULL DEFAULT 'warning',          -- info | warning | critical
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  affected_riders JSONB DEFAULT '[]',               -- array of rider_ids
  affected_count INT NOT NULL DEFAULT 0,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_actioned BOOLEAN NOT NULL DEFAULT FALSE,
  actioned_at TIMESTAMPTZ,
  action_taken TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vip_alerts_tenant ON vip_alerts(tenant_id, created_at DESC);
CREATE INDEX idx_vip_alerts_unread ON vip_alerts(tenant_id) WHERE is_read = FALSE;

-- ── 3. Discount Codes (M11.8) ─────────────────────────────────────────────
-- One-time or multi-use discount codes for VIP incentives
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'fixed',       -- fixed | percentage
  discount_cents INT,                                -- for fixed type
  discount_percent NUMERIC(5,2),                     -- for percentage type (e.g. 15.00 = 15%)
  max_discount_cents INT,                            -- cap for percentage discounts
  target_rider_ids JSONB DEFAULT '[]',               -- specific riders, empty = all
  max_uses INT DEFAULT 1,
  current_uses INT NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,                                   -- 'system' | 'tenant_admin' | alert_id
  alert_id UUID REFERENCES vip_alerts(id),           -- linked alert if auto-generated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_discount_code_unique ON discount_codes(tenant_id, code);
CREATE INDEX idx_discount_codes_active ON discount_codes(tenant_id) WHERE is_active = TRUE;

-- ── 4. Spill-Over Referrals (M9.7) ────────────────────────────────────────
-- Tracks rides that one tenant couldn't fulfill, referred to another tenant's driver
CREATE TABLE IF NOT EXISTS spill_over_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  originating_tenant_id UUID NOT NULL REFERENCES tenants(id),
  fulfilling_tenant_id UUID NOT NULL REFERENCES tenants(id),
  trip_id UUID NOT NULL REFERENCES trips(id),
  rider_id TEXT,
  fare_cents INT NOT NULL,
  referral_fee_cents INT NOT NULL DEFAULT 0,         -- fee paid to originating tenant
  status TEXT NOT NULL DEFAULT 'pending',             -- pending | accepted | completed | expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_spillover_originating ON spill_over_referrals(originating_tenant_id, created_at DESC);
CREATE INDEX idx_spillover_fulfilling ON spill_over_referrals(fulfilling_tenant_id, created_at DESC);
CREATE UNIQUE INDEX idx_spillover_trip ON spill_over_referrals(trip_id);

-- ── 5. Tenant Onboarding — Self-Service Settings (M5.10) ──────────────────
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS max_subsidy_limit_cents INT DEFAULT 50000;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS vip_enrollment_threshold INT DEFAULT 5;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS vip_retention_days INT DEFAULT 30;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS driver_share_bps INT DEFAULT 10000;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS per_driver_fee_cents INT DEFAULT 0;

-- ── 6. Materialized Views for <200ms Dashboard Loads ──────────────────────

-- 6a. Fleet Utilization: % of time drivers are ON_TRIP vs AVAILABLE
-- Refreshed every 5 minutes by cron
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_fleet_utilization AS
SELECT
  t.tenant_id,
  t.tenant_id AS tid,
  COUNT(DISTINCT dp.id) AS total_drivers,
  COUNT(DISTINCT dp.id) FILTER (WHERE dp.status = 'on_trip') AS drivers_on_trip,
  COUNT(DISTINCT dp.id) FILTER (WHERE dp.status = 'online') AS drivers_available,
  COUNT(DISTINCT dp.id) FILTER (WHERE dp.status = 'offline') AS drivers_offline,
  CASE
    WHEN COUNT(DISTINCT dp.id) FILTER (WHERE dp.status IN ('online', 'on_trip')) > 0
    THEN ROUND(
      COUNT(DISTINCT dp.id) FILTER (WHERE dp.status = 'on_trip')::NUMERIC /
      COUNT(DISTINCT dp.id) FILTER (WHERE dp.status IN ('online', 'on_trip'))::NUMERIC * 100, 2
    )
    ELSE 0
  END AS utilization_pct,
  now() AS refreshed_at
FROM driver_profiles dp
JOIN tenants t ON t.id = dp.tenant_id
WHERE dp.is_active = TRUE
GROUP BY t.tenant_id
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_fleet_util_tenant ON mv_tenant_fleet_utilization(tenant_id);

-- 6b. Service Level: Avg time from request to acceptance (in seconds)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_service_level AS
SELECT
  tr.tenant_id,
  COUNT(*) AS total_trips_30d,
  COUNT(*) FILTER (WHERE tr.status = 'completed') AS completed_trips_30d,
  COUNT(*) FILTER (WHERE tr.status = 'requested') AS pending_trips_30d,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(tr.completed_at, now()) - tr.created_at
      ))
    ) FILTER (WHERE tr.status IN ('assigned', 'active', 'completed')),
    1
  ) AS avg_acceptance_seconds,
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE tr.status = 'completed')::NUMERIC /
      COUNT(*)::NUMERIC * 100, 2
    )
    ELSE 0
  END AS fulfillment_rate_pct,
  now() AS refreshed_at
FROM trips tr
WHERE tr.created_at >= (now() - INTERVAL '30 days')
GROUP BY tr.tenant_id
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_service_level_tenant ON mv_tenant_service_level(tenant_id);

-- 6c. Revenue Summary (per tenant, last 30 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_revenue_summary AS
SELECT
  ds.tenant_id,
  COUNT(*) AS settled_trips_30d,
  COALESCE(SUM(ds.gross_amount_cents), 0) AS gross_revenue_cents,
  COALESCE(SUM(ds.platform_fee_cents), 0) AS platform_fees_cents,
  COALESCE(SUM(ds.tenant_net_cents), 0) AS tenant_net_cents,
  COALESCE(SUM(ds.driver_payout_cents), 0) AS driver_payouts_cents,
  ROUND(
    COALESCE(AVG(ds.gross_amount_cents), 0), 0
  ) AS avg_fare_cents,
  now() AS refreshed_at
FROM distribution_splits ds
WHERE ds.settled_at >= (now() - INTERVAL '30 days')
  AND ds.status = 'settled'
GROUP BY ds.tenant_id
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_revenue_tenant ON mv_tenant_revenue_summary(tenant_id);

-- 6d. VIP Performance (per tenant)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_vip_performance AS
SELECT
  vr.tenant_id,
  COUNT(*) AS total_vips,
  COUNT(*) FILTER (WHERE vr.is_at_risk = TRUE) AS at_risk_vips,
  COUNT(*) FILTER (WHERE vr.tier = 'platinum') AS platinum_count,
  COUNT(*) FILTER (WHERE vr.tier = 'gold') AS gold_count,
  COUNT(*) FILTER (WHERE vr.tier = 'silver') AS silver_count,
  COALESCE(SUM(vr.lifetime_value_cents), 0) AS total_ltv_cents,
  COALESCE(SUM(vr.subsidy_received_cents), 0) AS total_subsidy_cents,
  CASE
    WHEN COALESCE(SUM(vr.subsidy_received_cents), 0) > 0
    THEN ROUND(
      SUM(vr.lifetime_value_cents)::NUMERIC /
      SUM(vr.subsidy_received_cents)::NUMERIC, 2
    )
    ELSE 0
  END AS subsidy_roi,
  ROUND(AVG(vr.retention_score), 2) AS avg_retention_score,
  now() AS refreshed_at
FROM vip_riders vr
WHERE vr.tier != 'standard'
GROUP BY vr.tenant_id
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_vip_perf_tenant ON mv_vip_performance(tenant_id);

-- ── 7. Refresh function for all dashboard materialized views ──────────────
CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_fleet_utilization;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_service_level;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_revenue_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vip_performance;
END;
$$;

-- ── 8. RPC: Get tenant dashboard map data (M9.9) ─────────────────────────
-- Returns driver positions for a tenant's operations map.
-- Privacy Lock: Only own tenant's drivers. Spill-over drivers are "ghost" until accepted.
CREATE OR REPLACE FUNCTION get_tenant_map_drivers(
  p_tenant_id UUID
)
RETURNS TABLE(
  driver_id UUID,
  driver_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT,
  is_ghost BOOLEAN,
  category TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Own tenant's drivers (full visibility)
  SELECT
    dp.id AS driver_id,
    COALESCE(dp.email, 'Driver') AS driver_name,
    dl.latitude::DOUBLE PRECISION AS lat,
    dl.longitude::DOUBLE PRECISION AS lng,
    dp.status,
    FALSE AS is_ghost,
    COALESCE(v.category, 'economy') AS category,
    dl.updated_at
  FROM driver_profiles dp
  JOIN driver_locations dl ON dl.driver_id = dp.id AND dl.tenant_id = dp.tenant_id
  LEFT JOIN vehicles v ON v.driver_id = dp.id
  WHERE dp.tenant_id = p_tenant_id
    AND dp.is_active = TRUE
    AND dl.updated_at >= (now() - INTERVAL '10 minutes')

  UNION ALL

  -- Spill-over drivers: ghost icons (no name, approximate location)
  SELECT
    sor.id AS driver_id,
    'Partner Driver' AS driver_name,
    dl.latitude::DOUBLE PRECISION AS lat,
    dl.longitude::DOUBLE PRECISION AS lng,
    'spill_over' AS status,
    TRUE AS is_ghost,
    'economy' AS category,
    dl.updated_at
  FROM spill_over_referrals sor
  JOIN trips t ON t.id = sor.trip_id
  JOIN driver_profiles dp ON dp.id = t.driver_id
  JOIN driver_locations dl ON dl.driver_id = dp.id AND dl.tenant_id = dp.tenant_id
  WHERE sor.originating_tenant_id = p_tenant_id
    AND sor.status = 'pending'
    AND dl.updated_at >= (now() - INTERVAL '10 minutes')

  ORDER BY updated_at DESC;
END;
$$;

-- ── 9. RPC: VIP maintenance — detect at-risk VIPs ─────────────────────────
CREATE OR REPLACE FUNCTION detect_at_risk_vips(
  p_tenant_id UUID,
  p_retention_days INT DEFAULT 30
)
RETURNS TABLE(
  vip_id UUID,
  rider_id TEXT,
  rider_name TEXT,
  tier TEXT,
  days_since_last_trip INT,
  lifetime_value_cents INT,
  retention_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update is_at_risk flag
  UPDATE vip_riders
  SET
    is_at_risk = TRUE,
    retention_score = GREATEST(0, retention_score - 10),
    updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND tier != 'standard'
    AND (last_trip_at IS NULL OR last_trip_at < (now() - (p_retention_days || ' days')::INTERVAL))
    AND is_at_risk = FALSE;

  RETURN QUERY
  SELECT
    vr.id AS vip_id,
    vr.rider_id,
    vr.rider_name,
    vr.tier,
    EXTRACT(DAY FROM (now() - COALESCE(vr.last_trip_at, vr.enrolled_at)))::INT AS days_since_last_trip,
    vr.lifetime_value_cents,
    vr.retention_score
  FROM vip_riders vr
  WHERE vr.tenant_id = p_tenant_id
    AND vr.is_at_risk = TRUE
  ORDER BY vr.lifetime_value_cents DESC;
END;
$$;
