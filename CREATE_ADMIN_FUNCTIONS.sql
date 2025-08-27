-- Create Admin System for Supabase
-- Run this in Supabase SQL Editor

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can view their own admin status
CREATE POLICY "Admin users can view own status" ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access for admin management
CREATE POLICY "Service role manages admin users" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Create is_user_admin function that takes email parameter (used by get_subscription_status)
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

-- Create overloaded version for current user
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

-- Create overloaded version that takes user_id parameter
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;

-- Insert your admin users
INSERT INTO public.admin_users (user_id, email) 
SELECT id, email FROM auth.users WHERE email = 'phenyokhunou@gmail.com'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.admin_users (user_id, email) 
SELECT id, email FROM auth.users WHERE email = 'wisdom.knowlwdge@gmail.com'
ON CONFLICT (email) DO NOTHING;

-- Comments
COMMENT ON TABLE public.admin_users IS 'Admin users with full system access';
COMMENT ON FUNCTION public.is_user_admin() IS 'Check if current user is admin';
COMMENT ON FUNCTION public.is_user_admin(TEXT) IS 'Check if user with email is admin';
COMMENT ON FUNCTION public.is_user_admin(UUID) IS 'Check if user with UUID is admin';