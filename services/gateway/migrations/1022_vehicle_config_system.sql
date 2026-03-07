-- Migration: Create tenant vehicle configurations table
-- This allows tenants to configure any vehicle type they want, not just luxury vehicles

-- Create tenant_vehicle_configs table
CREATE TABLE IF NOT EXISTS tenant_vehicle_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    passenger_capacity INTEGER NOT NULL CHECK (passenger_capacity >= 1 AND passenger_capacity <= 8),
    luggage_capacity VARCHAR(20) NOT NULL CHECK (luggage_capacity IN ('none', 'small', 'medium', 'large', 'extra_large')),
    accessibility_features JSONB DEFAULT '[]',
    base_rate_cents INTEGER NOT NULL CHECK (base_rate_cents >= 0),
    per_mile_rate_cents INTEGER NOT NULL CHECK (per_mile_rate_cents >= 0),
    per_minute_rate_cents INTEGER NOT NULL CHECK (per_minute_rate_cents >= 0),
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on tenant_id + vehicle_type
ALTER TABLE tenant_vehicle_configs ADD CONSTRAINT tenant_vehicle_unique 
    UNIQUE (tenant_id, vehicle_type);

-- Create indexes for performance
CREATE INDEX idx_tenant_vehicle_configs_tenant_id ON tenant_vehicle_configs(tenant_id);
CREATE INDEX idx_tenant_vehicle_configs_active ON tenant_vehicle_configs(tenant_id, is_active);
CREATE INDEX idx_tenant_vehicle_configs_type ON tenant_vehicle_configs(vehicle_type);

-- Add RLS (Row Level Security) policies
ALTER TABLE tenant_vehicle_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only access their own vehicle configurations
CREATE POLICY "Tenants can manage their vehicle configs" ON tenant_vehicle_configs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policy: System admins can access all vehicle configurations
CREATE POLICY "System admins full access" ON tenant_vehicle_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = current_setting('app.current_user_id')::UUID 
            AND users.role = 'system_admin'
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tenant_vehicle_configs_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_vehicle_configs_updated_at
    BEFORE UPDATE ON tenant_vehicle_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_vehicle_configs_updated_at();

-- Add passenger requirements to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS passenger_requirements JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_vehicle_type VARCHAR(50);

-- Create index for passenger requirements queries
CREATE INDEX IF NOT EXISTS idx_bookings_passenger_requirements ON bookings USING GIN (passenger_requirements);
CREATE INDEX IF NOT EXISTS idx_bookings_preferred_vehicle ON bookings(preferred_vehicle_type);

-- Add comments for documentation
COMMENT ON TABLE tenant_vehicle_configs IS 'Tenant-specific vehicle configurations allowing flexible fleet management';
COMMENT ON COLUMN tenant_vehicle_configs.vehicle_type IS 'Internal vehicle type identifier (e.g., economy_sedan, luxury_suv)';
COMMENT ON COLUMN tenant_vehicle_configs.display_name IS 'Customer-facing vehicle name (e.g., Economy Sedan, Luxury SUV)';
COMMENT ON COLUMN tenant_vehicle_configs.luggage_capacity IS 'Luggage capacity: none, small, medium, large, extra_large';
COMMENT ON COLUMN tenant_vehicle_configs.accessibility_features IS 'Array of accessibility features available';
COMMENT ON COLUMN tenant_vehicle_configs.features IS 'Array of vehicle features and amenities';
COMMENT ON COLUMN bookings.passenger_requirements IS 'JSON object containing passenger needs assessment data';
COMMENT ON COLUMN bookings.preferred_vehicle_type IS 'Vehicle type preferred by passenger during booking';

-- Sample data for testing (will be removed in production)
-- This shows the flexibility - tenants can configure ANY vehicle type
INSERT INTO tenant_vehicle_configs (
    tenant_id, 
    vehicle_type, 
    display_name, 
    description, 
    passenger_capacity, 
    luggage_capacity, 
    base_rate_cents, 
    per_mile_rate_cents, 
    per_minute_rate_cents, 
    features
) VALUES 
-- Economy vehicles
('demo-tenant-id', 'economy_sedan', 'Economy Sedan', 'Affordable and reliable transportation', 4, 'medium', 250, 125, 25, 
 ARRAY['Air Conditioning', 'Music System', 'Seat Belts']),
('demo-tenant-id', 'economy_hatchback', 'Economy Hatchback', 'Compact and fuel-efficient', 4, 'small', 200, 100, 20, 
 ARRAY['Air Conditioning', 'Music System', 'Great MPG']),

-- Standard vehicles  
('demo-tenant-id', 'standard_sedan', 'Standard Sedan', 'Comfortable mid-size car', 4, 'medium', 350, 150, 30, 
 ARRAY['Air Conditioning', 'Music System', 'Comfortable Seats']),
('demo-tenant-id', 'standard_suv', 'Standard SUV', 'More space for passengers and luggage', 6, 'large', 450, 175, 35, 
 ARRAY['Air Conditioning', 'Music System', 'Extra Storage', 'Family Friendly']),

-- Premium vehicles
('demo-tenant-id', 'premium_sedan', 'Premium Sedan', 'Upgraded comfort and style', 4, 'medium', 600, 250, 50, 
 ARRAY['Leather Seats', 'Premium Sound', 'Climate Control', 'USB Charging']),
('demo-tenant-id', 'premium_van', 'Premium Van', 'Spacious luxury for groups', 8, 'extra_large', 800, 300, 75, 
 ARRAY['Leather Seats', 'Premium Sound', 'Climate Control', 'Extra Legroom']),

-- Luxury vehicles (the original focus)
('demo-tenant-id', 'luxury_sedan', 'Luxury Sedan', 'High-end luxury transportation', 4, 'medium', 800, 300, 75, 
 ARRAY['Leather Seats', 'Premium Sound', 'Climate Control', 'Wi-Fi', 'Complimentary Water']),
('demo-tenant-id', 'luxury_suv', 'Luxury SUV', 'Spacious luxury vehicle', 6, 'large', 1000, 350, 100, 
 ARRAY['Leather Seats', 'Premium Sound', 'Climate Control', 'Wi-Fi', 'Extra Storage', 'Complimentary Water']),

-- Specialty vehicles (showing ultimate flexibility)
('demo-tenant-id', 'wheelchair_van', 'Wheelchair Accessible Van', 'Fully accessible transportation', 4, 'large', 1200, 400, 120, 
 ARRAY['Wheelchair Lift', 'Tie Downs', 'Climate Control', 'Extra Space']),
('demo-tenant-id', 'party_bus', 'Party Bus', 'Group transportation and entertainment', 20, 'extra_large', 2000, 500, 200, 
 ARRAY['Sound System', 'Lighting', 'Dance Floor', 'Climate Control', 'Party Seating']),
('demo-tenant-id', 'electric_tesla', 'Tesla Model S', 'Premium electric luxury', 4, 'medium', 900, 320, 85, 
 ARRAY['Electric Motor', 'Autopilot', 'Premium Sound', 'Climate Control', 'Wi-Fi', 'Supercharger Ready'])
ON CONFLICT DO NOTHING;
