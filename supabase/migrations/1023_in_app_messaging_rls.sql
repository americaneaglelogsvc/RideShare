-- ============================================================================
-- Migration 1023: In-App Messaging RLS + Channel Enforcement
--
-- Policy decisions (CEO directive, Sprint B):
--   - All rider↔driver communication is IN-APP ONLY (no external SMS)
--   - trip_messages visibility: sender, counterparty, tenant_admin, UWD super-admin
--   - 'channel' column added to enforce in-app only at schema level
--   - tenant_id NOT NULL enforced
-- ============================================================================

-- 1. Ensure tenant_id column exists and is NOT NULL on trip_messages
ALTER TABLE trip_messages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- Backfill from parent trip where missing
UPDATE trip_messages tm
SET tenant_id = t.tenant_id
FROM trips t
WHERE tm.trip_id = t.id
  AND tm.tenant_id IS NULL;

ALTER TABLE trip_messages ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_messages_tenant_id ON trip_messages(tenant_id);

-- 2. Add 'channel' column — enforces in-app only at schema level
ALTER TABLE trip_messages ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'in_app'
  CHECK (channel IN ('in_app', 'system'));

-- 3. Enable Row Level Security
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;

-- Riders can see messages on their own trips only
CREATE POLICY "Riders see own trip messages"
  ON trip_messages FOR SELECT TO authenticated
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND trip_id IN (
      SELECT id FROM trips
      WHERE rider_id = auth.uid()
        AND tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    )
  );

-- Drivers can see messages on their own trips only
CREATE POLICY "Drivers see own trip messages"
  ON trip_messages FOR SELECT TO authenticated
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND trip_id IN (
      SELECT id FROM trips
      WHERE driver_id = auth.uid()
        AND tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    )
  );

-- Tenant admins can see all messages within their tenant
CREATE POLICY "Tenant admins see all own-tenant messages"
  ON trip_messages FOR SELECT TO authenticated
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = (current_setting('app.current_tenant_id', true))::uuid
        AND ur.role IN ('tenant_admin', 'tenant_manager')
    )
  );

-- Riders and drivers can insert messages on their active trips
CREATE POLICY "Riders and drivers can send messages on active trips"
  ON trip_messages FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    AND channel = 'in_app'
    AND trip_id IN (
      SELECT id FROM trips
      WHERE tenant_id = (current_setting('app.current_tenant_id', true))::uuid
        AND status IN ('driver_assigned', 'en_route_pickup', 'arrived_pickup', 'in_progress')
        AND (rider_id = auth.uid() OR driver_id = auth.uid())
    )
  );

-- Service role (UWD super-admin) bypasses all policies — has full access
-- This is enforced by Supabase: service role key bypasses RLS entirely

-- 4. message_retention_config: ensure RLS and tenant isolation
ALTER TABLE message_retention_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant-scoped message retention config"
  ON message_retention_config FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid)
  WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
