-- Add Stripe subscription fields to business_settings
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Optional: Create an index for faster lookups by stripe ids
CREATE INDEX IF NOT EXISTS idx_business_settings_stripe_customer 
ON business_settings(stripe_customer_id);

-- Note: You should also set up RLS policies if not already present.
-- Example (if needed):
-- CREATE POLICY "Users can view own business settings" ON business_settings
--   FOR SELECT USING (auth.uid() = user_id);
