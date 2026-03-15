/*
  1003_phase3_enterprise_scale.sql
  Phase 3: Enterprise Resilience & Global Scale

  1. tenant_webhooks: outbound webhook registrations per tenant
  2. tenant_api_keys: developer API keys per tenant
  3. webhook_delivery_log: delivery audit trail
  4. tax_summaries: annual 1099-K aggregation per driver identity
  5. refund_requests: multi-step refund orchestration
  6. system_metrics: observability snapshots
  7. PostGIS extension + spatial index on driver_locations
  8. circuit_breaker_state: payment gateway health tracking
*/

-- 1. Tenant webhook registrations
CREATE TABLE IF NOT EXISTS tenant_webhooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  url             text NOT NULL,
  secret          text NOT NULL,
  events          text[] NOT NULL DEFAULT '{"TRIP_COMPLETED","TRIP_CANCELLED"}',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_tenant_id ON tenant_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_active ON tenant_webhooks(tenant_id, is_active);
ALTER TABLE tenant_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant webhook access"
  ON tenant_webhooks FOR ALL TO authenticated USING (true);

-- 2. Tenant developer API keys
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  key_prefix      text NOT NULL,
  key_hash        text NOT NULL,
  label           text DEFAULT 'default',
  is_active       boolean DEFAULT true,
  last_used_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant_id ON tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_prefix ON tenant_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_active ON tenant_api_keys(tenant_id, is_active);
ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant API key access"
  ON tenant_api_keys FOR ALL TO authenticated USING (true);

-- 3. Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      uuid NOT NULL REFERENCES tenant_webhooks(id),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  event_type      text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  response_status integer,
  response_body   text,
  attempt         integer DEFAULT 1,
  delivered_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_tenant_id ON webhook_delivery_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_created_at ON webhook_delivery_log(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_webhook_id ON webhook_delivery_log(webhook_id);
ALTER TABLE webhook_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read webhook deliveries"
  ON webhook_delivery_log FOR SELECT TO authenticated USING (true);

-- 4. Tax summaries (1099-K readiness)
CREATE TABLE IF NOT EXISTS tax_summaries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year              integer NOT NULL,
  driver_identity_id    uuid NOT NULL REFERENCES driver_identities(id),
  tenant_id             uuid REFERENCES tenants(id),
  gross_earnings_cents  integer NOT NULL DEFAULT 0,
  platform_fees_cents   integer NOT NULL DEFAULT 0,
  net_earnings_cents    integer NOT NULL DEFAULT 0,
  trip_count            integer NOT NULL DEFAULT 0,
  refund_total_cents    integer NOT NULL DEFAULT 0,
  generated_at          timestamptz DEFAULT now(),
  UNIQUE(tax_year, driver_identity_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tax_summaries_year ON tax_summaries(tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_summaries_identity ON tax_summaries(driver_identity_id);
CREATE INDEX IF NOT EXISTS idx_tax_summaries_tenant ON tax_summaries(tenant_id);
ALTER TABLE tax_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read tax summaries"
  ON tax_summaries FOR ALL TO authenticated USING (true);

-- 5. Refund requests (multi-step orchestration)
CREATE TABLE IF NOT EXISTS refund_requests (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES tenants(id),
  trip_id                 uuid NOT NULL REFERENCES trips(id),
  payment_id              uuid REFERENCES payments(id),
  rider_id                uuid,
  amount_cents            integer NOT NULL,
  platform_fee_refundable boolean DEFAULT false,
  platform_fee_cents      integer NOT NULL DEFAULT 0,
  tenant_debit_cents      integer NOT NULL DEFAULT 0,
  rider_credit_cents      integer NOT NULL DEFAULT 0,
  status                  text DEFAULT 'PENDING',
  reason                  text,
  initiated_by            text,
  processed_at            timestamptz,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_tenant_id ON refund_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_trip_id ON refund_requests(trip_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON refund_requests(created_at);
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage refund requests"
  ON refund_requests FOR ALL TO authenticated USING (true);

-- 6. System metrics snapshots
CREATE TABLE IF NOT EXISTS system_metrics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name     text NOT NULL,
  metric_value    numeric NOT NULL DEFAULT 0,
  labels          jsonb DEFAULT '{}',
  recorded_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read metrics"
  ON system_metrics FOR SELECT TO authenticated USING (true);

-- 7. Circuit breaker state
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id              text PRIMARY KEY,
  service_name    text NOT NULL,
  state           text NOT NULL DEFAULT 'CLOSED',
  failure_count   integer DEFAULT 0,
  last_failure_at timestamptz,
  opened_at       timestamptz,
  half_open_at    timestamptz,
  updated_at      timestamptz DEFAULT now()
);

-- 8. PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to driver_locations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_locations' AND column_name = 'geom') THEN
    ALTER TABLE driver_locations ADD COLUMN geom geometry(Point, 4326);
  END IF;
END $$;

-- Backfill geometry from existing lat/lng
UPDATE driver_locations
SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE geom IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_driver_locations_geom ON driver_locations USING GIST(geom);

-- Create trigger to auto-update geom on insert/update
CREATE OR REPLACE FUNCTION update_driver_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_driver_location_geom ON driver_locations;
CREATE TRIGGER trg_driver_location_geom
  BEFORE INSERT OR UPDATE OF lat, lng ON driver_locations
  FOR EACH ROW EXECUTE FUNCTION update_driver_location_geom();

-- 9. Add tenant_id to driver_locations for fast tenant-scoped geo queries
ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_tenant_geom ON driver_locations USING GIST(geom) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_locations_tenant_id ON driver_locations(tenant_id);

-- 10. PostGIS RPC: find_nearest_drivers (tenant-scoped spatial query)
CREATE OR REPLACE FUNCTION find_nearest_drivers(
  p_tenant_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision DEFAULT 5000,
  p_category text DEFAULT 'black_sedan',
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  driver_profile_id uuid,
  distance_meters double precision,
  rating numeric,
  category text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dp.id AS driver_profile_id,
    ST_Distance(
      dl.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters,
    dp.rating,
    v.category
  FROM driver_profiles dp
  JOIN driver_locations dl ON dl.driver_id = dp.id AND dl.tenant_id = p_tenant_id
  JOIN vehicles v ON v.driver_id = dp.id
  WHERE dp.tenant_id = p_tenant_id
    AND dp.status = 'online'
    AND dp.is_active = true
    AND v.category = p_category
    AND dl.geom IS NOT NULL
    AND dl.updated_at > (now() - interval '5 minutes')
    AND ST_DWithin(
      dl.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
$$;
