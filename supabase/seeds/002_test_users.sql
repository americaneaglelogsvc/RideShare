-- Seed 002: 25 drivers + 10 riders per tenant = 250 drivers, 100 riders
-- GPS coordinates spread across Chicago metro area
-- All drivers set online with vehicles assigned

BEGIN;

-- ─── Helper: Chicago-area GPS spread ─────────────────────────────────────────
-- Center: 41.8781° N, -87.6298° W
-- Spread ~3 miles in each direction for realistic dispatch matching

-- ─── 1. Driver profiles (25 per tenant × 10 tenants) ─────────────────────────
-- Format: driver UUID = dXXXXXX-TTTT-4000-8000-DDDDDDDDDDD
-- TTTT = tenant suffix (0001..0010), DDDDDDDDDDDD = driver index 001..025

DO $$
DECLARE
  tenant_ids UUID[] := ARRAY[
    'a1b2c3d4-0001-4000-8000-000000000001'::uuid,
    'a1b2c3d4-0002-4000-8000-000000000002'::uuid,
    'a1b2c3d4-0003-4000-8000-000000000003'::uuid,
    'a1b2c3d4-0004-4000-8000-000000000004'::uuid,
    'a1b2c3d4-0005-4000-8000-000000000005'::uuid,
    'a1b2c3d4-0006-4000-8000-000000000006'::uuid,
    'a1b2c3d4-0007-4000-8000-000000000007'::uuid,
    'a1b2c3d4-0008-4000-8000-000000000008'::uuid,
    'a1b2c3d4-0009-4000-8000-000000000009'::uuid,
    'a1b2c3d4-0010-4000-8000-000000000010'::uuid
  ];
  tenant_suffixes TEXT[] := ARRAY['0001','0002','0003','0004','0005','0006','0007','0008','0009','0010'];
  tenant_categories TEXT[] := ARRAY[
    'black_sedan','black_suv','black_sedan','standard','standard',
    'black_sedan','black_sedan','standard','premium','standard'
  ];
  first_names TEXT[] := ARRAY[
    'James','Maria','Paul','Sarah','Tom','Lisa','Kevin','Diane','Carlos','Nina',
    'Eric','Fiona','Gary','Helen','Ivan','Julia','Karl','Lena','Marco','Nora',
    'Oscar','Paula','Quinn','Rosa','Steve'
  ];
  last_names TEXT[] := ARRAY[
    'Kim','Santos','Allen','Brown','Rivera','Chen','Park','Jones','Garcia','Lee',
    'Wang','Patel','Nguyen','Okafor','Petrov','Hassan','Torres','Müller','Costa','Ahmad'
  ];
  lats FLOAT[] := ARRAY[
    41.8781,41.8900,41.8650,41.9050,41.8500,
    41.8820,41.8720,41.9100,41.8600,41.8750,
    41.9200,41.8450,41.8830,41.8680,41.9000,
    41.8560,41.8910,41.8770,41.8640,41.9080,
    41.8490,41.9150,41.8700,41.8580,41.8860
  ];
  lngs FLOAT[] := ARRAY[
    -87.6298,-87.6150,-87.6450,-87.6100,-87.6600,
    -87.6350,-87.6200,-87.6050,-87.6500,-87.6280,
    -87.6000,-87.6700,-87.6320,-87.6420,-87.6130,
    -87.6550,-87.6230,-87.6370,-87.6480,-87.6080,
    -87.6630,-87.6020,-87.6260,-87.6510,-87.6190
  ];
  t_idx INT;
  d_idx INT;
  driver_id UUID;
  driver_suffix TEXT;
  fname TEXT;
  lname TEXT;
  cat TEXT;
  vehicle_id UUID;
BEGIN
  FOR t_idx IN 1..10 LOOP
    FOR d_idx IN 1..25 LOOP
      driver_suffix := LPAD(d_idx::TEXT, 3, '0');
      driver_id := ('d0000000-' || tenant_suffixes[t_idx] || '-4000-8000-0000000' || driver_suffix)::uuid;
      vehicle_id := ('v0000000-' || tenant_suffixes[t_idx] || '-4000-8000-0000000' || driver_suffix)::uuid;
      fname := first_names[d_idx];
      lname := last_names[(d_idx % 20) + 1];
      cat := tenant_categories[t_idx];

      -- Driver profile
      INSERT INTO driver_profiles
        (id, tenant_id, first_name, last_name, phone, email, status, is_active, rating, created_at)
      VALUES
        (driver_id, tenant_ids[t_idx], fname, lname,
         '+1312' || LPAD((t_idx * 1000 + d_idx)::TEXT, 7, '0'),
         lower(fname) || '.' || lower(lname) || d_idx::TEXT || '@test-driver.urway.dev',
         'online', true,
         ROUND((4.2 + (random() * 0.8))::numeric, 2),
         NOW())
      ON CONFLICT (id) DO UPDATE SET status = 'online', is_active = true;

      -- Vehicle
      INSERT INTO vehicles
        (id, tenant_id, driver_id, make, model, year, license_plate, category, color, is_active)
      VALUES
        (vehicle_id, tenant_ids[t_idx], driver_id,
         CASE cat
           WHEN 'premium'     THEN 'Mercedes-Benz'
           WHEN 'black_suv'   THEN 'Cadillac'
           WHEN 'black_sedan' THEN 'Lincoln'
           ELSE                    'Toyota'
         END,
         CASE cat
           WHEN 'premium'     THEN 'S-Class'
           WHEN 'black_suv'   THEN 'Escalade'
           WHEN 'black_sedan' THEN 'Continental'
           ELSE                    'Camry'
         END,
         2022 + (d_idx % 3),
         'IL-' || tenant_suffixes[t_idx] || '-' || LPAD(d_idx::TEXT,3,'0'),
         cat,
         CASE (d_idx % 4)
           WHEN 0 THEN 'Black'
           WHEN 1 THEN 'Midnight Black'
           WHEN 2 THEN 'Obsidian'
           ELSE        'Dark Gray'
         END,
         true)
      ON CONFLICT (id) DO NOTHING;

      -- Driver location (online, recent, spread around Chicago)
      INSERT INTO driver_locations
        (driver_id, tenant_id, lat, lng, heading, speed_mph, updated_at)
      VALUES
        (driver_id, tenant_ids[t_idx],
         lats[d_idx] + (random() * 0.01 - 0.005),
         lngs[d_idx] + (random() * 0.01 - 0.005),
         (random() * 360)::int,
         (random() * 35)::int,
         NOW() - (random() * INTERVAL '2 minutes'))
      ON CONFLICT (driver_id, tenant_id)
      DO UPDATE SET
        lat        = EXCLUDED.lat,
        lng        = EXCLUDED.lng,
        updated_at = EXCLUDED.updated_at;

    END LOOP;
  END LOOP;
