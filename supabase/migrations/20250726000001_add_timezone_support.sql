-- Add comprehensive timezone and user preference support
-- This migration enhances the user settings for timezone-aware scheduling

-- Add timezone column to schedule_events for event-specific timezone tracking
ALTER TABLE schedule_events 
ADD COLUMN event_timezone TEXT DEFAULT 'UTC';

-- Add comment for the new column
COMMENT ON COLUMN schedule_events.event_timezone IS 
'IANA timezone identifier for the timezone this event was created in (e.g., America/New_York, Europe/London)';

-- Update user_settings calendar_settings to include comprehensive timezone preferences
-- First, let's add some new fields to the existing JSONB structure
UPDATE user_settings 
SET calendar_settings = calendar_settings || jsonb_build_object(
    'user_timezone', 'UTC',
    'time_format', '24h',
    'default_event_duration', 60,
    'default_reminder_minutes', 15,
    'show_timezone_in_events', true,
    'auto_detect_timezone', true
) 
WHERE calendar_settings IS NOT NULL;

-- Set default calendar_settings for any users who don't have them yet
UPDATE user_settings 
SET calendar_settings = '{
    "sync_google": false, 
    "sync_outlook": false, 
    "show_weekends": true, 
    "default_view": "week", 
    "week_starts_on": "monday",
    "user_timezone": "UTC",
    "time_format": "24h",
    "default_event_duration": 60,
    "default_reminder_minutes": 15,
    "show_timezone_in_events": true,
    "auto_detect_timezone": true
}'::jsonb
WHERE calendar_settings IS NULL;

-- Create index on event_timezone for better query performance
CREATE INDEX idx_schedule_events_timezone ON schedule_events(event_timezone);

-- Create index on user_settings calendar_settings timezone for user queries
CREATE INDEX idx_user_settings_timezone ON user_settings 
USING GIN ((calendar_settings->'user_timezone'));

-- Add constraint to ensure event_timezone is a valid format (basic validation)
ALTER TABLE schedule_events 
ADD CONSTRAINT check_event_timezone_format 
CHECK (event_timezone ~ '^[A-Za-z_]+/[A-Za-z_]+$|^UTC$|^GMT$');

-- Update the calendar_settings constraint to ensure proper timezone format
ALTER TABLE user_settings 
ADD CONSTRAINT check_user_timezone_format 
CHECK (
    calendar_settings->'user_timezone' IS NULL OR 
    (calendar_settings->>'user_timezone') ~ '^[A-Za-z_]+/[A-Za-z_]+$|^UTC$|^GMT$'
);

-- Add constraint for time format validation
ALTER TABLE user_settings 
ADD CONSTRAINT check_time_format 
CHECK (
    calendar_settings->'time_format' IS NULL OR 
    (calendar_settings->>'time_format') IN ('12h', '24h')
);

-- Add constraint for week start day validation
ALTER TABLE user_settings 
ADD CONSTRAINT check_week_starts_on 
CHECK (
    calendar_settings->'week_starts_on' IS NULL OR 
    (calendar_settings->>'week_starts_on') IN ('sunday', 'monday')
);