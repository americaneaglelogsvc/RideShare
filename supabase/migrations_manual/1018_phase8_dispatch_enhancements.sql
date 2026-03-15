-- Phase 8: Dispatch Enhancements (§6.2–6.7)
-- GrabBoard, Airport Queue 2.0, Destination-Aware, Preferred Driver, Blacklists, Scheduled Rides

-- §6.3 Airport Queue 2.0
CREATE TABLE IF NOT EXISTS airport_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  driver_id UUID NOT NULL,
  airport_code TEXT NOT NULL,
  zone TEXT NOT NULL DEFAULT 'staging',
  status TEXT NOT NULL DEFAULT 'prequeue' CHECK (status IN ('prequeue','active','dispatched','left','expired')),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airport_queue_tenant_airport ON airport_queue(tenant_id, airport_code, status);
CREATE INDEX IF NOT EXISTS idx_airport_queue_driver ON airport_queue(driver_id, status);

ALTER TABLE airport_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY airport_queue_tenant_iso ON airport_queue
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §6.4 Destination-Aware Matching
CREATE TABLE IF NOT EXISTS driver_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  dest_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  active_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, tenant_id)
);

ALTER TABLE driver_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY driver_dest_tenant_iso ON driver_destinations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §6.5 Preferred Driver
CREATE TABLE IF NOT EXISTS preferred_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rider_id, driver_id, tenant_id)
);

ALTER TABLE preferred_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY pref_driver_tenant_iso ON preferred_drivers
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §6.6 Blacklists + Mutual Block
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_lookup ON user_blocks(tenant_id, blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_reverse ON user_blocks(tenant_id, blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_blocks_tenant_iso ON user_blocks
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §6.7 Scheduled Rides
CREATE TABLE IF NOT EXISTS scheduled_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  rider_id UUID NOT NULL,
  driver_id UUID,
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  scheduled_at TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL DEFAULT 'standard',
  estimated_fare_cents INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dispatching','assigned','completed','cancelled')),
  dispatched_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_rides_pending ON scheduled_rides(tenant_id, status, scheduled_at);

ALTER TABLE scheduled_rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY sched_rides_tenant_iso ON scheduled_rides
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §6.2 GrabBoard RPC (returns unclaimed trips near a point)
CREATE OR REPLACE FUNCTION grab_board_trips(
  p_tenant_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 16093,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  pickup_address TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_address TEXT,
  estimated_fare_cents INT,
  category TEXT,
  created_at TIMESTAMPTZ,
  distance_m DOUBLE PRECISION
) LANGUAGE sql STABLE AS $$
  SELECT
    t.id, t.pickup_address, t.pickup_lat, t.pickup_lng,
    t.dropoff_address, t.estimated_fare_cents, t.category, t.created_at,
    ST_DistanceSphere(
      ST_MakePoint(t.pickup_lng, t.pickup_lat),
      ST_MakePoint(p_lng, p_lat)
    ) AS distance_m
  FROM trips t
  WHERE t.tenant_id = p_tenant_id
    AND t.status = 'requested'
    AND t.driver_id IS NULL
    AND ST_DistanceSphere(
      ST_MakePoint(t.pickup_lng, t.pickup_lat),
      ST_MakePoint(p_lng, p_lat)
    ) <= p_radius_m
  ORDER BY t.estimated_fare_cents DESC NULLS LAST
  LIMIT p_limit;
$$;
