
-- Add missing columns to user_settings table for notifications and calendar settings
ALTER TABLE public.user_settings 
ADD COLUMN email_notifications JSONB DEFAULT '{"assignment_reminders": true, "schedule_updates": true, "weekly_summary": false}'::jsonb,
ADD COLUMN push_notifications JSONB DEFAULT '{"study_reminders": true, "break_reminders": false, "achievement_notifications": true}'::jsonb,
ADD COLUMN privacy_settings JSONB DEFAULT '{"profile_private": false, "analytics_tracking": true}'::jsonb,
ADD COLUMN calendar_settings JSONB DEFAULT '{"sync_google": false, "sync_outlook": false, "show_weekends": true, "default_view": "week", "week_starts_on": "monday"}'::jsonb;

-- Update the theme column to use an enum for better type safety
CREATE TYPE theme_type AS ENUM ('light', 'dark', 'system');
ALTER TABLE public.user_settings ALTER COLUMN theme TYPE theme_type USING theme::theme_type;
ALTER TABLE public.user_settings ALTER COLUMN theme SET DEFAULT 'system'::theme_type;
