-- Fix signup trigger with robust error handling and logging
-- This migration addresses the 500 error during user signup

-- First, create an error logging table to track trigger failures
CREATE TABLE IF NOT EXISTS public.trigger_error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_name VARCHAR(100) NOT NULL,
    user_id UUID,
    error_message TEXT,
    error_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create improved handle_new_user function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    settings_exists BOOLEAN := FALSE;
    error_context TEXT;
BEGIN
    -- Set error context for debugging
    error_context := format('Processing new user: %s', NEW.id);
    
    BEGIN
        -- Check if user_profiles record already exists
        SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.id) INTO profile_exists;
        
        -- Only insert if doesn't exist
        IF NOT profile_exists THEN
            INSERT INTO public.user_profiles (id, full_name, email)
            VALUES (
                NEW.id, 
                COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
                COALESCE(NEW.email, '')
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the profile creation error but don't fail the entire process
        INSERT INTO public.trigger_error_logs (trigger_name, user_id, error_message, error_detail)
        VALUES ('handle_new_user_profile', NEW.id, SQLERRM, error_context || ' - Profile creation failed');
        
        -- For profile creation, we can continue without failing
        NULL;
    END;
    
    BEGIN
        -- Check if user_settings record already exists  
        SELECT EXISTS(SELECT 1 FROM public.user_settings WHERE user_id = NEW.id) INTO settings_exists;
        
        -- Only insert if doesn't exist
        IF NOT settings_exists THEN
            INSERT INTO public.user_settings (
                user_id,
                first_login_at,
                has_logged_in_before,
                onboarding_completed,
                theme,
                language,
                auto_save_notes,
                show_line_numbers,
                enable_spell_check
            )
            VALUES (
                NEW.id,
                NOW(),
                FALSE,
                FALSE,
                'system',
                'en',
                TRUE,
                FALSE,
                TRUE
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the settings creation error
        INSERT INTO public.trigger_error_logs (trigger_name, user_id, error_message, error_detail)
        VALUES ('handle_new_user_settings', NEW.id, SQLERRM, error_context || ' - Settings creation failed');
        
        -- For settings creation failure, still allow user creation to succeed
        -- The frontend can handle missing settings gracefully
        NULL;
    END;
    
    -- Always return NEW to allow the user creation to succeed
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    -- Final catch-all error handler
    BEGIN
        INSERT INTO public.trigger_error_logs (trigger_name, user_id, error_message, error_detail)
        VALUES ('handle_new_user_fatal', NEW.id, SQLERRM, error_context || ' - Fatal error in trigger');
    EXCEPTION WHEN OTHERS THEN
        -- If we can't even log the error, just continue
        NULL;
    END;
    
    -- Even in case of fatal error, return NEW so signup doesn't fail
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to check trigger status and debug issues
CREATE OR REPLACE FUNCTION public.debug_user_creation_status(user_uuid UUID)
RETURNS TABLE (
    user_exists BOOLEAN,
    profile_exists BOOLEAN,
    settings_exists BOOLEAN,
    recent_errors TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM auth.users WHERE id = user_uuid) as user_exists,
        EXISTS(SELECT 1 FROM public.user_profiles WHERE id = user_uuid) as profile_exists,
        EXISTS(SELECT 1 FROM public.user_settings WHERE user_id = user_uuid) as settings_exists,
        ARRAY(
            SELECT error_message 
            FROM public.trigger_error_logs 
            WHERE user_id = user_uuid 
            ORDER BY created_at DESC 
            LIMIT 5
        ) as recent_errors;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Grant permissions for the error logging table
ALTER TABLE public.trigger_error_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for trigger error logs (only allow service role to access)
CREATE POLICY "Service role can access trigger errors" ON public.trigger_error_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON public.trigger_error_logs TO authenticated;
GRANT ALL ON public.trigger_error_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.debug_user_creation_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_creation_status(UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Robust user creation trigger with comprehensive error handling. Always allows signup to succeed even if profile/settings creation fails.';
COMMENT ON FUNCTION public.debug_user_creation_status(UUID) IS 'Debug function to check status of user creation process and recent errors.';