-- StudyFlow Database Schema Migration
-- This migration creates the complete database schema for the StudyFlow note-taking application
-- Compatible with existing backend models and optimized for Supabase

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create user profiles table (extends auth.users)
-- This table stores additional profile information for authenticated users
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user settings/preferences table
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'en',
    auto_save_notes BOOLEAN DEFAULT TRUE,
    show_line_numbers BOOLEAN DEFAULT FALSE,
    enable_spell_check BOOLEAN DEFAULT TRUE,
    email_notifications JSONB DEFAULT '{"assignment_reminders": true, "schedule_updates": true, "weekly_summary": false}'::jsonb,
    push_notifications JSONB DEFAULT '{"study_reminders": true, "break_reminders": false, "achievement_notifications": true}'::jsonb,
    privacy_settings JSONB DEFAULT '{"profile_private": false, "analytics_tracking": true}'::jsonb,
    calendar_settings JSONB DEFAULT '{"sync_google": false, "sync_outlook": false, "show_weekends": true, "default_view": "week", "week_starts_on": "monday"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    value VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, value)
);

-- Create notes table with highlighting and formatting support
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL, -- Rich text content (HTML/markdown)
    content_text TEXT NOT NULL, -- Plain text version for search
    word_count INTEGER NOT NULL DEFAULT 0,
    highlights JSONB DEFAULT '[]'::jsonb, -- Store highlight data as JSON
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata (tags, formatting info, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Not Started' 
        CHECK (status IN ('Not Started', 'In Progress', 'To Do', 'On Track', 'Overdue', 'Completed')),
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    estimated_hours INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedule/events table for calendar functionality
CREATE TABLE public.schedule_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'study' CHECK (event_type IN ('class', 'study', 'exam', 'assignment', 'break', 'other')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB, -- Store recurrence rules as JSON
    location VARCHAR(255),
    reminder_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create indexes for performance optimization
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(id);
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

CREATE INDEX idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX idx_subjects_user_value ON public.subjects(user_id, value);

CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_subject_id ON public.notes(subject_id);
CREATE INDEX idx_notes_modified_at ON public.notes(modified_at DESC);
CREATE INDEX idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX idx_notes_title ON public.notes USING gin(title gin_trgm_ops);

CREATE INDEX idx_assignments_user_id ON public.assignments(user_id);
CREATE INDEX idx_assignments_subject_id ON public.assignments(subject_id);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX idx_assignments_status ON public.assignments(status);
CREATE INDEX idx_assignments_priority ON public.assignments(priority);
CREATE INDEX idx_assignments_user_due_status ON public.assignments(user_id, due_date, status);

CREATE INDEX idx_schedule_events_user_id ON public.schedule_events(user_id);
CREATE INDEX idx_schedule_events_subject_id ON public.schedule_events(subject_id);
CREATE INDEX idx_schedule_events_start_time ON public.schedule_events(start_time);
CREATE INDEX idx_schedule_events_end_time ON public.schedule_events(end_time);
CREATE INDEX idx_schedule_events_user_time_range ON public.schedule_events(user_id, start_time, end_time);

-- Full-text search index for notes
CREATE INDEX idx_notes_content_text_fts ON public.notes USING gin(to_tsvector('english', content_text));
CREATE INDEX idx_notes_title_content_fts ON public.notes USING gin(to_tsvector('english', title || ' ' || content_text));

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON public.user_settings 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON public.assignments 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_events_updated_at 
    BEFORE UPDATE ON public.schedule_events 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create user profile and settings on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger to handle new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for subjects
CREATE POLICY "Users can view their own subjects" ON public.subjects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects" ON public.subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects" ON public.subjects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects" ON public.subjects
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for notes
CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for assignments
CREATE POLICY "Users can view their own assignments" ON public.assignments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assignments" ON public.assignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assignments" ON public.assignments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assignments" ON public.assignments
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for schedule_events
CREATE POLICY "Users can view their own schedule events" ON public.schedule_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule events" ON public.schedule_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule events" ON public.schedule_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule events" ON public.schedule_events
    FOR DELETE USING (auth.uid() = user_id);

-- Create useful database functions

-- Function to get user's recent notes
CREATE OR REPLACE FUNCTION public.get_recent_notes(user_uuid UUID, note_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title TEXT,
    subject_label TEXT,
    modified_at TIMESTAMP WITH TIME ZONE,
    word_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        COALESCE(s.label, 'No Subject') as subject_label,
        n.modified_at,
        n.word_count
    FROM public.notes n
    LEFT JOIN public.subjects s ON n.subject_id = s.id
    WHERE n.user_id = user_uuid
    ORDER BY n.modified_at DESC
    LIMIT note_limit;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to get upcoming assignments
CREATE OR REPLACE FUNCTION public.get_upcoming_assignments(user_uuid UUID, days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
    id UUID,
    title TEXT,
    subject_label TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT,
    priority TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        COALESCE(s.label, 'No Subject') as subject_label,
        a.due_date,
        a.status,
        a.priority
    FROM public.assignments a
    LEFT JOIN public.subjects s ON a.subject_id = s.id
    WHERE a.user_id = user_uuid
    AND a.due_date >= NOW()
    AND a.due_date <= NOW() + INTERVAL '1 day' * days_ahead
    AND a.status != 'Completed'
    ORDER BY a.due_date ASC;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to search notes
CREATE OR REPLACE FUNCTION public.search_notes(user_uuid UUID, search_query TEXT, note_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content_text TEXT,
    subject_label TEXT,
    modified_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        LEFT(n.content_text, 200) as content_text,
        COALESCE(s.label, 'No Subject') as subject_label,
        n.modified_at,
        ts_rank(to_tsvector('english', n.title || ' ' || n.content_text), plainto_tsquery('english', search_query)) as rank
    FROM public.notes n
    LEFT JOIN public.subjects s ON n.subject_id = s.id
    WHERE n.user_id = user_uuid
    AND to_tsvector('english', n.title || ' ' || n.content_text) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, n.modified_at DESC
    LIMIT note_limit;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;