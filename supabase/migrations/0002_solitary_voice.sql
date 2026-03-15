/*
  # Create additional tables for complete rideshare functionality

  1. New Tables
    - `riders` - Store rider information
    - `bookings` - Store booking records
    - `quotes` - Store pricing quotes
    - `payments` - Store payment information
    - `ratings` - Store trip ratings and feedback

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for data access
*/

-- Create riders table
CREATE TABLE IF NOT EXISTS riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES riders(id),
  trip_id uuid REFERENCES trips(id),
  quote_id uuid,
  rider_name text NOT NULL,
  rider_phone text NOT NULL,
  pickup_time timestamptz,
  special_instructions text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  pickup_location jsonb NOT NULL,
  dropoff_location jsonb NOT NULL,
  total_cents integer NOT NULL,
  line_items jsonb NOT NULL,
  surge_multiplier numeric DEFAULT 1.0,
  surge_cap numeric DEFAULT 2.0,
  eta_minutes integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id),
  rider_id uuid NOT NULL REFERENCES riders(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  amount_cents integer NOT NULL,
  payment_method text NOT NULL,
  payment_intent_id text,
  status text DEFAULT 'pending',
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id),
  rider_id uuid NOT NULL REFERENCES riders(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  rider_rating integer CHECK (rider_rating >= 1 AND rider_rating <= 5),
  driver_rating integer CHECK (driver_rating >= 1 AND driver_rating <= 5),
  rider_feedback text,
  driver_feedback text,
  created_at timestamptz DEFAULT now()
);

-- Create airport_queues table for managing airport pickup queues
CREATE TABLE IF NOT EXISTS airport_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  airport_code text NOT NULL,
  queue_position integer NOT NULL,
  joined_at timestamptz DEFAULT now(),
  status text DEFAULT 'waiting',
  estimated_wait_minutes integer
);

-- Enable Row Level Security
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport_queues ENABLE ROW LEVEL SECURITY;

-- Create policies for riders table
CREATE POLICY "Riders can read own data"
  ON riders
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Create policies for bookings table
CREATE POLICY "Users can read own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (true); -- Will be refined based on user type

-- Create policies for quotes table
CREATE POLICY "Anyone can read quotes"
  ON quotes
  FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

-- Create policies for payments table
CREATE POLICY "Users can read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = rider_id::text OR auth.uid()::text = driver_id::text);

-- Create policies for ratings table
CREATE POLICY "Users can read own ratings"
  ON ratings
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = rider_id::text OR auth.uid()::text = driver_id::text);

-- Create policies for airport_queues table
CREATE POLICY "Drivers can manage own queue status"
  ON airport_queues
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = driver_id::text);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_riders_phone ON riders(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_rider_id ON bookings(rider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_trip_id ON payments(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_ratings_trip_id ON ratings(trip_id);
CREATE INDEX IF NOT EXISTS idx_airport_queues_airport_code ON airport_queues(airport_code);
CREATE INDEX IF NOT EXISTS idx_airport_queues_status ON airport_queues(status);

-- Create triggers for updated_at
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON riders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some sample data for testing
INSERT INTO quotes (id, category, pickup_location, dropoff_location, total_cents, line_items, eta_minutes, expires_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'black_sedan',
  '{"address": "123 N Michigan Ave, Chicago, IL", "lat": 41.8781, "lng": -87.6298}',
  '{"address": "O''Hare International Airport, Terminal 1", "lat": 41.9786, "lng": -87.9048}',
  4500,
  '[{"name": "Base Fare", "amount_cents": 1000}, {"name": "Distance", "amount_cents": 2600, "description": "18.5 miles"}, {"name": "Time", "amount_cents": 900, "description": "35 minutes"}]',
  8,
  now() + interval '15 minutes'
);