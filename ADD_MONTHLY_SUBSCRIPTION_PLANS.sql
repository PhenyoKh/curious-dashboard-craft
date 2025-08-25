-- Add Monthly and Annual Subscription Plans to Supabase
-- Run this in Supabase SQL Editor to add R50 monthly and R360 annual plans

-- Create subscription_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('monthly', 'annual', 'lifetime')),
  trial_days INTEGER DEFAULT 7,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  plan_type VARCHAR(20) DEFAULT 'subscription' CHECK (plan_type IN ('subscription', 'lifetime')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(billing_interval, plan_type)
);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for subscription_plans (readable by authenticated users)
CREATE POLICY "Authenticated users can view subscription plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

-- Add unique constraint if it doesn't exist
ALTER TABLE public.subscription_plans 
ADD CONSTRAINT unique_billing_interval_plan_type 
UNIQUE (billing_interval, plan_type);

-- Insert monthly and annual subscription plans
INSERT INTO public.subscription_plans (
  name, 
  price, 
  billing_interval, 
  trial_days, 
  features, 
  is_active, 
  plan_type
) VALUES 
  (
    'Scola Pro - Monthly', 
    50.00, 
    'monthly', 
    7, 
    '["Unlimited subjects, notes and events", "Search and advanced organisation", "Seamless events management", "Calendar integration", "Export to PDF", "Email support"]'::jsonb,
    true, 
    'subscription'
  ),
  (
    'Scola Pro - Annual', 
    360.00, 
    'annual', 
    7, 
    '["Unlimited subjects, notes and events", "Search and advanced organisation", "Seamless events management", "Calendar integration", "Export to PDF", "Priority email support", "Save R240 compared to monthly billing"]'::jsonb,
    true, 
    'subscription'
  )
ON CONFLICT (billing_interval, plan_type) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  updated_at = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_interval 
  ON public.subscription_plans(billing_interval);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active 
  ON public.subscription_plans(is_active);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_plans_updated_at 
  BEFORE UPDATE ON public.subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Verify the data was inserted correctly
SELECT 
  id,
  name,
  price,
  billing_interval,
  plan_type,
  is_active 
FROM public.subscription_plans 
ORDER BY billing_interval;