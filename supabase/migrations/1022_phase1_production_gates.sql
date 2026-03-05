-- Migration 1022: Phase 1 Production Gates
-- CANONICAL gaps: QR attribution (§8.4), DLQ extensions (§11.1), disclosures, leads, repayment plans

-- ═══════════════════════════════════════════════════════════════
-- QR Code Attribution (CANONICAL §8.4)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vehicle_id UUID NOT NULL,
  driver_id UUID,
  code TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  scan_count INTEGER NOT NULL DEFAULT 0,
  ride_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_codes_tenant ON qr_codes(tenant_id);
CREATE INDEX idx_qr_codes_vehicle ON qr_codes(vehicle_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  rider_id UUID,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT,
  converted_trip_id UUID,
  bonus_ledger_entry_id UUID
);

CREATE INDEX idx_qr_scans_code ON qr_scans(qr_code_id);
CREATE INDEX idx_qr_scans_tenant ON qr_scans(tenant_id);
CREATE INDEX idx_qr_scans_scanned_at ON qr_scans(scanned_at);

ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- DLQ Extensions (CANONICAL §11.1)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS failure_class TEXT CHECK (failure_class IN ('transient', 'permanent', 'unknown'));
ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS replayed_at TIMESTAMPTZ;
ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS replay_result TEXT CHECK (replay_result IN ('success', 'failed'));

CREATE INDEX idx_job_queue_dead ON job_queue(status) WHERE status = 'dead';
CREATE INDEX idx_job_queue_failure_class ON job_queue(failure_class) WHERE status = 'dead';

-- ═══════════════════════════════════════════════════════════════
-- Ledger Extensions (double-entry for QR bonuses, adjustments)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS debit_account TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS credit_account TEXT;

-- ═══════════════════════════════════════════════════════════════
-- Disclosure Panel (CANONICAL §8.Y RIDE-DISC-010)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  display_context TEXT NOT NULL DEFAULT 'booking' CHECK (display_context IN ('booking', 'trip', 'receipt', 'all')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disclosures_tenant ON disclosures(tenant_id);
CREATE UNIQUE INDEX idx_disclosures_tenant_version ON disclosures(tenant_id, version) WHERE status = 'active';

ALTER TABLE disclosures ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- Lead Capture (CANONICAL §10)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  fleet_size TEXT,
  message TEXT,
  source TEXT DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at);

-- ═══════════════════════════════════════════════════════════════
-- Repayment Plans (CANONICAL §8.3A RIDE-PAYOUT-105)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS repayment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  driver_id UUID NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  remaining_cents INTEGER NOT NULL,
  installment_count INTEGER NOT NULL,
  installment_amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repayment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES repayment_plans(id),
  installment_number INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deducted', 'skipped')),
  due_date DATE NOT NULL,
  deducted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repayment_plans_driver ON repayment_plans(driver_id);
CREATE INDEX idx_repayment_installments_plan ON repayment_installments(plan_id);

ALTER TABLE repayment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayment_installments ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- Vehicle Leases + Co-Driving + Shift Exchange (CANONICAL §5.8)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vehicle_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vehicle_id UUID NOT NULL,
  fleet_owner_id UUID NOT NULL,
  lessee_driver_id UUID NOT NULL,
  terms JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'terminated', 'expired')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS co_driving_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vehicle_id UUID NOT NULL,
  primary_driver_id UUID NOT NULL,
  secondary_driver_id UUID NOT NULL,
  shift_schedule JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'active', 'terminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  offering_driver_id UUID NOT NULL,
  receiving_driver_id UUID,
  vehicle_id UUID NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_point GEOGRAPHY(Point, 4326),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_leases_tenant ON vehicle_leases(tenant_id);
CREATE INDEX idx_co_driving_tenant ON co_driving_proposals(tenant_id);
CREATE INDEX idx_shift_exchanges_tenant ON shift_exchanges(tenant_id);
CREATE INDEX idx_shift_exchanges_date ON shift_exchanges(shift_date);

ALTER TABLE vehicle_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_driving_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_exchanges ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- Payout Schedule Cadence (CANONICAL RIDE-PAYOUT-108)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS payout_cadence TEXT DEFAULT 'weekly' CHECK (payout_cadence IN ('daily', 'weekly', 'biweekly', 'monthly'));
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS payout_cutoff_hour INTEGER DEFAULT 17;
ALTER TABLE tenant_onboarding ADD COLUMN IF NOT EXISTS qr_bonus_config JSONB DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════
-- Dispute Evidence (CANONICAL §8.1 chargeback evidence)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS reason_code TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS evidence_artifacts JSONB DEFAULT '[]';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'under_review', 'resolved_favor_rider', 'resolved_favor_driver', 'escalated', 'closed'));

-- ═══════════════════════════════════════════════════════════════
-- Maker-Checker Approvals (CANONICAL RIDE-PAY-050)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('bulk_payout', 'tenant_suspension', 'driver_suspension', 'policy_publish')),
  requested_by UUID NOT NULL,
  approved_by UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_approval_requests_tenant ON approval_requests(tenant_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- Seed Data: GoldRavenia + BlackRavenia (CANONICAL seed tenants)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO tenants (id, name, slug, status, created_at)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'GoldRavenia', 'goldravenia', 'active', now()),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'BlackRavenia', 'blackravenia', 'active', now())
ON CONFLICT (id) DO NOTHING;
