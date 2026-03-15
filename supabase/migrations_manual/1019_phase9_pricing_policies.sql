-- Phase 9: Pricing Policy Modules (§7.1–7.4)
-- Cancellation, No-Show, Wait-Time, Luggage, Extra Stops, Gratuity, Surge

-- Per-tenant pricing policies (JSONB column stores all sub-policies)
CREATE TABLE IF NOT EXISTS tenant_pricing_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  policies JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_pricing_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tpp_tenant_iso ON tenant_pricing_policies
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Surge events (§7.3: with propagation delay)
CREATE TABLE IF NOT EXISTS surge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  zone_id TEXT NOT NULL,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surge_active ON surge_events(tenant_id, is_active, expires_at);

ALTER TABLE surge_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY surge_tenant_iso ON surge_events
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
