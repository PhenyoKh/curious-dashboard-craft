-- Add Microsoft Outlook integration support
-- This migration extends the existing calendar integration system for Microsoft Graph API

-- Update calendar_integrations table to support Microsoft provider
ALTER TABLE public.calendar_integrations
ADD CONSTRAINT check_provider_values CHECK (provider IN ('google', 'outlook', 'apple'));

-- Add Microsoft-specific columns to calendar_integrations
ALTER TABLE public.calendar_integrations
ADD COLUMN IF NOT EXISTS tenant_id TEXT, -- Microsoft tenant ID
ADD COLUMN IF NOT EXISTS microsoft_user_id TEXT, -- Microsoft user ID
ADD COLUMN IF NOT EXISTS mailbox_settings JSONB, -- Outlook mailbox settings
ADD COLUMN IF NOT EXISTS time_zone_info JSONB; -- Microsoft timezone information

-- Create index for Microsoft-specific lookups
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_microsoft_user 
ON calendar_integrations(user_id, provider, microsoft_user_id) 
WHERE provider = 'outlook';

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_tenant 
ON calendar_integrations(tenant_id) 
WHERE provider = 'outlook';

-- Add Microsoft Graph-specific event mapping columns
ALTER TABLE public.event_sync_mappings
ADD COLUMN IF NOT EXISTS microsoft_change_key TEXT, -- Microsoft change tracking
ADD COLUMN IF NOT EXISTS outlook_categories TEXT[], -- Outlook categories
ADD COLUMN IF NOT EXISTS microsoft_event_type VARCHAR(50); -- Meeting, appointment, etc.

-- Create index for Microsoft change tracking
CREATE INDEX IF NOT EXISTS idx_event_sync_mappings_change_key 
ON event_sync_mappings(microsoft_change_key) 
WHERE microsoft_change_key IS NOT NULL;

-- Add Microsoft-specific sync conflict types
ALTER TABLE public.sync_conflicts
DROP CONSTRAINT IF EXISTS sync_conflicts_conflict_type_check,
ADD CONSTRAINT sync_conflicts_conflict_type_check 
CHECK (conflict_type IN (
  'time_mismatch', 
  'content_mismatch', 
  'deletion_conflict', 
  'creation_conflict',
  'recurrence_mismatch',
  'attendee_conflict',
  'category_conflict',
  'timezone_conflict'
));

-- Create Microsoft-specific calendar metadata table
CREATE TABLE IF NOT EXISTS public.microsoft_calendar_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL, -- Microsoft calendar ID
  calendar_name TEXT NOT NULL,
  calendar_color VARCHAR(7), -- Hex color
  can_share BOOLEAN DEFAULT FALSE,
  can_view_private_items BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  is_default_calendar BOOLEAN DEFAULT FALSE,
  is_removable BOOLEAN DEFAULT TRUE,
  owner_name TEXT,
  owner_email TEXT,
  calendar_permissions JSONB, -- Microsoft calendar permissions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(integration_id, calendar_id)
);

-- Create indexes for Microsoft calendar metadata
CREATE INDEX idx_microsoft_calendar_metadata_integration 
ON microsoft_calendar_metadata(integration_id);

CREATE INDEX idx_microsoft_calendar_metadata_calendar_id 
ON microsoft_calendar_metadata(calendar_id);

-- Add RLS policy for Microsoft calendar metadata
ALTER TABLE microsoft_calendar_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Microsoft calendar metadata" ON microsoft_calendar_metadata
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations 
      WHERE calendar_integrations.id = microsoft_calendar_metadata.integration_id 
      AND calendar_integrations.user_id = auth.uid()
    )
  );

-- Create Microsoft-specific sync tokens table for delta queries
CREATE TABLE IF NOT EXISTS public.microsoft_sync_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  delta_token TEXT, -- Microsoft Graph delta token
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('events', 'calendars')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(integration_id, calendar_id, sync_type)
);

-- Create indexes for sync tokens
CREATE INDEX idx_microsoft_sync_tokens_integration 
ON microsoft_sync_tokens(integration_id, sync_type);

CREATE INDEX idx_microsoft_sync_tokens_expiry 
ON microsoft_sync_tokens(expires_at) 
WHERE expires_at IS NOT NULL;

-- Add RLS policy for Microsoft sync tokens
ALTER TABLE microsoft_sync_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Microsoft sync tokens" ON microsoft_sync_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations 
      WHERE calendar_integrations.id = microsoft_sync_tokens.integration_id 
      AND calendar_integrations.user_id = auth.uid()
    )
  );

