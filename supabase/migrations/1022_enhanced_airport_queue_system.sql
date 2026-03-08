-- Enhanced Airport Queue System Schema
-- Geofence zones, enroute tracking, and automatic queue formation

-- Tenant-specific airport geofence zones
CREATE TABLE tenant_airport_geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    airport_code TEXT NOT NULL,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('approach', 'staging', 'active', 'pickup')),
    zone_name TEXT NOT NULL,
    coordinates JSONB NOT NULL, -- GeoJSON polygon or circle
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_meters INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, airport_code, zone_type)
);

-- Driver enroute status and zone tracking
CREATE TABLE driver_enroute_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    airport_code TEXT NOT NULL,
    current_zone TEXT,
    previous_zone TEXT,
    eta_minutes INTEGER,
    actual_eta_minutes INTEGER,
    status TEXT DEFAULT 'enroute' CHECK (status IN ('enroute', 'approaching', 'staging', 'active', 'pickup', 'arrived')),
    entered_current_zone_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, driver_id, airport_code)
);

-- Zone transition events for analytics
CREATE TABLE driver_zone_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    airport_code TEXT NOT NULL,
    from_zone TEXT,
    to_zone TEXT NOT NULL,
    transition_time TIMESTAMPTZ DEFAULT now(),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    eta_accuracy INTEGER -- difference between estimated and actual ETA
);

-- Enhanced airport queue with zone awareness
ALTER TABLE airport_queue ADD COLUMN zone_type TEXT;
ALTER TABLE airport_queue ADD COLUMN enroute_eta INTEGER;
ALTER TABLE airport_queue ADD COLUMN actual_arrival_time TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX idx_geofences_tenant_airport ON tenant_airport_geofences(tenant_id, airport_code, is_active);
CREATE INDEX idx_geofences_zone_type ON tenant_airport_geofences(zone_type, is_active);
CREATE INDEX idx_enroute_status_driver_airport ON driver_enroute_status(driver_id, airport_code, status);
CREATE INDEX idx_enroute_status_tenant_airport ON driver_enroute_status(tenant_id, airport_code, status);
CREATE INDEX idx_zone_transitions_driver_time ON driver_zone_transitions(driver_id, transition_time);
CREATE INDEX idx_zone_transitions_tenant_airport ON driver_zone_transitions(tenant_id, airport_code, transition_time);

