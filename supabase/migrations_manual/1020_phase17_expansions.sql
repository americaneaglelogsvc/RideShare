-- Phase 17 Expansions: Flight Awareness (§19), Events Engine (§22), Marketplace Ads (§21)

-- §19 Flight cache
CREATE TABLE IF NOT EXISTS flight_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number TEXT NOT NULL,
  flight_date TEXT NOT NULL,
  info JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flight_number, flight_date)
);

-- §19 Ride ↔ Flight link
CREATE TABLE IF NOT EXISTS ride_flight_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL UNIQUE,
  flight_number TEXT NOT NULL,
  flight_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ride_flight_ride ON ride_flight_links(ride_id);

-- §22 Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  venue TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  expected_attendance INT NOT NULL DEFAULT 0,
  surge_multiplier NUMERIC(4,2),
  auto_dispatch_radius_miles INT DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled')),
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_status ON events(tenant_id, status, starts_at);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_tenant_iso ON events
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- §21 Marketplace Ads
CREATE TABLE IF NOT EXISTS marketplace_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  advertiser_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('banner','interstitial','card','sponsored_result')),
  title TEXT NOT NULL,
  image_url TEXT,
  target_url TEXT NOT NULL,
  impression_budget INT NOT NULL DEFAULT 1000,
  cost_per_impression_cents INT NOT NULL DEFAULT 10,
  impressions_served INT NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  target_zone_ids TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_tenant_active ON marketplace_ads(tenant_id, is_active, start_date, end_date);

ALTER TABLE marketplace_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY ads_tenant_iso ON marketplace_ads
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Impression increment RPC
CREATE OR REPLACE FUNCTION increment_ad_impressions(p_ad_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE marketplace_ads
  SET impressions_served = impressions_served + 1
  WHERE id = p_ad_id;
$$;
