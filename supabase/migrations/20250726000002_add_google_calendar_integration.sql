-- Add Google Calendar integration support
-- This migration adds tables and columns for Google Calendar OAuth and sync functionality

-- Create calendar integrations table to store OAuth tokens and sync preferences
CREATE TABLE public.calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
    provider_account_id TEXT NOT NULL, -- Google account ID or email
    provider_calendar_id TEXT, -- Specific calendar ID (optional, null = primary calendar)
    
    -- OAuth credentials (encrypted)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT NOT NULL, -- OAuth scopes granted
    
    -- Sync preferences
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_direction VARCHAR(20) DEFAULT 'bidirectional' CHECK (sync_direction IN ('import_only', 'export_only', 'bidirectional')),
    sync_frequency_minutes INTEGER DEFAULT 15, -- How often to sync (in minutes)
    
    -- Calendar preferences
    calendar_name TEXT, -- Display name for this calendar
    calendar_color VARCHAR(7), -- Hex color for display
    sync_past_days INTEGER DEFAULT 30, -- How many days in the past to sync
    sync_future_days INTEGER DEFAULT 365, -- How many days in the future to sync
    
    -- Sync metadata
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_successful_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error', 'disabled')),
    sync_error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one integration per provider per user (can have multiple calendars per provider)
    UNIQUE(user_id, provider, provider_calendar_id)
);

-- Add external calendar mapping to schedule_events
ALTER TABLE schedule_events 
ADD COLUMN external_calendar_id UUID REFERENCES calendar_integrations(id) ON DELETE SET NULL,
ADD COLUMN external_event_id TEXT, -- External provider's event ID
ADD COLUMN sync_status VARCHAR(20) DEFAULT 'local' CHECK (sync_status IN ('local', 'synced', 'conflict', 'deleted', 'error')),
ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN external_last_modified TIMESTAMP WITH TIME ZONE; -- When the external event was last modified

-- Create event sync mappings table for complex relationships
CREATE TABLE public.event_sync_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_event_id UUID NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
    calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    external_event_id TEXT NOT NULL,
    sync_direction VARCHAR(20) NOT NULL CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
    
    -- Conflict resolution
    conflict_status VARCHAR(20) DEFAULT 'none' CHECK (conflict_status IN ('none', 'pending', 'resolved_local', 'resolved_external')),
    conflict_resolution_strategy VARCHAR(30) CHECK (conflict_resolution_strategy IN ('manual', 'local_wins', 'external_wins', 'newest_wins')),
    
    -- Sync metadata  
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(local_event_id, calendar_integration_id),
    UNIQUE(calendar_integration_id, external_event_id)
);

-- Create sync conflicts table for manual resolution
CREATE TABLE public.sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_sync_mapping_id UUID NOT NULL REFERENCES event_sync_mappings(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type VARCHAR(30) NOT NULL CHECK (conflict_type IN ('time_mismatch', 'content_mismatch', 'deletion_conflict', 'creation_conflict')),
    conflict_description TEXT,
    
    -- Conflicting data snapshots
    local_event_data JSONB, -- Snapshot of local event
    external_event_data JSONB, -- Snapshot of external event
    
    -- Resolution
    resolution_status VARCHAR(20) DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'ignored')),
    resolution_choice VARCHAR(20) CHECK (resolution_choice IN ('keep_local', 'keep_external', 'merge', 'ignore')),
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sync history table for audit and debugging
CREATE TABLE public.sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    
    -- Sync operation details
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual', 'webhook')),
    sync_direction VARCHAR(20) NOT NULL CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
    sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN ('started', 'completed', 'failed', 'partial')),
    
    -- Statistics
    events_processed INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_deleted INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_calendar_integrations_user_provider ON calendar_integrations(user_id, provider);
CREATE INDEX idx_calendar_integrations_sync_status ON calendar_integrations(sync_status);
CREATE INDEX idx_calendar_integrations_next_sync ON calendar_integrations(user_id, sync_enabled, last_sync_at) 
WHERE sync_enabled = TRUE;

CREATE INDEX idx_schedule_events_external_id ON schedule_events(external_calendar_id, external_event_id) 
WHERE external_calendar_id IS NOT NULL;
CREATE INDEX idx_schedule_events_sync_status ON schedule_events(sync_status);

CREATE INDEX idx_event_sync_mappings_local_event ON event_sync_mappings(local_event_id);
CREATE INDEX idx_event_sync_mappings_external_event ON event_sync_mappings(calendar_integration_id, external_event_id);
CREATE INDEX idx_event_sync_mappings_conflicts ON event_sync_mappings(conflict_status) 
WHERE conflict_status != 'none';

CREATE INDEX idx_sync_conflicts_user_pending ON sync_conflicts(user_id, resolution_status) 
WHERE resolution_status = 'pending';

CREATE INDEX idx_sync_history_user_recent ON sync_history(user_id, started_at DESC);
CREATE INDEX idx_sync_history_integration_status ON sync_history(calendar_integration_id, sync_status);

-- Add row level security policies
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sync_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Calendar integrations policies
CREATE POLICY "Users can manage their own calendar integrations" ON calendar_integrations
    FOR ALL USING (auth.uid() = user_id);

-- Event sync mappings policies  
CREATE POLICY "Users can manage their own event sync mappings" ON event_sync_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM schedule_events 
            WHERE schedule_events.id = event_sync_mappings.local_event_id 
            AND schedule_events.user_id = auth.uid()
        )
    );

-- Sync conflicts policies
CREATE POLICY "Users can manage their own sync conflicts" ON sync_conflicts
    FOR ALL USING (auth.uid() = user_id);

-- Sync history policies (read-only for users)
CREATE POLICY "Users can view their own sync history" ON sync_history
    FOR SELECT USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE calendar_integrations IS 'Stores OAuth credentials and sync preferences for external calendar providers';
COMMENT ON TABLE event_sync_mappings IS 'Maps local events to external calendar events with sync metadata';
COMMENT ON TABLE sync_conflicts IS 'Tracks conflicts that require manual resolution during sync operations';
COMMENT ON TABLE sync_history IS 'Audit log of all sync operations for debugging and monitoring';

COMMENT ON COLUMN calendar_integrations.access_token_encrypted IS 'Encrypted OAuth access token - must be decrypted before use';
COMMENT ON COLUMN calendar_integrations.refresh_token_encrypted IS 'Encrypted OAuth refresh token for token renewal';
COMMENT ON COLUMN schedule_events.external_event_id IS 'ID of the corresponding event in the external calendar system';