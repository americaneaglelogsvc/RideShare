-- Seed 001: 10 test tenants with full configuration
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING / DO UPDATE)
-- Tenants span luxury, standard, airport, corporate, EV, late-night verticals

BEGIN;

-- ─── 1. Platform terms version (required before acceptances) ─────────────────
INSERT INTO platform_terms_versions (id, version, text, effective_at, created_at)
VALUES (
  'a0000000-ffff-4000-8000-000000000001',
  'v1.0.0',
  'UWD SaaS Platform ToS v1.0.0 — Subscriber is the TNC operator. UWD provides software only.',
  NOW(),
  NOW()
) ON CONFLICT (version) DO NOTHING;

-- ─── 2. Ten test tenants ─────────────────────────────────────────────────────
INSERT INTO tenants (id, name, status, plan, domain, settings, created_at) VALUES

-- #1 GoldRavenia — Luxury Black Car (Chicago North Shore)
('a1b2c3d4-0001-4000-8000-000000000001', 'GoldRavenia',
 'active', 'enterprise', 'goldravenia.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#b8960c','accent_color','#1a1a2e','logo_url','/assets/tenants/goldravenia-logo.png'),
   'vehicle_categories', ARRAY['black_sedan','black_suv','premium'],
   'service_area', 'Chicago North Shore',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #2 BlackRavenia — Premium SUV Fleet
('a1b2c3d4-0002-4000-8000-000000000002', 'BlackRavenia',
 'active', 'enterprise', 'blackravenia.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#1a1a1a','accent_color','#d4af37','logo_url','/assets/tenants/blackravenia-logo.png'),
   'vehicle_categories', ARRAY['black_suv','premium'],
   'service_area', 'Chicago Metro',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #3 SilverPeak — Executive Chauffeur
('a1b2c3d4-0003-4000-8000-000000000003', 'SilverPeak',
 'active', 'enterprise', 'silverpeak.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#6b7280','accent_color','#c0c0c0','logo_url','/assets/tenants/silverpeak-logo.png'),
   'vehicle_categories', ARRAY['premium','black_sedan'],
   'service_area', 'Chicago Loop & Suburbs',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #4 MetroFleet — Standard Rideshare
('a1b2c3d4-0004-4000-8000-000000000004', 'MetroFleet',
 'active', 'professional', 'metrofleet.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#2563eb','accent_color','#f59e0b','logo_url','/assets/tenants/metrofleet-logo.png'),
   'vehicle_categories', ARRAY['standard','black_sedan'],
   'service_area', 'Chicago City-Wide',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #5 NightOwl — Late-Night / Bar District
('a1b2c3d4-0005-4000-8000-000000000005', 'NightOwl',
 'active', 'professional', 'nightowlrides.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#7c3aed','accent_color','#f472b6','logo_url','/assets/tenants/nightowl-logo.png'),
   'vehicle_categories', ARRAY['standard','black_sedan','black_suv'],
   'service_area', 'Chicago River North & Wicker Park',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #6 AeroTransit — Airport Specialist
('a1b2c3d4-0006-4000-8000-000000000006', 'AeroTransit',
 'active', 'professional', 'aerotransit.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#0ea5e9','accent_color','#0f172a','logo_url','/assets/tenants/aerotransit-logo.png'),
   'vehicle_categories', ARRAY['black_sedan','black_suv','standard'],
   'service_area', 'ORD + MDW Airport Corridors',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #7 CorporateRide — B2B Corporate Accounts
('a1b2c3d4-0007-4000-8000-000000000007', 'CorporateRide',
 'active', 'enterprise', 'corporateride.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#1e293b','accent_color','#22c55e','logo_url','/assets/tenants/corporateride-logo.png'),
   'vehicle_categories', ARRAY['black_sedan','black_suv','premium'],
   'service_area', 'Chicago CBD & O''Hare',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #8 GreenWave — EV-Only Eco Fleet
('a1b2c3d4-0008-4000-8000-000000000008', 'GreenWave',
 'active', 'starter', 'greenwaveev.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#16a34a','accent_color','#86efac','logo_url','/assets/tenants/greenwave-logo.png'),
   'vehicle_categories', ARRAY['standard','black_sedan'],
   'service_area', 'Chicago Eco Zones',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #9 LegacyLuxe — 24/7 Premium Chauffeur
('a1b2c3d4-0009-4000-8000-000000000009', 'LegacyLuxe',
 'active', 'enterprise', 'legacyluxe.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#78350f','accent_color','#fbbf24','logo_url','/assets/tenants/legacyluxe-logo.png'),
   'vehicle_categories', ARRAY['premium','black_suv'],
   'service_area', 'Chicagoland Luxury Corridor',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW()),

