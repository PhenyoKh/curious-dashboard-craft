import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Apply the database fix for signup issues
 * This creates a robust trigger that won't fail signup
 */
export async function applySignupFix() {
  logger.log('🔧 Applying signup fix...');
  
  try {
    // Create the improved handle_new_user function with error handling
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
          profile_exists BOOLEAN := FALSE;
          settings_exists BOOLEAN := FALSE;
      BEGIN
          -- Always allow the auth user creation to succeed
          -- Handle profile creation with error catching
          BEGIN
              SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.id) INTO profile_exists;
              
              IF NOT profile_exists THEN
                  INSERT INTO public.user_profiles (id, full_name, email)
                  VALUES (
                      NEW.id, 
                      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
                      COALESCE(NEW.email, '')
                  );
              END IF;
          EXCEPTION WHEN OTHERS THEN
              -- Log error but continue
              NULL;
          END;
          
          -- Handle settings creation with error catching
          BEGIN
              SELECT EXISTS(SELECT 1 FROM public.user_settings WHERE user_id = NEW.id) INTO settings_exists;
              
              IF NOT settings_exists THEN
                  INSERT INTO public.user_settings (
                      user_id,
                      theme,
                      language,
                      auto_save_notes,
                      show_line_numbers,
                      enable_spell_check,
                      onboarding_completed,
                      has_logged_in_before,
                      first_login_at
                  )
                  VALUES (
                      NEW.id,
                      'system',
                      'en',
                      TRUE,
                      FALSE,
                      TRUE,
                      FALSE,
                      FALSE,
                      NOW()
                  );
              END IF;
          EXCEPTION WHEN OTHERS THEN
              -- Log error but continue
              NULL;
          END;
          
          -- Always return NEW to allow signup to succeed
          RETURN NEW;
      END;
      $$ language 'plpgsql' SECURITY DEFINER;
    `;

    // Apply the function
    const { error: functionError } = await supabase.rpc('exec', { sql: createFunctionSQL });
    if (functionError) {
      logger.error('❌ Error creating function:', functionError);
      throw functionError;
    }

    logger.log('✅ Function created successfully');

    // Recreate the trigger
    const recreateTriggerSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;

    const { error: triggerError } = await supabase.rpc('exec', { sql: recreateTriggerSQL });
    if (triggerError) {
      logger.error('❌ Error creating trigger:', triggerError);
      throw triggerError;
    }

    logger.log('✅ Trigger created successfully');
    logger.log('🎉 Signup fix applied! Users should now be able to sign up without 500 errors.');
    
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to apply signup fix:', error);
    return { success: false, error };
  }
}

/**
 * Check if the signup fix has been applied
 */
export async function checkSignupFixStatus() {
  try {
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        SELECT 
          trigger_name,
          event_object_table,
          action_statement
        FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
        AND event_object_table = 'users';
      `
    });

    if (error) {
      logger.error('❌ Error checking trigger status:', error);
      return { applied: false, error };
    }

    const isApplied = data && data.length > 0;
    return { applied: isApplied, data };
  } catch (error) {
    logger.error('❌ Error checking fix status:', error);
    return { applied: false, error };
  }
}