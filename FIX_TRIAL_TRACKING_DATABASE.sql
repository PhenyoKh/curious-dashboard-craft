-- CRITICAL FIX: Trial Tracking System Database Functions
-- This fixes the missing start_trial_subscription function and ensures proper individual trial periods

-- Step 1: Create the missing start_trial_subscription function
-- This function ensures each user gets a proper 7-day trial from their individual start time
CREATE OR REPLACE FUNCTION public.start_trial_subscription(
  p_user_id UUID,
  p_plan_id INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  subscription_id TEXT;
  trial_start_time TIMESTAMP WITH TIME ZONE := NOW();
  trial_end_time TIMESTAMP WITH TIME ZONE := trial_start_time + INTERVAL '7 days';
  existing_subscription_id TEXT;
BEGIN
  -- Check if user already has a subscription
  SELECT id INTO existing_subscription_id 
  FROM public.user_subscriptions 
  WHERE user_id = p_user_id
  LIMIT 1;
  
  IF existing_subscription_id IS NOT NULL THEN
    -- User already has a subscription, return existing ID
    RETURN existing_subscription_id;
  END IF;
  
  -- Create new trial subscription with proper individual dates
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    trial_start_date,
    trial_end_date,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_plan_id,
    'trial',
    trial_start_time,
    trial_end_time,
    trial_start_time,
    trial_start_time
  ) RETURNING id::TEXT INTO subscription_id;
  
  RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create enhanced user subscription status function
-- This provides accurate trial status with proper individual date calculations
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(p_user_id UUID)
RETURNS TABLE (
  id TEXT,
  user_id UUID,
  plan_id INTEGER,
  status TEXT,
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  plan_type TEXT,
  payfast_subscription_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id::TEXT,
    us.user_id,
    us.plan_id,
    us.status::TEXT,
    us.trial_start_date,
    us.trial_end_date,
    us.current_period_start,
    us.current_period_end,
    us.cancel_at_period_end,
    us.cancelled_at,
    us.cancellation_reason,
    us.plan_type,
    us.payfast_subscription_token,
    us.created_at,
    us.updated_at
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create function to get accurate trial days remaining
-- This ensures proper day calculation for each individual user
CREATE OR REPLACE FUNCTION public.get_trial_days_remaining(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  trial_end TIMESTAMP WITH TIME ZONE;
  current_status TEXT;
  days_remaining INTEGER;
BEGIN
  -- Get user's trial end date and status
  SELECT trial_end_date, status 
  INTO trial_end, current_status
  FROM public.user_subscriptions 
  WHERE user_id = p_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Return 0 if no subscription or not on trial
  IF trial_end IS NULL OR current_status != 'trial' THEN
    RETURN 0;
  END IF;
  
  -- Calculate remaining days using proper date arithmetic
  -- Use EXTRACT to get precise day difference
  days_remaining := EXTRACT(EPOCH FROM (trial_end - NOW())) / (24 * 60 * 60);
  
  -- Return at least 0, and round up to give user benefit of partial days
  RETURN GREATEST(0, CEIL(days_remaining)::INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update existing subscriptions to have proper trial dates if missing
-- This ensures current users get proper trial tracking
DO $$
DECLARE
  user_record RECORD;
  calculated_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Fix subscriptions that have trial status but missing proper dates
  FOR user_record IN 
    SELECT id, user_id, trial_start_date, trial_end_date, created_at
    FROM public.user_subscriptions 
    WHERE status = 'trial' AND (trial_start_date IS NULL OR trial_end_date IS NULL)
  LOOP
    -- Use created_at as trial start if missing
    IF user_record.trial_start_date IS NULL THEN
      calculated_end_date := user_record.created_at + INTERVAL '7 days';
      
      UPDATE public.user_subscriptions 
      SET 
        trial_start_date = user_record.created_at,
        trial_end_date = calculated_end_date,
        updated_at = NOW()
      WHERE id = user_record.id;
    END IF;
  END LOOP;
END;
$$;

-- Step 5: Add helpful indexes for trial queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_dates 
ON public.user_subscriptions(user_id, status, trial_end_date) 
WHERE status = 'trial';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.start_trial_subscription(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trial_days_remaining(UUID) TO authenticated;