-- #10 UrbanRush — High-Volume Budget
('a1b2c3d4-0010-4000-8000-000000000010', 'UrbanRush',
 'active', 'starter', 'urbanrush.com',
 jsonb_build_object(
   'branding', jsonb_build_object('primary_color','#dc2626','accent_color','#fca5a5','logo_url','/assets/tenants/urbanrush-logo.png'),
   'vehicle_categories', ARRAY['standard'],
   'service_area', 'Chicago Neighborhoods',
   'currency', 'USD',
   'timezone', 'America/Chicago'
 ), NOW())

ON CONFLICT (id) DO UPDATE SET
  name    = EXCLUDED.name,
  status  = EXCLUDED.status,
  settings = EXCLUDED.settings;

-- ─── 3. Platform ToS acceptances (pre-accept for all 10 tenants) ─────────────
INSERT INTO platform_terms_acceptances
  (id, tenant_id, accepted_by, terms_version, ip_address, user_agent, accepted_at)
SELECT
  gen_random_uuid(),
  t.id,
  'system-seed',
  'v1.0.0',
  '127.0.0.1',
  'SeedScript/1.0',
  NOW()
FROM tenants t
WHERE t.id IN (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'a1b2c3d4-0004-4000-8000-000000000004',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'a1b2c3d4-0006-4000-8000-000000000006',
  'a1b2c3d4-0007-4000-8000-000000000007',
  'a1b2c3d4-0008-4000-8000-000000000008',
  'a1b2c3d4-0009-4000-8000-000000000009',
  'a1b2c3d4-0010-4000-8000-000000000010'
)
ON CONFLICT (tenant_id, terms_version) DO NOTHING;

-- ─── 4. Tenant pricing policies ──────────────────────────────────────────────
INSERT INTO tenant_pricing_policies
  (id, tenant_id, base_fare_cents, per_mile_cents, per_minute_cents,
   platform_fee_pct, driver_payout_pct,
   min_wage_cents_per_hour, extra_stop_fee_cents,
   mess_fee_cents, damage_fee_cents, route_deviation_pct,
   surge_enabled, surge_cap_multiplier, created_at)
VALUES
  -- GoldRavenia: luxury premium rates
  ('pp000001-0001-4000-8000-000000000001','a1b2c3d4-0001-4000-8000-000000000001',
   800,250,45, 20,80, 1800,300, 25000,30000,20, true,2.5, NOW()),
  -- BlackRavenia: premium SUV
  ('pp000001-0002-4000-8000-000000000002','a1b2c3d4-0002-4000-8000-000000000002',
   700,220,40, 20,80, 1600,300, 15000,25000,20, true,2.0, NOW()),
  -- SilverPeak: executive
  ('pp000001-0003-4000-8000-000000000003','a1b2c3d4-0003-4000-8000-000000000003',
   900,280,50, 18,82, 2000,400, 30000,35000,15, true,2.0, NOW()),
  -- MetroFleet: standard
  ('pp000001-0004-4000-8000-000000000004','a1b2c3d4-0004-4000-8000-000000000004',
   300,140,25, 25,75, 1500,200, 7500,10000,15,  true,1.8, NOW()),
  -- NightOwl: late-night surcharge
  ('pp000001-0005-4000-8000-000000000005','a1b2c3d4-0005-4000-8000-000000000005',
   400,160,30, 22,78, 1700,200, 20000,15000,20, true,3.0, NOW()),
  -- AeroTransit: airport flat-fee addons
  ('pp000001-0006-4000-8000-000000000006','a1b2c3d4-0006-4000-8000-000000000006',
   600,180,35, 22,78, 1600,250, 10000,12000,15, true,1.5, NOW()),
  -- CorporateRide: corporate rates
  ('pp000001-0007-4000-8000-000000000007','a1b2c3d4-0007-4000-8000-000000000007',
   700,210,40, 20,80, 1800,300, 20000,25000,15, false,1.0,NOW()),
  -- GreenWave: eco budget
  ('pp000001-0008-4000-8000-000000000008','a1b2c3d4-0008-4000-8000-000000000008',
   250,120,20, 25,75, 1500,150, 7500,8000,15,   true,1.5, NOW()),
  -- LegacyLuxe: ultra-premium
  ('pp000001-0009-4000-8000-000000000009','a1b2c3d4-0009-4000-8000-000000000009',
   1200,350,60, 15,85, 2200,500, 35000,40000,10, true,2.0,NOW()),
  -- UrbanRush: budget volume
  ('pp000001-0010-4000-8000-000000000010','a1b2c3d4-0010-4000-8000-000000000010',
   200,110,18, 28,72, 1500,150, 5000,7500,20,    true,2.0, NOW())

ON CONFLICT (tenant_id) DO UPDATE SET
  min_wage_cents_per_hour = EXCLUDED.min_wage_cents_per_hour,
  extra_stop_fee_cents    = EXCLUDED.extra_stop_fee_cents,
  mess_fee_cents          = EXCLUDED.mess_fee_cents,
  damage_fee_cents        = EXCLUDED.damage_fee_cents,
  route_deviation_pct     = EXCLUDED.route_deviation_pct;

COMMIT;
