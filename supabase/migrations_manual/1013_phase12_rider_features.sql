-- Phase 12: Rider App Features (M08)
-- Anti-fraud, disputes, legal consent, message retention

-- Anti-fraud: booking velocity limits (RIDE-BOOK-ANTI-010)
CREATE TABLE IF NOT EXISTS booking_velocity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rider_id    uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('booking_attempt', 'booking_blocked', 'account_flagged')),
  ip_address  text,
  device_fingerprint text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_velocity_rider ON booking_velocity_log(rider_id, created_at DESC);
CREATE INDEX idx_booking_velocity_tenant ON booking_velocity_log(tenant_id, created_at DESC);

-- Rider disputes (RIDE-DISC-010)
CREATE TABLE IF NOT EXISTS rider_disputes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trip_id         uuid NOT NULL,
  rider_id        uuid NOT NULL,
  category        text NOT NULL CHECK (category IN ('fare_dispute', 'route_issue', 'driver_behavior', 'safety_concern', 'lost_item', 'unauthorized_charge', 'other')),
  description     text NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_refund', 'resolved_no_action', 'escalated', 'closed')),
  resolution_note text,
  refund_cents    integer DEFAULT 0,
  assigned_to     uuid,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  sla_deadline    timestamptz
);

CREATE INDEX idx_rider_disputes_tenant ON rider_disputes(tenant_id, status);
CREATE INDEX idx_rider_disputes_rider ON rider_disputes(rider_id);

-- Legal consent tracking (RIDE-LEGAL-010, RIDE-LEGAL-020)
CREATE TABLE IF NOT EXISTS legal_consents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  user_id         uuid NOT NULL,
  user_type       text NOT NULL CHECK (user_type IN ('rider', 'driver')),
  consent_type    text NOT NULL CHECK (consent_type IN ('terms_of_service', 'privacy_policy', 'data_processing', 'marketing', 'location_tracking', 'biometric_consent')),
  version         text NOT NULL,
  granted         boolean NOT NULL DEFAULT true,
  ip_address      text,
  user_agent      text,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  UNIQUE (user_id, consent_type, version)
);

CREATE INDEX idx_legal_consents_user ON legal_consents(user_id);

-- Message retention policies (MSG-RET-0001)
CREATE TABLE IF NOT EXISTS message_retention_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  trip_chat_retention_days integer NOT NULL DEFAULT 30,
  support_chat_retention_days integer NOT NULL DEFAULT 90,
  pii_masking_enabled boolean NOT NULL DEFAULT true,
  phone_masking_enabled boolean NOT NULL DEFAULT true,
  auto_purge_enabled boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE booking_velocity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_retention_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY velocity_log_admin ON booking_velocity_log FOR SELECT USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER','TENANT_OPS_ADMIN') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY disputes_rider_read ON rider_disputes FOR SELECT USING (
  rider_id = auth.uid()
  OR tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY disputes_tenant_write ON rider_disputes FOR ALL USING (
  rider_id = auth.uid()
  OR tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER','TENANT_OPS_ADMIN') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY consents_own ON legal_consents FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN','PLATFORM_OPS') AND ur.is_active = true)
);

CREATE POLICY retention_config_tenant ON message_retention_config FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

-- Booking velocity check RPC
CREATE OR REPLACE FUNCTION check_booking_velocity(
  p_tenant_id uuid,
  p_rider_id uuid,
  p_window_minutes integer DEFAULT 10,
  p_max_attempts integer DEFAULT 5
) RETURNS TABLE(allowed boolean, attempts_in_window integer, message text)
LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM booking_velocity_log
  WHERE tenant_id = p_tenant_id
    AND rider_id = p_rider_id
    AND action = 'booking_attempt'
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  IF v_count >= p_max_attempts THEN
    INSERT INTO booking_velocity_log (tenant_id, rider_id, action)
    VALUES (p_tenant_id, p_rider_id, 'booking_blocked');
    RETURN QUERY SELECT false, v_count, 'Too many booking attempts. Please try again later.'::text;
  ELSE
    INSERT INTO booking_velocity_log (tenant_id, rider_id, action)
    VALUES (p_tenant_id, p_rider_id, 'booking_attempt');
    RETURN QUERY SELECT true, v_count + 1, 'OK'::text;
  END IF;
END;
$$;

COMMENT ON TABLE booking_velocity_log IS 'Phase 12: Anti-fraud booking velocity tracking';
COMMENT ON TABLE rider_disputes IS 'Phase 12: Rider dispute management with SLA tracking';
COMMENT ON TABLE legal_consents IS 'Phase 12: Legal consent version tracking for riders and drivers';
COMMENT ON TABLE message_retention_config IS 'Phase 12: Per-tenant message retention and PII masking config';
