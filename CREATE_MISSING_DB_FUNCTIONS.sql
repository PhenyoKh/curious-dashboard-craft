-- Create Missing Database Functions for Trial Banner Fix
-- Run this in Supabase SQL Editor

-- First, create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can view their own admin status
CREATE POLICY "Admin users can view own status" ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access for admin management
CREATE POLICY "Service role manages admin users" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Create is_user_admin function (overloaded for different parameter types)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current authenticated user is admin
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overloaded version that takes user_email parameter
CREATE OR REPLACE FUNCTION public.is_user_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user with given email is admin
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overloaded version that takes user_id parameter
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user with given UUID is admin
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_subscription_status function to include is_admin
CREATE OR REPLACE FUNCTION public.get_subscription_status(user_uuid UUID)
RETURNS TABLE (
  has_access BOOLEAN,
  access_type TEXT,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  is_trial BOOLEAN,
  is_lifetime BOOLEAN,
  is_admin BOOLEAN
) AS $$
DECLARE
  lifetime_access BOOLEAN;
  is_user_admin_flag BOOLEAN;
  sub_record RECORD;
BEGIN
  -- Check if user is admin
  SELECT public.is_user_admin(user_uuid) INTO is_user_admin_flag;
  
  -- Check lifetime access
  SELECT COALESCE(has_lifetime_access, false) INTO lifetime_access 
  FROM public.user_profiles WHERE id = user_uuid;
  
  -- Admin users have access regardless of subscription
  IF is_user_admin_flag = true THEN
    RETURN QUERY SELECT 
      true,           -- has_access
      'admin',        -- access_type
      'active',       -- status
      NULL::TIMESTAMP WITH TIME ZONE, -- expires_at
      NULL::INTEGER,  -- days_remaining
      false,          -- is_trial
      false,          -- is_lifetime
      true;           -- is_admin
    RETURN;
  END IF;
  
  -- Lifetime access users
  IF lifetime_access = true THEN
    RETURN QUERY SELECT 
      true,           -- has_access
      'lifetime',     -- access_type
      'active',       -- status
      NULL::TIMESTAMP WITH TIME ZONE, -- expires_at
      NULL::INTEGER,  -- days_remaining
      false,          -- is_trial
      true,           -- is_lifetime
      false;          -- is_admin
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
      false,          -- is_lifetime
      false;          -- is_admin
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
    false,          -- is_lifetime
    false;          -- is_admin
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_status(UUID) TO authenticated;

-- Insert your admin user (replace with actual admin email)
-- INSERT INTO public.admin_users (user_id, email) 
-- SELECT id, email FROM auth.users WHERE email = 'your-admin-email@example.com'
-- ON CONFLICT (email) DO NOTHING;

-- Comments
COMMENT ON TABLE public.admin_users IS 'Admin users with full system access';
COMMENT ON FUNCTION public.is_user_admin() IS 'Check if current user is admin';
COMMENT ON FUNCTION public.is_user_admin(TEXT) IS 'Check if user with email is admin';
COMMENT ON FUNCTION public.is_user_admin(UUID) IS 'Check if user with UUID is admin';