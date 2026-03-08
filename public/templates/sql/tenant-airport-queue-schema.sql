-- Tenant-Specific Airport Queue System Schema
-- Each tenant manages their own airport operations independently

-- Tenant-specific airport queues
CREATE TABLE tenant_airport_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    airport_code VARCHAR(3) NOT NULL,
    airport_name VARCHAR(100),
    terminal VARCHAR(10),
    service_type VARCHAR(50) NOT NULL, -- 'black_car', 'suv', 'luxury', etc.
    queue_name VARCHAR(100) NOT NULL,
    pickup_zone VARCHAR(50),
    max_queue_size INTEGER DEFAULT 50,
    average_wait_time INTEGER DEFAULT 15, -- minutes
    is_active BOOLEAN DEFAULT true,
    operating_hours JSONB, -- {"open": "06:00", "close": "23:00"}
    regulations JSONB, -- Airport-specific rules and regulations
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, airport_code, terminal, service_type)
);

-- Driver queue positions (tenant-specific)
CREATE TABLE driver_queue_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    queue_id UUID NOT NULL,
    position INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    estimated_wait_time INTEGER, -- minutes
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'called', 'serving', 'completed'
    last_position_update TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id),
    FOREIGN KEY (queue_id) REFERENCES tenant_airport_queues(id),
    UNIQUE(tenant_id, driver_id, queue_id)
);

-- Airport configurations (tenant-specific)
CREATE TABLE tenant_airport_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    airport_code VARCHAR(3) NOT NULL,
    airport_name VARCHAR(100),
    regulations JSONB, -- Local transportation authority requirements
    pickup_zones JSONB, -- {"A": {"lat": 41.9742, "lng": -87.9073, "description": "Terminal 1 Door 3"}}
    operating_hours JSONB, -- {"monday": {"open": "06:00", "close": "23:00"}, ...}
    fees JSONB, -- Airport fees and surcharges
    restrictions JSONB, -- Vehicle restrictions, driver requirements
    contact_info JSONB, -- Airport authority contact information
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, airport_code)
);

-- Queue activity logs for analytics
CREATE TABLE queue_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    queue_id UUID NOT NULL,
    driver_id UUID,
    activity_type VARCHAR(20) NOT NULL, -- 'joined', 'left', 'called', 'served', 'no_show'
    activity_data JSONB, -- Additional activity details
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (queue_id) REFERENCES tenant_airport_queues(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Driver airport preferences (tenant-specific)
CREATE TABLE driver_airport_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    airport_code VARCHAR(3) NOT NULL,
    preferred_terminals TEXT[], -- Array of preferred terminals
    max_wait_time INTEGER, -- Maximum willing to wait in minutes
    service_types TEXT[], -- Preferred service types
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id),
    UNIQUE(tenant_id, driver_id, airport_code)
);

-- Create indexes for performance
CREATE INDEX idx_tenant_airport_queues_tenant_id ON tenant_airport_queues(tenant_id);
CREATE INDEX idx_tenant_airport_queues_airport_code ON tenant_airport_queues(airport_code);
CREATE INDEX idx_driver_queue_positions_tenant_driver ON driver_queue_positions(tenant_id, driver_id);
CREATE INDEX idx_driver_queue_positions_queue_status ON driver_queue_positions(queue_id, status);
CREATE INDEX idx_queue_activity_logs_tenant_queue ON queue_activity_logs(tenant_id, queue_id);
CREATE INDEX idx_queue_activity_logs_created_at ON queue_activity_logs(created_at);
CREATE INDEX idx_driver_airport_preferences_tenant_driver ON driver_airport_preferences(tenant_id, driver_id);

-- Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE tenant_airport_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_queue_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_airport_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_airport_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only tenants can access their own data
CREATE POLICY tenant_airport_queues_policy ON tenant_airport_queues
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY driver_queue_positions_policy ON driver_queue_positions
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_airport_configs_policy ON tenant_airport_configs
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY queue_activity_logs_policy ON queue_activity_logs
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY driver_airport_preferences_policy ON driver_airport_preferences
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Functions for queue management
CREATE OR REPLACE FUNCTION join_queue(
    p_tenant_id UUID,
    p_driver_id UUID,
    p_queue_id UUID
) RETURNS UUID AS $$
DECLARE
    v_position INTEGER;
    v_queue_id UUID;
    v_existing_position UUID;
