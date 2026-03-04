-- Phase 14: Website + Microsites + FAQ (M13)
-- MIC-PUB-0001: Tenant microsite publishing
-- MIC-WGT-0001: Booking widget embed
-- UI-FAQ-0001: FAQ / help center

-- Microsite configuration (MIC-PUB-0001)
CREATE TABLE IF NOT EXISTS tenant_microsites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  template_id     text NOT NULL DEFAULT 'default',
  subdomain       text UNIQUE,
  custom_domain   text UNIQUE,
  is_published    boolean NOT NULL DEFAULT false,
  hero_title      text,
  hero_subtitle   text,
  hero_image_url  text,
  primary_color   text DEFAULT '#1a73e8',
  accent_color    text DEFAULT '#ff6d00',
  logo_url        text,
  favicon_url     text,
  meta_title      text,
  meta_description text,
  og_image_url    text,
  footer_text     text,
  analytics_id    text,
  custom_css      text,
  custom_scripts  jsonb DEFAULT '[]',
  pages           jsonb DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Booking widget configs (MIC-WGT-0001)
CREATE TABLE IF NOT EXISTS booking_widgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  widget_key      text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  name            text NOT NULL DEFAULT 'Default Widget',
  allowed_origins text[] DEFAULT '{}',
  theme           jsonb DEFAULT '{"primaryColor": "#1a73e8", "borderRadius": "8px"}',
  default_category text,
  show_fare_estimate boolean NOT NULL DEFAULT true,
  show_driver_eta boolean NOT NULL DEFAULT true,
  require_auth    boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_widgets_tenant ON booking_widgets(tenant_id);

-- FAQ / Help center (UI-FAQ-0001)
CREATE TABLE IF NOT EXISTS faq_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid,
  scope           text NOT NULL DEFAULT 'platform' CHECK (scope IN ('platform', 'tenant')),
  name            text NOT NULL,
  slug            text NOT NULL,
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS faq_articles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
  tenant_id       uuid,
  title           text NOT NULL,
  slug            text NOT NULL,
  content_md      text NOT NULL,
  content_html    text,
  audience        text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'rider', 'driver', 'tenant_admin')),
  is_published    boolean NOT NULL DEFAULT true,
  view_count      integer NOT NULL DEFAULT 0,
  helpful_count   integer NOT NULL DEFAULT 0,
  not_helpful_count integer NOT NULL DEFAULT 0,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

CREATE INDEX idx_faq_articles_category ON faq_articles(category_id);
CREATE INDEX idx_faq_articles_audience ON faq_articles(audience);

-- Seed platform-level FAQ categories
INSERT INTO faq_categories (scope, name, slug, sort_order)
VALUES
  ('platform', 'Getting Started', 'getting-started', 1),
  ('platform', 'Payments & Billing', 'payments-billing', 2),
  ('platform', 'Rides & Dispatch', 'rides-dispatch', 3),
  ('platform', 'Driver FAQ', 'driver-faq', 4),
  ('platform', 'Safety & Security', 'safety-security', 5),
  ('platform', 'Account Management', 'account-management', 6)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- RLS
ALTER TABLE tenant_microsites ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY microsites_public_read ON tenant_microsites FOR SELECT USING (is_published = true);
CREATE POLICY microsites_tenant_write ON tenant_microsites FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY widgets_public_read ON booking_widgets FOR SELECT USING (is_active = true);
CREATE POLICY widgets_tenant_write ON booking_widgets FOR ALL USING (
  tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER') AND ur.is_active = true)
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN') AND ur.is_active = true)
);

CREATE POLICY faq_categories_read ON faq_categories FOR SELECT USING (true);
CREATE POLICY faq_articles_read ON faq_articles FOR SELECT USING (is_published = true);

CREATE POLICY faq_articles_write ON faq_articles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('PLATFORM_SUPER_ADMIN','PLATFORM_OPS') AND ur.is_active = true)
  OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('TENANT_OWNER') AND ur.is_active = true))
);

COMMENT ON TABLE tenant_microsites IS 'Phase 14: Per-tenant microsite configuration and publishing';
COMMENT ON TABLE booking_widgets IS 'Phase 14: Embeddable booking widgets with CORS and theming';
COMMENT ON TABLE faq_categories IS 'Phase 14: FAQ categories (platform-wide and tenant-scoped)';
COMMENT ON TABLE faq_articles IS 'Phase 14: FAQ articles with markdown content and audience targeting';