-- Row Level Security
ALTER TABLE tenant_airport_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_enroute_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_zone_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY geofences_tenant_policy ON tenant_airport_geofences
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY enroute_status_tenant_policy ON driver_enroute_status
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY zone_transitions_tenant_policy ON driver_zone_transitions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Functions for geofence detection
CREATE OR REPLACE FUNCTION detect_driver_zone(
    p_tenant_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_airport_code TEXT
) RETURNS TABLE(zone_type TEXT, zone_name TEXT, zone_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.zone_type,
        g.zone_name,
        g.id as zone_id
    FROM tenant_airport_geofences g
    WHERE g.tenant_id = p_tenant_id
    AND g.airport_code = p_airport_code
    AND g.is_active = true
    AND (
        -- Circle detection
        (g.coordinates->>'type' = 'circle' AND 
         ST_DWithin(
           ST_MakePoint(p_lng, p_lat),
           ST_MakePoint(g.center_lng, g.center_lat),
           g.radius_meters
         ))
        OR
        -- Polygon detection
        (g.coordinates->>'type' = 'polygon' AND
         ST_Contains(
           ST_GeomFromGeoJSON(g.coordinates),
           ST_MakePoint(p_lng, p_lat)
         ))
    )
    ORDER BY 
        CASE g.zone_type 
            WHEN 'pickup' THEN 1
            WHEN 'active' THEN 2
            WHEN 'staging' THEN 3
            WHEN 'approach' THEN 4
        END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update driver zone
CREATE OR REPLACE FUNCTION update_driver_zone(
    p_tenant_id UUID,
    p_driver_id UUID,
    p_airport_code TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
) RETURNS TABLE(
    previous_zone TEXT,
    current_zone TEXT,
    zone_changed BOOLEAN
) AS $$
DECLARE
    v_current_zone TEXT;
    v_previous_zone TEXT;
    v_zone_changed BOOLEAN := false;
    v_zone_id UUID;
BEGIN
    -- Detect current zone
    SELECT zone_type, id INTO v_current_zone, v_zone_id
    FROM detect_driver_zone(p_tenant_id, p_lat, p_lng, p_airport_code);
    
    -- Get previous zone
    SELECT current_zone INTO v_previous_zone
    FROM driver_enroute_status
    WHERE tenant_id = p_tenant_id
    AND driver_id = p_driver_id
    AND airport_code = p_airport_code;
    
    -- Check if zone changed
    IF COALESCE(v_previous_zone, 'outside') != COALESCE(v_current_zone, 'outside') THEN
        v_zone_changed := true;
        
        -- Update enroute status
        INSERT INTO driver_enroute_status (
            tenant_id, driver_id, airport_code, current_zone, previous_zone, 
            status, entered_current_zone_at, updated_at
        ) VALUES (
            p_tenant_id, p_driver_id, p_airport_code, v_current_zone, v_previous_zone,
            COALESCE(v_current_zone, 'enroute'), now(), now()
        )
        ON CONFLICT (tenant_id, driver_id, airport_code)
        DO UPDATE SET
            current_zone = v_current_zone,
            previous_zone = v_previous_zone,
            status = COALESCE(v_current_zone, 'enroute'),
            entered_current_zone_at = CASE 
                WHEN v_current_zone != v_previous_zone THEN now()
                ELSE driver_enroute_status.entered_current_zone_at
            END,
            updated_at = now();
        
        -- Record zone transition
        INSERT INTO driver_zone_transitions (
            tenant_id, driver_id, airport_code, from_zone, to_zone, lat, lng
        ) VALUES (
            p_tenant_id, p_driver_id, p_airport_code, v_previous_zone, v_current_zone, p_lat, p_lng
        );
        
        -- Auto-enter queue if entering active zone
        IF v_current_zone = 'active' AND v_previous_zone != 'active' THEN
            PERFORM enter_airport_queue(p_tenant_id, p_driver_id, p_airport_code, 'active');
        END IF;
    END IF;
    
    RETURN QUERY SELECT v_previous_zone, v_current_zone, v_zone_changed;
END;
$$ LANGUAGE plpgsql;

-- Function to mark driver as enroute
CREATE OR REPLACE FUNCTION mark_driver_enroute(
    p_tenant_id UUID,
    p_driver_id UUID,
    p_airport_code TEXT,
    p_eta_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_existing_status TEXT;
BEGIN
    -- Check if already enroute for this airport
    SELECT status INTO v_existing_status
    FROM driver_enroute_status
    WHERE tenant_id = p_tenant_id
    AND driver_id = p_driver_id
    AND airport_code = p_airport_code;
    
    -- Insert or update enroute status
    INSERT INTO driver_enroute_status (
        tenant_id, driver_id, airport_code, eta_minutes, status, updated_at
    ) VALUES (
        p_tenant_id, p_driver_id, p_airport_code, p_eta_minutes, 'enroute', now()
    )
    ON CONFLICT (tenant_id, driver_id, airport_code)
    DO UPDATE SET
        eta_minutes = p_eta_minutes,
        status = 'enroute',
        updated_at = now()
    WHERE driver_enroute_status.status NOT IN ('active', 'pickup');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get drivers in zone
CREATE OR REPLACE FUNCTION get_drivers_in_zone(
    p_tenant_id UUID,
    p_airport_code TEXT,
    p_zone_type TEXT
) RETURNS TABLE(
    driver_id UUID,
    driver_name TEXT,
    entered_zone_at TIMESTAMPTZ,
    eta_minutes INTEGER,
    queue_position INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        des.driver_id,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver ' || des.driver_id::TEXT) as driver_name,
        des.entered_current_zone_at,
        des.eta_minutes,
        (
            SELECT COUNT(*) + 1
            FROM airport_queue aq
            WHERE aq.tenant_id = p_tenant_id
            AND aq.airport_code = p_airport_code
            AND aq.status = 'active'
            AND aq.entered_at <= des.entered_current_zone_at
        ) as queue_position
    FROM driver_enroute_status des
    LEFT JOIN driver_profiles dp ON dp.driver_id = des.driver_id AND dp.tenant_id = p_tenant_id
    WHERE des.tenant_id = p_tenant_id
    AND des.airport_code = p_airport_code
    AND des.current_zone = p_zone_type
    AND des.status = p_zone_type
    ORDER BY des.entered_current_zone_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to form queue from zone
CREATE OR REPLACE FUNCTION form_queue_from_zone(
    p_tenant_id UUID,
    p_airport_code TEXT,
    p_zone_type TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_drivers_added INTEGER := 0;
    driver_record RECORD;
BEGIN
    -- Get drivers in staging zone and move to active queue
    FOR driver_record IN 
        SELECT driver_id, entered_current_zone_at
        FROM get_drivers_in_zone(p_tenant_id, p_airport_code, p_zone_type)
    LOOP
        -- Check if already in queue
        IF NOT EXISTS (
            SELECT 1 FROM airport_queue 
            WHERE tenant_id = p_tenant_id 
            AND driver_id = driver_record.driver_id 
            AND airport_code = p_airport_code 
            AND status IN ('prequeue', 'active')
        ) THEN
            -- Add to active queue
            INSERT INTO airport_queue (
                tenant_id, driver_id, airport_code, zone, status, 
                entered_at, zone_type, enroute_eta
            ) VALUES (
                p_tenant_id, driver_record.driver_id, p_airport_code, 'active', 'active',
                driver_record.entered_current_zone_at, p_zone_type,
                (SELECT eta_minutes FROM driver_enroute_status 
                 WHERE tenant_id = p_tenant_id 
                 AND driver_id = driver_record.driver_id 
                 AND airport_code = p_airport_code)
            );
            
            v_drivers_added := v_drivers_added + 1;
        END IF;
    END LOOP;
    
    RETURN v_drivers_added;
END;
$$ LANGUAGE plpgsql;

-- Function to get zone flow analytics
CREATE OR REPLACE FUNCTION get_zone_flow_analytics(
    p_tenant_id UUID,
    p_airport_code TEXT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
) RETURNS TABLE(
    zone_type TEXT,
    total_transitions INTEGER,
    avg_time_in_minutes NUMERIC,
    peak_hour INTEGER,
    efficiency_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH zone_times AS (
        SELECT 
            dzt.driver_id,
            dzt.to_zone as zone_type,
            dzt.transition_time,
            LEAD(dzt.transition_time) OVER (
                PARTITION BY dzt.driver_id, dzt.airport_code 
                ORDER BY dzt.transition_time
            ) as next_transition_time
        FROM driver_zone_transitions dzt
        WHERE dzt.tenant_id = p_tenant_id
        AND dzt.airport_code = p_airport_code
        AND dzt.transition_time BETWEEN p_start_date AND p_end_date
    ),
    zone_durations AS (
        SELECT 
            zone_type,
            EXTRACT(EPOCH FROM (next_transition_time - transition_time)) / 60 as duration_minutes
        FROM zone_times
        WHERE next_transition_time IS NOT NULL
    )
    SELECT 
        zone_type,
        COUNT(*) as total_transitions,
        ROUND(AVG(duration_minutes), 2) as avg_time_in_minutes,
        EXTRACT(HOUR FROM MAX(transition_time))::INTEGER as peak_hour,
        ROUND(
            CASE 
                WHEN zone_type = 'active' THEN 
                    100 * (COUNT(*) / NULLIF(SUM(COUNT(*) OVER (PARTITION BY 1)), 0))
                ELSE 
                    50 -- baseline efficiency for other zones
            END, 2
        ) as efficiency_score
    FROM zone_times
    GROUP BY zone_type
    ORDER BY 
        CASE zone_type 
            WHEN 'approach' THEN 1
            WHEN 'staging' THEN 2
            WHEN 'active' THEN 3
            WHEN 'pickup' THEN 4
        END;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_airport_geofences_updated_at
    BEFORE UPDATE ON tenant_airport_geofences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample geofence data for ORD (O'Hare)
INSERT INTO tenant_airport_geofences (tenant_id, airport_code, zone_type, zone_name, coordinates, center_lat, center_lng, radius_meters) VALUES
-- Approach zone (10 miles radius)
('goldravenia', 'ORD', 'approach', 'ORD Approach Zone', 
 '{"type": "circle", "center": [-87.9047, 41.9742], "radius": 16093}',
 41.9742, -87.9047, 16093),

-- Staging zone (3 miles radius)
('goldravenia', 'ORD', 'staging', 'ORD Staging Zone',
 '{"type": "circle", "center": [-87.9047, 41.9742], "radius": 4828}',
 41.9742, -87.9047, 4828),

-- Active zone (0.5 miles radius)
('goldravenia', 'ORD', 'active', 'ORD Active Queue Zone',
 '{"type": "circle", "center": [-87.9047, 41.9742], "radius": 804}',
 41.9742, -87.9047, 804),

-- Pickup zone (terminal areas)
('goldravenia', 'ORD', 'pickup', 'ORD Pickup Zone',
 '{"type": "polygon", "coordinates": [[[-87.9073, 41.9775], [-87.9021, 41.9775], [-87.9021, 41.9709], [-87.9073, 41.9709], [-87.9073, 41.9775]]]}',
 41.9742, -87.9047, 500);

-- Sample for MDW (Midway)
INSERT INTO tenant_airport_geofences (tenant_id, airport_code, zone_type, zone_name, coordinates, center_lat, center_lng, radius_meters) VALUES
-- Approach zone (8 miles radius)
('goldravenia', 'MDW', 'approach', 'MDW Approach Zone',
 '{"type": "circle", "center": [-87.7522, 41.7841], "radius": 12874}',
 41.7841, -87.7522, 12874),

-- Staging zone (2 miles radius)
('goldravenia', 'MDW', 'staging', 'MDW Staging Zone',
 '{"type": "circle", "center": [-87.7522, 41.7841], "radius": 3218}',
 41.7841, -87.7522, 3218),

-- Active zone (0.5 miles radius)
('goldravenia', 'MDW', 'active', 'MDW Active Queue Zone',
 '{"type": "circle", "center": [-87.7522, 41.7841], "radius": 804}',
 41.7841, -87.7522, 804),

-- Pickup zone (terminal areas)
('goldravenia', 'MDW', 'pickup', 'MDW Pickup Zone',
 '{"type": "polygon", "coordinates": [[[-87.7545, 41.7868], [-87.7499, 41.7868], [-87.7499, 41.7814], [-87.7545, 41.7814], [-87.7545, 41.7868]]]}',
 41.7841, -87.7522, 400);
