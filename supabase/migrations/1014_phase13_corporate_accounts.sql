-- Phase 13: Corporate Accounts & Console UIs (M09-M11)
-- CORP-ACCT-010: Corporate account creation
-- CORP-ACCT-020: Employee management
-- CORP-ACCT-030: Budget/policy controls
-- CORP-ACCT-040: Corporate billing & reporting

CREATE TABLE IF NOT EXISTS corporate_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_name    text NOT NULL,
  billing_email   text NOT NULL,
  billing_address jsonb,
  tax_id          text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  payment_method_id text,
  monthly_budget_cents bigint,
  per_trip_limit_cents bigint,
  allowed_categories text[] DEFAULT '{}',
  require_approval boolean NOT NULL DEFAULT false,
  admin_user_id   uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_corp_accounts_tenant ON corporate_accounts(tenant_id);

-- Corporate employees linked to accounts (CORP-ACCT-020)
CREATE TABLE IF NOT EXISTS corporate_employees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id uuid NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL,
  user_id         uuid NOT NULL,
  employee_email  text NOT NULL,
  employee_name   text,
  role            text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  monthly_limit_cents bigint,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (corporate_account_id, user_id)
);

CREATE INDEX idx_corp_employees_account ON corporate_employees(corporate_account_id);
CREATE INDEX idx_corp_employees_user ON corporate_employees(user_id);

-- Corporate trip approvals (CORP-ACCT-030)
CREATE TABLE IF NOT EXISTS corporate_trip_approvals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id uuid NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL,
  trip_id         uuid NOT NULL,
  employee_id     uuid NOT NULL REFERENCES corporate_employees(id),
  requested_at    timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  approved_by     uuid,
  approved_at     timestamptz,
  rejection_reason text,
  estimated_fare_cents bigint
);

-- Corporate billing statements (CORP-ACCT-040)
CREATE TABLE IF NOT EXISTS corporate_statements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id uuid NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  total_trips     integer NOT NULL DEFAULT 0,
  total_fare_cents bigint NOT NULL DEFAULT 0,
  total_fees_cents bigint NOT NULL DEFAULT 0,
  grand_total_cents bigint NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'overdue')),
  pdf_url         text,
  issued_at       timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_trip_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY corp_accounts_tenant ON corporate_accounts FOR ALL USING (
  admin_user_id = auth.uid()
  OR tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER','TENANT_OPS_ADMIN') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY corp_employees_access ON corporate_employees FOR ALL USING (
  user_id = auth.uid()
  OR corporate_account_id IN (SELECT ca.id FROM corporate_accounts ca WHERE ca.admin_user_id = auth.uid())
  OR tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER','TENANT_OPS_ADMIN') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY corp_approvals_access ON corporate_trip_approvals FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY corp_statements_access ON corporate_statements FOR SELECT USING (
  corporate_account_id IN (SELECT ca.id FROM corporate_accounts ca WHERE ca.admin_user_id = auth.uid())
  OR tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER','TENANT_OPS_ADMIN') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

COMMENT ON TABLE corporate_accounts IS 'Phase 13: Corporate ride accounts with budget controls';
COMMENT ON TABLE corporate_employees IS 'Phase 13: Employees linked to corporate accounts';
COMMENT ON TABLE corporate_trip_approvals IS 'Phase 13: Trip approval workflow for corporate accounts';
COMMENT ON TABLE corporate_statements IS 'Phase 13: Monthly billing statements for corporate accounts';
