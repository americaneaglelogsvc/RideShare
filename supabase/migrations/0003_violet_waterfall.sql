/*
  # Create payment-related tables

  1. New Tables
    - `payments` - Store payment transactions
    - `driver_payouts` - Store driver payout records
    - `payment_refunds` - Store refund records
    - `saved_payment_methods` - Store customer payment methods

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create payments table (enhanced version)
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
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

-- Create driver_payouts table
CREATE TABLE IF NOT EXISTS driver_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  amount_cents integer NOT NULL,
  bank_account jsonb NOT NULL,
  fluidpay_payout_id text,
  status text DEFAULT 'pending',
  estimated_arrival timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create payment_refunds table
CREATE TABLE IF NOT EXISTS payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  amount_cents integer NOT NULL,
  fluidpay_refund_id text,
  status text DEFAULT 'pending',
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create saved_payment_methods table
CREATE TABLE IF NOT EXISTS saved_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES riders(id),
  fluidpay_method_id text NOT NULL,
  type text NOT NULL, -- 'card' or 'bank_account'
  last_four text,
  brand text, -- for cards: 'visa', 'mastercard', etc.
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create driver_bank_accounts table
CREATE TABLE IF NOT EXISTS driver_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  account_holder_name text NOT NULL,
  account_number_last_four text NOT NULL,
  routing_number text NOT NULL,
  account_type text NOT NULL, -- 'checking' or 'savings'
  is_verified boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Users can read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = rider_id::text OR auth.uid()::text = driver_id::text);

-- Create policies for driver_payouts table
CREATE POLICY "Drivers can read own payouts"
  ON driver_payouts
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = driver_id::text);

-- Create policies for payment_refunds table
CREATE POLICY "Users can read own refunds"
  ON payment_refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payments 
      WHERE payments.id = payment_refunds.payment_id 
      AND (auth.uid()::text = payments.rider_id::text OR auth.uid()::text = payments.driver_id::text)
    )
  );

-- Create policies for saved_payment_methods table
CREATE POLICY "Riders can manage own payment methods"
  ON saved_payment_methods
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = rider_id::text);

-- Create policies for driver_bank_accounts table
CREATE POLICY "Drivers can manage own bank accounts"
  ON driver_bank_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = driver_id::text);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_trip_id ON payments(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_rider_id ON payments(rider_id);
CREATE INDEX IF NOT EXISTS idx_payments_driver_id ON payments(driver_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver_id ON driver_payouts(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_status ON driver_payouts(status);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_fluidpay_id ON driver_payouts(fluidpay_payout_id);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON payment_refunds(status);

CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_rider_id ON saved_payment_methods(rider_id);
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_is_default ON saved_payment_methods(is_default);

CREATE INDEX IF NOT EXISTS idx_driver_bank_accounts_driver_id ON driver_bank_accounts(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_bank_accounts_is_default ON driver_bank_accounts(is_default);