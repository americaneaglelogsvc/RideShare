-- Phase 10: Payments Completeness (M06)
-- Fee schedules, payout infrastructure, dunning, invoices, tax docs

-- Fee schedule tiers (RIDE-PAY-040)
CREATE TABLE IF NOT EXISTS fee_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  tier            text NOT NULL CHECK (tier IN ('starter', 'pro', 'enterprise', 'custom')),
  platform_pct    numeric(5,2) NOT NULL DEFAULT 15.00,
  per_trip_cents  integer NOT NULL DEFAULT 0,
  monthly_min_cents integer NOT NULL DEFAULT 0,
  payout_fee_pct  numeric(5,2) NOT NULL DEFAULT 0.00,
  instant_fee_cents integer NOT NULL DEFAULT 0,
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO fee_schedules (name, tier, platform_pct, per_trip_cents, monthly_min_cents, is_default)
VALUES
  ('Starter', 'starter', 20.00, 0, 0, true),
  ('Pro', 'pro', 15.00, 0, 5000, false),
  ('Enterprise', 'enterprise', 10.00, 25, 25000, false)
ON CONFLICT (name) DO NOTHING;

-- Link tenants to fee schedules
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fee_schedule_id uuid REFERENCES fee_schedules(id);

-- Payout configuration per tenant (RIDE-PAYOUT-100, 108)
CREATE TABLE IF NOT EXISTS payout_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  payout_mode     text NOT NULL DEFAULT 'platform_triggered' CHECK (payout_mode IN ('platform_triggered', 'tenant_managed')),
  schedule        text NOT NULL DEFAULT 'weekly' CHECK (schedule IN ('daily', 'weekly', 'biweekly', 'monthly')),
  min_balance_cents integer NOT NULL DEFAULT 1000,
  instant_enabled boolean NOT NULL DEFAULT false,
  instant_fee_cents integer NOT NULL DEFAULT 150,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Payout batches (RIDE-PAYOUT-111, 112)
CREATE TABLE IF NOT EXISTS payout_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'preview' CHECK (status IN ('preview', 'confirmed', 'processing', 'completed', 'failed')),
  total_cents     bigint NOT NULL DEFAULT 0,
  driver_count    integer NOT NULL DEFAULT 0,
  initiated_by    uuid NOT NULL,
  confirmed_at    timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Individual payout line items (RIDE-PAYOUT-104)
CREATE TABLE IF NOT EXISTS payout_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid NOT NULL REFERENCES payout_batches(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL,
  driver_id       uuid NOT NULL,
  amount_cents    bigint NOT NULL,
  fee_cents       integer NOT NULL DEFAULT 0,
  net_cents       bigint NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
  processor_ref   text,
  receipt_url     text,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Dunning log (RIDE-PAY-030)
CREATE TABLE IF NOT EXISTS dunning_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stage           text NOT NULL CHECK (stage IN ('D0_soft', 'D2_firm', 'D5_suspend', 'D10_terminate')),
  amount_cents    bigint NOT NULL,
  notification_sent boolean NOT NULL DEFAULT false,
  resolved        boolean NOT NULL DEFAULT false,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Invoices (BILL-INV-0001)
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number  text NOT NULL UNIQUE,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  subtotal_cents  bigint NOT NULL,
  tax_cents       bigint NOT NULL DEFAULT 0,
  total_cents     bigint NOT NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'void')),
  issued_at       timestamptz,
  paid_at         timestamptz,
  pdf_url         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Tax documents (TAX-1099-020, 030)
CREATE TABLE IF NOT EXISTS tax_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  driver_id       uuid NOT NULL,
  tax_year        integer NOT NULL,
  doc_type        text NOT NULL CHECK (doc_type IN ('1099-K', 'earnings_summary', 'annual_statement')),
  total_gross_cents bigint NOT NULL,
  tin_vault_ref   text,
  pdf_url         text,
  status          text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'delivered', 'corrected')),
  generated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, driver_id, tax_year, doc_type)
);

-- Payment consent log (PAY-FLOW-0100)
CREATE TABLE IF NOT EXISTS payment_consent_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  rider_id        uuid NOT NULL,
  consent_type    text NOT NULL CHECK (consent_type IN ('payment_method_save', 'recurring_charge', 'tip_authorization')),
  granted         boolean NOT NULL DEFAULT true,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY fee_schedules_read ON fee_schedules FOR SELECT USING (true);

CREATE POLICY payout_configs_tenant ON payout_configs FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY payout_batches_tenant ON payout_batches FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY payout_items_tenant ON payout_items FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY dunning_tenant ON dunning_events FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY invoices_tenant ON invoices FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY tax_docs_driver ON tax_documents FOR SELECT USING (
  driver_id = auth.uid()
  OR tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER','TENANT_OPS_ADMIN') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY consent_log_read ON payment_consent_log FOR SELECT USING (
  rider_id = auth.uid()
  OR tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

-- Daily ledger reconciliation RPC (RIDE-PAYOUT-106)
CREATE OR REPLACE FUNCTION daily_ledger_reconciliation(p_tenant_id uuid, p_date date DEFAULT CURRENT_DATE - 1)
RETURNS TABLE(
  total_fares_cents bigint,
  total_platform_fees_cents bigint,
  total_driver_payouts_cents bigint,
  total_refunds_cents bigint,
  net_balance_cents bigint,
  discrepancy_cents bigint
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH day_ledger AS (
    SELECT
      COALESCE(SUM(CASE WHEN event_type = 'TRIP_FARE' THEN amount_cents ELSE 0 END), 0) AS fares,
      COALESCE(SUM(CASE WHEN event_type = 'PLATFORM_FEE' THEN amount_cents ELSE 0 END), 0) AS platform_fees,
      COALESCE(SUM(CASE WHEN event_type = 'DRIVER_PAYOUT' THEN amount_cents ELSE 0 END), 0) AS driver_payouts,
      COALESCE(SUM(CASE WHEN event_type = 'REFUND' THEN amount_cents ELSE 0 END), 0) AS refunds
    FROM ledger_entries
    WHERE tenant_id = p_tenant_id
      AND created_at::date = p_date
  )
  SELECT
    dl.fares,
    dl.platform_fees,
    dl.driver_payouts,
    dl.refunds,
    dl.fares - dl.platform_fees - dl.driver_payouts - dl.refunds AS net_balance,
    dl.fares - dl.platform_fees - dl.driver_payouts - dl.refunds AS discrepancy
  FROM day_ledger dl;
END;
$$;

COMMENT ON TABLE fee_schedules IS 'Phase 10: Platform fee schedule tiers (Starter/Pro/Enterprise)';
COMMENT ON TABLE payout_batches IS 'Phase 10: Bulk payout batches with preview→confirm→execute lifecycle';
COMMENT ON TABLE dunning_events IS 'Phase 10: Dunning escalation log (D0/D2/D5/D10)';
COMMENT ON TABLE invoices IS 'Phase 10: Tenant invoices with PDF generation';
COMMENT ON TABLE tax_documents IS 'Phase 10: Driver tax documents (1099-K, earnings summaries)';
