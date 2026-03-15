-- Tenant Alpha Seed — schema-accurate version
-- Pre-computed bcrypt for 'Password123!'

INSERT INTO tenants (id, name, slug, owner_email, owner_name, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'Tenant Alpha', 'tenant-alpha', 'owner@tenantalpha.com', 'Alex Alpha', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_onboarding (id, tenant_id, status, revenue_share_bps, per_ride_fee_cents, min_platform_fee_cents)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'ACTIVE', 2000, 100, 250)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_pricing_policies (id, tenant_id, category, base_fare_cents, per_mile_cents, per_minute_cents, minimum_fare_cents, booking_fee_cents, is_active)
VALUES
  ('aaa00001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'black_sedan', 500, 300, 40, 1500, 200, true),
  ('aaa00001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'black_suv', 800, 400, 50, 2500, 250, true),
  ('aaa00001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'black_ev', 600, 350, 45, 2000, 200, true)
ON CONFLICT (id) DO NOTHING;

-- 10 Drivers
DO $$
DECLARE
  pw TEXT := '$2a$06$WETSvUXiOz3Llg6sLU1YH.c5yHtjP.UROcDuyeAUT3gUzQYYMg73C';
  tid UUID := '11111111-1111-1111-1111-111111111111';
  fn TEXT[] := ARRAY['James','Maria','David','Sarah','Michael','Emma','Robert','Sophia','Daniel','Olivia'];
  ln TEXT[] := ARRAY['Wilson','Garcia','Chen','Johnson','Brown','Davis','Martinez','Anderson','Taylor','Thomas'];
  cats TEXT[] := ARRAY['black_sedan','black_sedan','black_suv','black_sedan','black_ev','black_suv','black_sedan','black_ev','black_suv','black_sedan'];
  uid UUID; diid UUID; dpid UUID; i INT;
BEGIN
  FOR i IN 1..10 LOOP
    uid  := ('d0000000-0000-0000-0000-00000000000' || i)::UUID;
    diid := ('di000000-0000-0000-0000-00000000000' || i)::UUID;
    dpid := ('dp000000-0000-0000-0000-00000000000' || i)::UUID;

    INSERT INTO auth.users (id,instance_id,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,aud,role)
    VALUES (uid,'00000000-0000-0000-0000-000000000000','driver'||i||'@tenantalpha.com',pw,now(),now(),now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name',fn[i],'last_name',ln[i]),
      'authenticated','authenticated')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO driver_identities (id, auth_user_id, email, created_at)
    VALUES (diid, uid, 'driver'||i||'@tenantalpha.com', now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO driver_profiles (id, tenant_id, driver_identity_id, first_name, last_name, phone, email, is_active, status, rating, total_trips, created_at)
    VALUES (dpid, tid, diid, fn[i], ln[i], '+1312555'||LPAD(i::TEXT,4,'0'), 'driver'||i||'@tenantalpha.com', true, 'offline', 4.5+(random()*0.5), FLOOR(random()*300)::INT, now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_roles (id, user_id, tenant_id, role, is_active, granted_at)
    VALUES (('ur0d0000-0000-0000-0000-00000000000'||i)::UUID, uid, tid, 'DRIVER', true, now())
    ON CONFLICT ON CONSTRAINT user_roles_user_id_tenant_id_role_key DO NOTHING;

    INSERT INTO driver_locations (id, driver_id, tenant_id, lat, lng, heading, speed, updated_at)
    VALUES (('dl000000-0000-0000-0000-00000000000'||i)::UUID, dpid, tid,
      41.8781+(random()-0.5)*0.1, -87.6298+(random()-0.5)*0.1, FLOOR(random()*360)::INT, 0, now())
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- 50 Riders
DO $$
DECLARE
  pw TEXT := '$2a$06$WETSvUXiOz3Llg6sLU1YH.c5yHtjP.UROcDuyeAUT3gUzQYYMg73C';
  tid UUID := '11111111-1111-1111-1111-111111111111';
  fn TEXT[] := ARRAY['Alice','Bob','Carol','Dan','Eve','Frank','Grace','Hank','Iris','Jack','Kate','Leo','Mia','Nick','Olivia','Paul','Quinn','Rose','Sam','Tina','Uma','Vince','Wendy','Xander','Yara','Zach','Abby','Ben','Chloe','Derek','Elena','Felix','Gina','Hugo','Ivy','Jake','Luna','Max','Nina','Oscar','Penny','Reed','Stella','Troy','Ursula','Victor','Willa','Xavier','Yolanda','Zoe'];
  ln TEXT[] := ARRAY['Smith','Jones','Williams','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez','Robinson','Clark','Rodriguez','Lewis','Lee','Walker','Hall','Allen','Young','Hernandez','King','Wright','Lopez','Hill','Scott','Green','Adams','Baker','Gonzalez','Nelson','Carter','Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart'];
  uid UUID; pad TEXT; i INT;
BEGIN
  FOR i IN 1..50 LOOP
    pad := LPAD(i::TEXT,2,'0');
    uid := ('r0000000-0000-0000-0000-0000000000'||pad)::UUID;

    INSERT INTO auth.users (id,instance_id,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,aud,role)
    VALUES (uid,'00000000-0000-0000-0000-000000000000',LOWER(fn[i])||'.'||LOWER(ln[i])||'@example.com',pw,now(),now(),now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name',fn[i],'last_name',ln[i]),
      'authenticated','authenticated')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO riders (id, tenant_id, name, email, phone, created_at)
    VALUES (('ri000000-0000-0000-0000-0000000000'||pad)::UUID, tid, fn[i]||' '||ln[i], LOWER(fn[i])||'.'||LOWER(ln[i])||'@example.com', '+1312555'||LPAD((100+i)::TEXT,4,'0'), now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_roles (id, user_id, tenant_id, role, is_active, granted_at)
    VALUES (('ur0r0000-0000-0000-0000-0000000000'||pad)::UUID, uid, tid, 'RIDER', true, now())
    ON CONFLICT ON CONSTRAINT user_roles_user_id_tenant_id_role_key DO NOTHING;
  END LOOP;
END $$;

-- Owner
INSERT INTO auth.users (id,instance_id,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,aud,role)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000000','owner@tenantalpha.com','$2a$06$WETSvUXiOz3Llg6sLU1YH.c5yHtjP.UROcDuyeAUT3gUzQYYMg73C',now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"first_name":"Alex","last_name":"Alpha"}'::jsonb,'authenticated','authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (id,user_id,tenant_id,role,is_active,granted_at)
VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','TENANT_OWNER',true,now())
ON CONFLICT ON CONSTRAINT user_roles_user_id_tenant_id_role_key DO NOTHING;

-- Platform Admin
INSERT INTO auth.users (id,instance_id,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,aud,role)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','00000000-0000-0000-0000-000000000000','admin@urwaydispatch.com','$2a$06$WETSvUXiOz3Llg6sLU1YH.c5yHtjP.UROcDuyeAUT3gUzQYYMg73C',now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"first_name":"Super","last_name":"Admin"}'::jsonb,'authenticated','authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (id,user_id,role,is_active,granted_at)
VALUES ('bbbbbbbb-cccc-dddd-eeee-ffffffffffff','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','PLATFORM_SUPER_ADMIN',true,now())
ON CONFLICT ON CONSTRAINT user_roles_user_id_tenant_id_role_key DO NOTHING;

-- Copy driver_profiles to drivers table (trips.driver_id FK references drivers, not driver_profiles)
INSERT INTO drivers (id, first_name, last_name, email, phone, tenant_id, is_active, status, rating, total_trips)
SELECT id, first_name, last_name, email, phone, tenant_id, is_active, status, rating, total_trips
FROM driver_profiles
WHERE tenant_id='11111111-1111-1111-1111-111111111111'
ON CONFLICT (id) DO NOTHING;

SELECT 'SEED COMPLETE' AS status,
  (SELECT count(*) FROM driver_profiles WHERE tenant_id='11111111-1111-1111-1111-111111111111') AS driver_profiles,
  (SELECT count(*) FROM drivers WHERE tenant_id='11111111-1111-1111-1111-111111111111') AS drivers,
  (SELECT count(*) FROM riders WHERE tenant_id='11111111-1111-1111-1111-111111111111') AS riders;
