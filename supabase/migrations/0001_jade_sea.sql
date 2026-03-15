/*
  # Create drivers and vehicles tables

  1. New Tables
    - `drivers`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `address` (text, nullable)
      - `rating` (numeric, default 0)
      - `total_trips` (integer, default 0)
      - `status` (text, default 'offline')
      - `is_active` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `vehicles`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, foreign key)
      - `make` (text)
      - `model` (text)
      - `year` (integer)
      - `color` (text)
      - `license_plate` (text, unique)
      - `category` (text)
      - `photo_urls` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `driver_locations`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, foreign key)
      - `lat` (numeric)
      - `lng` (numeric)
      - `heading` (numeric, nullable)
      - `speed` (numeric, nullable)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  address text,
  rating numeric DEFAULT 0,
  total_trips integer DEFAULT 0,
  status text DEFAULT 'offline',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  color text NOT NULL,
  license_plate text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'black_sedan',
  photo_urls text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create driver_locations table
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  heading numeric,
  speed numeric,
  updated_at timestamptz DEFAULT now()
);

-- Create trips table for tracking ride history
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  rider_id uuid,
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  pickup_lat numeric NOT NULL,
  pickup_lng numeric NOT NULL,
  dropoff_lat numeric NOT NULL,
  dropoff_lng numeric NOT NULL,
  distance_miles numeric,
  duration_minutes integer,
  fare_cents integer NOT NULL,
  net_payout_cents integer NOT NULL,
  commission_cents integer NOT NULL,
  status text DEFAULT 'requested',
  rating integer,
  special_instructions text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create ride_offers table for managing active offers
CREATE TABLE IF NOT EXISTS ride_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  trip_id uuid NOT NULL REFERENCES trips(id),
  rider_name text NOT NULL,
  rider_phone text,
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  pickup_lat numeric NOT NULL,
  pickup_lng numeric NOT NULL,
  dropoff_lat numeric NOT NULL,
  dropoff_lng numeric NOT NULL,
  estimated_fare_cents integer NOT NULL,
  net_payout_cents integer NOT NULL,
  estimated_distance_miles numeric NOT NULL,
  estimated_duration_minutes integer NOT NULL,
  pickup_eta_minutes integer NOT NULL,
  category text NOT NULL,
  special_instructions text,
  expires_at timestamptz NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_offers ENABLE ROW LEVEL SECURITY;

-- Create policies for drivers table
CREATE POLICY "Drivers can read own data"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Drivers can update own data"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for vehicles table
CREATE POLICY "Drivers can read own vehicle"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can update own vehicle"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid());

-- Create policies for driver_locations table
CREATE POLICY "Drivers can manage own location"
  ON driver_locations
  FOR ALL
  TO authenticated
  USING (driver_id = auth.uid());

-- Create policies for trips table
CREATE POLICY "Drivers can read own trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- Create policies for ride_offers table
CREATE POLICY "Drivers can read own offers"
  ON ride_offers
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can update own offers"
  ON ride_offers
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON driver_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_ride_offers_driver_id ON ride_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_offers_expires_at ON ride_offers(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();