END $$;

-- ─── 2. Rider profiles (10 per tenant × 10 tenants = 100 riders) ─────────────
DO $$
DECLARE
  tenant_ids UUID[] := ARRAY[
    'a1b2c3d4-0001-4000-8000-000000000001'::uuid,
    'a1b2c3d4-0002-4000-8000-000000000002'::uuid,
    'a1b2c3d4-0003-4000-8000-000000000003'::uuid,
    'a1b2c3d4-0004-4000-8000-000000000004'::uuid,
    'a1b2c3d4-0005-4000-8000-000000000005'::uuid,
    'a1b2c3d4-0006-4000-8000-000000000006'::uuid,
    'a1b2c3d4-0007-4000-8000-000000000007'::uuid,
    'a1b2c3d4-0008-4000-8000-000000000008'::uuid,
    'a1b2c3d4-0009-4000-8000-000000000009'::uuid,
    'a1b2c3d4-0010-4000-8000-000000000010'::uuid
  ];
  tenant_suffixes TEXT[] := ARRAY['0001','0002','0003','0004','0005','0006','0007','0008','0009','0010'];
  rider_names TEXT[] := ARRAY[
    'Alice','Bob','Carol','David','Eve',
    'Frank','Grace','Henry','Iris','Jack'
  ];
  t_idx INT;
  r_idx INT;
  rider_id UUID;
BEGIN
  FOR t_idx IN 1..10 LOOP
    FOR r_idx IN 1..10 LOOP
      rider_id := ('r0000000-' || tenant_suffixes[t_idx] || '-4000-8000-000000000' || LPAD(r_idx::TEXT,3,'0'))::uuid;

      INSERT INTO rider_profiles
        (id, tenant_id, first_name, last_name, phone, email, is_active, created_at)
      VALUES
        (rider_id, tenant_ids[t_idx],
         rider_names[r_idx],
         'TestRider-T' || t_idx::TEXT,
         '+1773' || LPAD((t_idx * 100 + r_idx)::TEXT, 7, '0'),
         lower(rider_names[r_idx]) || r_idx::TEXT || '.t' || t_idx::TEXT || '@test-rider.urway.dev',
         true,
         NOW())
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ─── 3. Tenant admin users (1 per tenant) ────────────────────────────────────
DO $$
DECLARE
  tenant_ids UUID[] := ARRAY[
    'a1b2c3d4-0001-4000-8000-000000000001'::uuid,
    'a1b2c3d4-0002-4000-8000-000000000002'::uuid,
    'a1b2c3d4-0003-4000-8000-000000000003'::uuid,
    'a1b2c3d4-0004-4000-8000-000000000004'::uuid,
    'a1b2c3d4-0005-4000-8000-000000000005'::uuid,
    'a1b2c3d4-0006-4000-8000-000000000006'::uuid,
    'a1b2c3d4-0007-4000-8000-000000000007'::uuid,
    'a1b2c3d4-0008-4000-8000-000000000008'::uuid,
    'a1b2c3d4-0009-4000-8000-000000000009'::uuid,
    'a1b2c3d4-0010-4000-8000-000000000010'::uuid
  ];
  tenant_names TEXT[] := ARRAY[
    'goldravenia','blackravenia','silverpeak','metrofleet','nightowl',
    'aerotransit','corporateride','greenwave','legacyluxe','urbanrush'
  ];
  t_idx INT;
  admin_id UUID;
BEGIN
  FOR t_idx IN 1..10 LOOP
    admin_id := ('ad000000-' || LPAD(t_idx::TEXT,4,'0') || '-4000-8000-000000000001')::uuid;

    INSERT INTO tenant_users
      (id, tenant_id, email, role, is_active, created_at)
    VALUES
      (admin_id, tenant_ids[t_idx],
       'admin@' || tenant_names[t_idx] || '.com',
       'TENANT_OWNER', true, NOW())
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

COMMIT;
