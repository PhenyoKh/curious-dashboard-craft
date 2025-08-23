-- Add PayFast Pay Now button support for lifetime access
-- Migration: 003_lifetime_access_paynow.sql

-- Add lifetime access tracking to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS has_lifetime_access BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_lifetime_access 
ON public.user_profiles(has_lifetime_access);

-- Create helpful function to check lifetime access
CREATE OR REPLACE FUNCTION public.user_has_lifetime_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT has_lifetime_access FROM public.user_profiles WHERE id = user_uuid),
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.user_has_lifetime_access(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.has_lifetime_access IS 'Boolean flag for users who have purchased lifetime access via PayFast Pay Now button';
COMMENT ON COLUMN public.user_profiles.payment_reference IS 'PayFast payment ID for reference';
COMMENT ON COLUMN public.user_profiles.paid_at IS 'Timestamp when lifetime access was purchased';