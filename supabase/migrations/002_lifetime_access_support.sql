-- Add plan_type support for lifetime access
-- Migration: 002_lifetime_access_support.sql

-- Add plan_type column to subscription_plans
ALTER TABLE public.subscription_plans 
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'subscription'
  CHECK (plan_type IN ('lifetime', 'subscription'));

-- Add plan_type column to user_subscriptions  
ALTER TABLE public.user_subscriptions 
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'subscription';

-- Update existing Pro plan to lifetime access
UPDATE public.subscription_plans SET 
  name = 'Pro Plan - Lifetime Access',
  plan_type = 'lifetime',
  billing_interval = 'lifetime'
WHERE id = 1;

-- Deactivate other plans (keeping only lifetime Pro for now)
UPDATE public.subscription_plans SET is_active = false WHERE id != 1;

-- Create index for plan_type queries
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_type ON public.subscription_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_type ON public.user_subscriptions(plan_type);

-- Update RLS policies to include plan_type (optional - existing policies should work)
-- No changes needed as plan_type is just an additional field

-- Add helpful function to check if subscription is lifetime
CREATE OR REPLACE FUNCTION public.is_lifetime_subscription(subscription_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  plan_type_result TEXT;
BEGIN
  SELECT COALESCE(us.plan_type, sp.plan_type, 'subscription')
  INTO plan_type_result
  FROM public.user_subscriptions us
  LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE us.id = subscription_id;
  
  RETURN plan_type_result = 'lifetime';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION public.is_lifetime_subscription(UUID) TO authenticated;