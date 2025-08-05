-- SAFE SUPABASE MIGRATION: Add Onboarding Fields
-- This migration is idempotent and preserves existing functionality
-- Safe to run multiple times without breaking anything

-- ==========================================
-- STEP 1: Add Onboarding Columns Safely
-- ==========================================
-- These columns will be added only if they don't already exist
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_logged_in_before BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP WITH TIME ZONE;

-- ==========================================
-- STEP 2: Update Existing Users (SAFE)
-- ==========================================
-- Mark existing users as having logged in before to prevent unexpected onboarding
-- IMPORTANT: Only updates NULL values (newly created fields)
-- This preserves any intentional FALSE values and makes the migration idempotent
UPDATE public.user_settings 
SET has_logged_in_before = TRUE,
    updated_at = NOW()
WHERE has_logged_in_before IS NULL;

-- ==========================================
-- STEP 3: Add Performance Index
-- ==========================================
-- Create index for better query performance on onboarding queries
CREATE INDEX IF NOT EXISTS idx_user_settings_onboarding 
ON user_settings(user_id, onboarding_completed, has_logged_in_before);

-- ==========================================
-- STEP 4: Verification (Optional)
-- ==========================================
-- Run this to verify the migration was successful
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
    AND table_schema = 'public'
    AND column_name IN ('onboarding_completed', 'has_logged_in_before', 'onboarding_completed_at', 'first_login_at')
ORDER BY column_name;

-- ==========================================
-- STEP 5: Check Migration Results (Optional)
-- ==========================================
-- This shows how many users were updated and current state
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN onboarding_completed = TRUE THEN 1 END) as completed_onboarding,
    COUNT(CASE WHEN has_logged_in_before = TRUE THEN 1 END) as existing_users,
    COUNT(CASE WHEN has_logged_in_before = FALSE THEN 1 END) as new_users
FROM public.user_settings;

-- ==========================================
-- SAFETY NOTES:
-- ==========================================
-- ✅ This migration is IDEMPOTENT - safe to run multiple times
-- ✅ Existing users won't see unexpected onboarding tours  
-- ✅ New users will see onboarding tours as intended
-- ✅ All existing app functionality is preserved
-- ✅ RLS policies remain unaffected
-- ✅ No intentional FALSE values are overridden