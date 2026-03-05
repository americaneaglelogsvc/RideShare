-- Migration 1025: trip_adjustments table + closed status + min-wage floor
-- Supports: extra_stop, mess_fee, route_deviation, min_wage_supplement
-- Adds: 'closed' as final financial-reconciliation-complete trip status

-- ─── 1. Add 'closed' to trip status ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'trip_status_enum' AND e.enumlabel = 'closed'
  ) THEN
    -- If trips.status is a TEXT column (not enum), just add check constraint
    NULL;
  END IF;
END $$;

-- Add closed_at timestamp to trips
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS closed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by          TEXT,
  ADD COLUMN IF NOT EXISTS adjustment_total_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_fare_cents   INTEGER,
  ADD COLUMN IF NOT EXISTS min_wage_supplement_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trip_duration_minutes INTEGER;

-- Update status check to allow 'closed'
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('requested','assigned','active','completed','cancelled','closed'));

-- ─── 2. trip_adjustments table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_adjustments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL,
  adjustment_type  TEXT NOT NULL,
  description      TEXT NOT NULL,
  amount_cents     INTEGER NOT NULL DEFAULT 0,
  applied_by       TEXT NOT NULL DEFAULT 'system',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT trip_adjustments_type_check CHECK (
    adjustment_type IN (
      'extra_stop',
      'mess_fee',
      'damage_fee',
      'route_deviation',
      'min_wage_supplement',
      'wait_time',
      'no_show_fee',
      'toll',
      'gratuity',
      'discount'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_trip_adjustments_trip   ON trip_adjustments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_adjustments_tenant ON trip_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trip_adjustments_type   ON trip_adjustments(adjustment_type);

-- ─── 3. RLS on trip_adjustments ──────────────────────────────────────────────
ALTER TABLE trip_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_trip_adjustments" ON trip_adjustments;
CREATE POLICY "tenant_isolation_trip_adjustments"
  ON trip_adjustments
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS "uwd_super_admin_trip_adjustments" ON trip_adjustments;
CREATE POLICY "uwd_super_admin_trip_adjustments"
  ON trip_adjustments
  USING (
    current_setting('app.current_role', true) IN (
      'uwd_super_admin', 'uwd_sub_super_admin', 'uwd_ops'
    )
  );

-- ─── 4. tenant_pricing_policies: add min_wage_cents_per_hour if missing ──────
ALTER TABLE tenant_pricing_policies
  ADD COLUMN IF NOT EXISTS min_wage_cents_per_hour INTEGER NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS extra_stop_fee_cents    INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS mess_fee_cents          INTEGER NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS damage_fee_cents        INTEGER NOT NULL DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS route_deviation_pct     INTEGER NOT NULL DEFAULT 15;

-- ─── 5. Ledger event types for adjustments ───────────────────────────────────
-- (ledger_events table may store event_type as TEXT — just adding index)
CREATE INDEX IF NOT EXISTS idx_ledger_events_type
  ON ledger_events(event_type)
  WHERE event_type LIKE 'TRIP_%';

-- ─── 6. audit view: closed trips with adjustments ────────────────────────────
CREATE OR REPLACE VIEW v_closed_trips_audit AS
SELECT
  t.id                         AS trip_id,
  t.tenant_id,
  t.rider_id,
  t.driver_id,
  t.status,
  t.fare_cents                 AS quoted_fare_cents,
  t.final_fare_cents,
  t.adjustment_total_cents,
  t.min_wage_supplement_cents,
  t.net_payout_cents,
  t.commission_cents,
  t.trip_duration_minutes,
  t.pickup_address,
  t.dropoff_address,
  t.created_at                 AS booked_at,
  t.closed_at,
  t.closed_by,
  COALESCE(
    json_agg(
      json_build_object(
        'type',        a.adjustment_type,
        'description', a.description,
        'amount_cents',a.amount_cents,
        'applied_by',  a.applied_by,
        'created_at',  a.created_at
      )
    ) FILTER (WHERE a.id IS NOT NULL),
    '[]'::json
  )                            AS adjustments
FROM trips t
LEFT JOIN trip_adjustments a ON a.trip_id = t.id
WHERE t.status = 'closed'
GROUP BY t.id;

COMMENT ON VIEW v_closed_trips_audit IS
  'Audit view: all closed trips with full adjustment breakdown. '
  'Accessible to uwd_super_admin and tenant_admin via RLS bypass.';
