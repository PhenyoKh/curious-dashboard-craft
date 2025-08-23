-- PHASE 1: Add Annual Subscription System (alongside existing lifetime access)
-- Migration: 005_subscription_system.sql
-- 
-- This migration adds comprehensive subscription tracking while maintaining
-- backward compatibility with existing lifetime access users.

-- Create subscription status enum
CREATE TYPE subscription_status_enum AS ENUM (
  'trial',           -- Free trial period
  'active',          -- Active paid subscription
  'past_due',        -- Payment failed, grace period
  'cancelled',       -- User cancelled, access until period end
  'unpaid',          -- Payment failed, no access
  'expired'          -- Subscription ended
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription details
  status subscription_status_enum NOT NULL DEFAULT 'trial',
  plan_type TEXT NOT NULL DEFAULT 'pro_annual', -- pro_annual, pro_monthly, etc.
  
  -- PayFast integration
  payfast_subscription_token TEXT UNIQUE, -- PayFast subscription ID
  payfast_payment_id TEXT,                -- Latest payment ID
  
  -- Billing periods
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  
  -- Subscription lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,    -- When first payment was made
  ended_at TIMESTAMP WITH TIME ZONE,      -- When subscription ended
  cancelled_at TIMESTAMP WITH TIME ZONE,  -- When user cancelled
  
  -- Payment tracking
  amount_paid DECIMAL(10,2),              -- Last payment amount
  currency TEXT DEFAULT 'ZAR',
  billing_interval TEXT DEFAULT 'year',   -- year, month
  
  -- Metadata
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  payfast_data JSONB,                     -- Store full PayFast IPN data
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id), -- One subscription per user
  CHECK (current_period_end > current_period_start),
  CHECK (trial_end > trial_start),
  CHECK (amount_paid >= 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id 
ON public.user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status 
ON public.user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_payfast_token 
ON public.user_subscriptions(payfast_subscription_token);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end 
ON public.user_subscriptions(current_period_end);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON public.user_subscriptions
  FOR ALL USING (true); -- Service role has full access

-- Subscription Management Functions

-- 1. Check if user has active access (lifetime OR subscription)
CREATE OR REPLACE FUNCTION public.user_has_pro_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check lifetime access first (backward compatibility)
  IF (SELECT has_lifetime_access FROM public.user_profiles WHERE id = user_uuid) = true THEN
    RETURN true;
  END IF;
  
  -- Check active subscription
  RETURN EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = user_uuid 
    AND status IN ('trial', 'active')
    AND (
      -- Trial not expired
      (status = 'trial' AND trial_end > now()) OR
      -- Active subscription not expired
      (status = 'active' AND current_period_end > now())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create or update subscription from PayFast IPN
CREATE OR REPLACE FUNCTION public.upsert_subscription_from_payfast(
  user_uuid UUID,
  p_payfast_token TEXT,
  p_payment_id TEXT,
  p_amount DECIMAL,
  p_status TEXT,
  p_ipn_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  current_time TIMESTAMP WITH TIME ZONE := now();
  period_start TIMESTAMP WITH TIME ZONE := current_time;
  period_end TIMESTAMP WITH TIME ZONE := current_time + INTERVAL '1 year';
  sub_status subscription_status_enum;
BEGIN
  -- Map PayFast status to our enum
  sub_status := CASE 
    WHEN p_status = 'COMPLETE' THEN 'active'::subscription_status_enum
    WHEN p_status = 'FAILED' THEN 'unpaid'::subscription_status_enum
    ELSE 'trial'::subscription_status_enum
  END;
  
  -- Insert or update subscription
  INSERT INTO public.user_subscriptions (
    user_id,
    status,
    plan_type,
    payfast_subscription_token,
    payfast_payment_id,
    current_period_start,
    current_period_end,
    started_at,
    amount_paid,
    payfast_data
  ) VALUES (
    user_uuid,
    sub_status,
    'pro_annual',
    p_payfast_token,
    p_payment_id,
    period_start,
    period_end,
    current_time,
    p_amount,
    p_ipn_data
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = sub_status,
    payfast_subscription_token = p_payfast_token,
    payfast_payment_id = p_payment_id,
    current_period_start = period_start,
    current_period_end = period_end,
    amount_paid = p_amount,
    payfast_data = p_ipn_data,
    updated_at = current_time;
    
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cancel subscription (mark for cancellation at period end)
CREATE OR REPLACE FUNCTION public.cancel_subscription(
  user_uuid UUID,
  cancellation_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_subscriptions 
  SET 
    cancel_at_period_end = true,
    cancelled_at = now(),
    cancellation_reason = cancellation_reason,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get subscription status with details
CREATE OR REPLACE FUNCTION public.get_subscription_status(user_uuid UUID)
RETURNS TABLE (
  has_access BOOLEAN,
  access_type TEXT,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  is_trial BOOLEAN,
  is_lifetime BOOLEAN
) AS $$
DECLARE
  lifetime_access BOOLEAN;
  sub_record RECORD;
BEGIN
  -- Check lifetime access
  SELECT has_lifetime_access INTO lifetime_access 
  FROM public.user_profiles WHERE id = user_uuid;
  
  IF lifetime_access = true THEN
    RETURN QUERY SELECT 
      true,           -- has_access
      'lifetime',     -- access_type
      'active',       -- status
      NULL::TIMESTAMP WITH TIME ZONE, -- expires_at
      NULL::INTEGER,  -- days_remaining
      false,          -- is_trial
      true;           -- is_lifetime
    RETURN;
  END IF;
  
  -- Check subscription
  SELECT * INTO sub_record 
  FROM public.user_subscriptions WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,          -- has_access
      'none',         -- access_type
      'none',         -- status
      NULL::TIMESTAMP WITH TIME ZONE, -- expires_at
      NULL::INTEGER,  -- days_remaining
      false,          -- is_trial
      false;          -- is_lifetime
    RETURN;
  END IF;
  
  -- Return subscription details
  RETURN QUERY SELECT 
    (sub_record.status IN ('trial', 'active') AND 
     COALESCE(sub_record.current_period_end, sub_record.trial_end) > now()),
    CASE 
      WHEN sub_record.status = 'trial' THEN 'trial'
      ELSE 'subscription'
    END,
    sub_record.status::TEXT,
    COALESCE(sub_record.current_period_end, sub_record.trial_end),
    EXTRACT(days FROM COALESCE(sub_record.current_period_end, sub_record.trial_end) - now())::INTEGER,
    sub_record.status = 'trial',
    false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.user_has_pro_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_subscription_from_payfast(UUID, TEXT, TEXT, DECIMAL, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_subscription(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_status(UUID) TO authenticated;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at 
BEFORE UPDATE ON public.user_subscriptions 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.user_subscriptions IS 'Annual subscription tracking alongside existing lifetime access';
COMMENT ON COLUMN public.user_subscriptions.payfast_subscription_token IS 'PayFast subscription ID for management';
COMMENT ON COLUMN public.user_subscriptions.cancel_at_period_end IS 'User cancelled but access continues until period end';
COMMENT ON FUNCTION public.user_has_pro_access(UUID) IS 'Check if user has access via lifetime OR subscription';
COMMENT ON FUNCTION public.get_subscription_status(UUID) IS 'Get comprehensive access status for both lifetime and subscription users';