-- Phase 11: Push notification infrastructure (NOT-PUSH-0001)

CREATE TABLE IF NOT EXISTS push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

CREATE TABLE IF NOT EXISTS notification_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  tenant_id     uuid,
  channel       text NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'in_app')),
  title         text,
  body          text,
  status        text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'dry_run', 'pending')),
  device_count  integer DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_user ON notification_log(user_id);
CREATE INDEX idx_notification_log_tenant ON notification_log(tenant_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_tokens_own ON push_tokens FOR ALL USING (user_id = auth.uid());

CREATE POLICY notification_log_read ON notification_log FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN','PLATFORM_OPS') AND ur.is_active = true)
);

COMMENT ON TABLE push_tokens IS 'Phase 11: FCM push notification device tokens';
COMMENT ON TABLE notification_log IS 'Phase 11: Cross-channel notification delivery log';