BEGIN
    -- Check if driver is already in this queue
    SELECT id INTO v_existing_position
    FROM driver_queue_positions
    WHERE tenant_id = p_tenant_id AND driver_id = p_driver_id AND queue_id = p_queue_id;
    
    IF v_existing_position IS NOT NULL THEN
        RAISE EXCEPTION 'Driver already in queue';
    END IF;
    
    -- Get next position in queue
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_position
    FROM driver_queue_positions
    WHERE tenant_id = p_tenant_id AND queue_id = p_queue_id AND status = 'waiting';
    
    -- Insert driver into queue
    INSERT INTO driver_queue_positions (tenant_id, driver_id, queue_id, position)
    VALUES (p_tenant_id, p_driver_id, p_queue_id, v_position)
    RETURNING id INTO v_queue_id;
    
    -- Log activity
    INSERT INTO queue_activity_logs (tenant_id, queue_id, driver_id, activity_type, activity_data)
    VALUES (p_tenant_id, p_queue_id, p_driver_id, 'joined', json_build_object('position', v_position));
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION leave_queue(
    p_tenant_id UUID,
    p_driver_id UUID,
    p_queue_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_position_id UUID;
BEGIN
    -- Get driver's position in queue
    SELECT id INTO v_position_id
    FROM driver_queue_positions
    WHERE tenant_id = p_tenant_id AND driver_id = p_driver_id AND queue_id = p_queue_id;
    
    IF v_position_id IS NULL THEN
        RAISE EXCEPTION 'Driver not in queue';
    END IF;
    
    -- Remove from queue
    DELETE FROM driver_queue_positions WHERE id = v_position_id;
    
    -- Reorder remaining positions
    UPDATE driver_queue_positions
    SET position = position - 1
    WHERE tenant_id = p_tenant_id 
    AND queue_id = p_queue_id 
    AND status = 'waiting'
    AND position > (SELECT position FROM driver_queue_positions WHERE id = v_position_id);
    
    -- Log activity
    INSERT INTO queue_activity_logs (tenant_id, queue_id, driver_id, activity_type, activity_data)
    VALUES (p_tenant_id, p_queue_id, p_driver_id, 'left', '{}');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_queue_positions(p_tenant_id UUID, p_queue_id UUID)
RETURNS VOID AS $$
DECLARE
    v_position INTEGER := 1;
    driver_record RECORD;
BEGIN
    -- Reorder all waiting drivers in queue
    FOR driver_record IN 
        SELECT id, driver_id 
        FROM driver_queue_positions 
        WHERE tenant_id = p_tenant_id AND queue_id = p_queue_id AND status = 'waiting'
        ORDER BY joined_at ASC
    LOOP
        UPDATE driver_queue_positions 
        SET position = v_position, last_position_update = NOW()
        WHERE id = driver_record.id;
        v_position := v_position + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- View for queue status
CREATE VIEW tenant_queue_status AS
SELECT 
    q.id as queue_id,
    q.tenant_id,
    q.airport_code,
    q.airport_name,
    q.terminal,
    q.service_type,
    q.queue_name,
    q.pickup_zone,
    q.max_queue_size,
    q.is_active,
    COUNT(dqp.id) as current_queue_size,
    AVG(dqp.estimated_wait_time) as average_wait_time,
    MAX(dqp.joined_at) as last_driver_joined
FROM tenant_airport_queues q
LEFT JOIN driver_queue_positions dqp ON q.id = dqp.queue_id AND dqp.status = 'waiting'
WHERE q.is_active = true
GROUP BY q.id, q.tenant_id, q.airport_code, q.airport_name, q.terminal, q.service_type, q.queue_name, q.pickup_zone, q.max_queue_size, q.is_active;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_airport_queues_updated_at
    BEFORE UPDATE ON tenant_airport_queues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_airport_configs_updated_at
    BEFORE UPDATE ON tenant_airport_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_airport_preferences_updated_at
    BEFORE UPDATE ON driver_airport_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
