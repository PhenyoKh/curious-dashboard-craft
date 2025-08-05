-- Add onboarding tracking fields to user_settings table
-- This migration adds fields to track user onboarding completion and first-time login status

-- Add onboarding-related columns to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_logged_in_before BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for onboarding queries
CREATE INDEX IF NOT EXISTS idx_user_settings_onboarding 
ON user_settings(user_id, onboarding_completed, has_logged_in_before);

-- Update the handle_new_user function to set first login timestamp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_settings (user_id, first_login_at, has_logged_in_before)
    VALUES (NEW.id, NOW(), FALSE)
    ON CONFLICT (user_id) DO UPDATE SET
        first_login_at = COALESCE(user_settings.first_login_at, NOW()),
        has_logged_in_before = TRUE;
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create function to mark onboarding as completed
CREATE OR REPLACE FUNCTION public.mark_onboarding_completed(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_settings
    SET 
        onboarding_completed = TRUE,
        onboarding_completed_at = NOW(),
        has_logged_in_before = TRUE,
        updated_at = NOW()
    WHERE user_id = user_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create function to reset onboarding (useful for testing/support)
CREATE OR REPLACE FUNCTION public.reset_onboarding(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_settings
    SET 
        onboarding_completed = FALSE,
        onboarding_completed_at = NULL,
        updated_at = NOW()
    WHERE user_id = user_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Add RLS policies for onboarding functions (users can only modify their own onboarding status)
-- Note: The existing RLS policies on user_settings table already cover these columns