-- Create Microsoft-specific attendee information table
CREATE TABLE IF NOT EXISTS public.microsoft_event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_sync_mapping_id UUID NOT NULL REFERENCES event_sync_mappings(id) ON DELETE CASCADE,
  attendee_type VARCHAR(20) NOT NULL CHECK (attendee_type IN ('required', 'optional', 'resource')),
  attendee_email TEXT NOT NULL,
  attendee_name TEXT,
  response_status VARCHAR(20) CHECK (response_status IN ('none', 'organizer', 'tentativelyAccepted', 'accepted', 'declined', 'notResponded')),
  response_time TIMESTAMP WITH TIME ZONE,
  is_organizer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for attendee information
CREATE INDEX idx_microsoft_event_attendees_mapping 
ON microsoft_event_attendees(event_sync_mapping_id);

CREATE INDEX idx_microsoft_event_attendees_email 
ON microsoft_event_attendees(attendee_email);

-- Add RLS policy for Microsoft event attendees
ALTER TABLE microsoft_event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage attendees for their own events" ON microsoft_event_attendees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_sync_mappings esm
      JOIN schedule_events se ON esm.local_event_id = se.id
      WHERE esm.id = microsoft_event_attendees.event_sync_mapping_id 
      AND se.user_id = auth.uid()
    )
  );

-- Add Microsoft Teams meeting information
ALTER TABLE public.schedule_events
ADD COLUMN IF NOT EXISTS teams_meeting_url TEXT,
ADD COLUMN IF NOT EXISTS teams_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS is_online_meeting BOOLEAN DEFAULT FALSE;

-- Create index for Teams meetings
CREATE INDEX IF NOT EXISTS idx_schedule_events_teams_meeting 
ON schedule_events(teams_meeting_id) 
WHERE teams_meeting_id IS NOT NULL;

-- Update user_settings to include Microsoft-specific preferences
-- (This extends the existing calendar_settings JSONB column)
COMMENT ON COLUMN user_settings.calendar_settings IS 
'Calendar preferences including Google and Microsoft settings. Example structure:
{
  "sync_google": boolean,
  "sync_outlook": boolean,
  "show_weekends": boolean,
  "default_view": "week|month|day",
  "week_starts_on": "sunday|monday",
  "user_timezone": string,
  "time_format": "12h|24h",
  "default_event_duration": number,
  "default_reminder_minutes": number,
  "show_timezone_in_events": boolean,
  "auto_detect_timezone": boolean,
  "microsoft_preferences": {
    "sync_teams_meetings": boolean,
    "auto_accept_meeting_invites": boolean,
    "include_attachments": boolean,
    "sync_private_events": boolean,
    "preferred_calendar_view": string
  }
}';

-- Add trigger to update updated_at timestamp for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to new tables
DROP TRIGGER IF EXISTS update_microsoft_calendar_metadata_updated_at ON microsoft_calendar_metadata;
CREATE TRIGGER update_microsoft_calendar_metadata_updated_at
    BEFORE UPDATE ON microsoft_calendar_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_microsoft_sync_tokens_updated_at ON microsoft_sync_tokens;
CREATE TRIGGER update_microsoft_sync_tokens_updated_at
    BEFORE UPDATE ON microsoft_sync_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_microsoft_event_attendees_updated_at ON microsoft_event_attendees;
CREATE TRIGGER update_microsoft_event_attendees_updated_at
    BEFORE UPDATE ON microsoft_event_attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE microsoft_calendar_metadata IS 'Stores Microsoft-specific calendar information and permissions';
COMMENT ON TABLE microsoft_sync_tokens IS 'Stores Microsoft Graph delta tokens for efficient incremental sync';
COMMENT ON TABLE microsoft_event_attendees IS 'Stores detailed attendee information for Microsoft calendar events';

COMMENT ON COLUMN calendar_integrations.tenant_id IS 'Microsoft Azure AD tenant ID';
COMMENT ON COLUMN calendar_integrations.microsoft_user_id IS 'Microsoft Graph user ID';
COMMENT ON COLUMN calendar_integrations.mailbox_settings IS 'Microsoft Outlook mailbox configuration';
COMMENT ON COLUMN calendar_integrations.time_zone_info IS 'Microsoft timezone information and preferences';

COMMENT ON COLUMN event_sync_mappings.microsoft_change_key IS 'Microsoft Graph change tracking key for optimistic concurrency';
COMMENT ON COLUMN event_sync_mappings.outlook_categories IS 'Outlook calendar categories/labels';
COMMENT ON COLUMN event_sync_mappings.microsoft_event_type IS 'Type of Microsoft calendar event (meeting, appointment, etc.)';

COMMENT ON COLUMN schedule_events.teams_meeting_url IS 'Microsoft Teams meeting join URL';
COMMENT ON COLUMN schedule_events.teams_meeting_id IS 'Microsoft Teams meeting identifier';
COMMENT ON COLUMN schedule_events.is_online_meeting IS 'Whether this event includes an online meeting component';