-- Phase 7.2: RBAC user_roles table
-- Supports both platform-wide roles (tenant_id IS NULL) and tenant-scoped roles

CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN (
    'PLATFORM_SUPER_ADMIN',
    'PLATFORM_OPS',
    'TENANT_OWNER',
    'TENANT_OPS_ADMIN',
    'TENANT_DISPATCHER',
    'DRIVER',
    'RIDER',
    'FLEET_OWNER',
    'CORPORATE_ADMIN'
  )),
  is_active   boolean NOT NULL DEFAULT true,
  granted_by  uuid,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz,
  UNIQUE (user_id, tenant_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_role ON user_roles(tenant_id, role) WHERE is_active = true;

-- RLS: users can only see their own roles; platform admins can see all
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_self_read ON user_roles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
        AND ur.is_active = true
    )
  );

CREATE POLICY user_roles_admin_write ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('PLATFORM_SUPER_ADMIN', 'TENANT_OWNER')
        AND ur.is_active = true
    )
  );

COMMENT ON TABLE user_roles IS 'Phase 7.2: RBAC role assignments. Platform roles have tenant_id=NULL. Tenant roles are scoped.';
