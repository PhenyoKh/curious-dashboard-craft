-- Enhanced Assignments & Academic Features Migration
-- This migration adds comprehensive academic functionality to assignments and creates supporting tables

-- ========================
-- 1. ENHANCE ASSIGNMENTS TABLE
-- ========================

-- Add academic-specific fields to existing assignments table
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'assignment' 
    CHECK (assignment_type IN ('assignment', 'exam', 'project', 'quiz', 'presentation', 'lab', 'homework', 'paper', 'discussion')),
ADD COLUMN IF NOT EXISTS submission_type VARCHAR(50) DEFAULT 'online'
    CHECK (submission_type IN ('online', 'paper', 'presentation', 'email', 'in_person', 'upload', 'quiz_platform')),
ADD COLUMN IF NOT EXISTS submission_url TEXT,
ADD COLUMN IF NOT EXISTS submission_instructions TEXT,
-- Grade tracking fields (commented out for future implementation)
-- ADD COLUMN IF NOT EXISTS max_grade DECIMAL(5,2),
-- ADD COLUMN IF NOT EXISTS received_grade DECIMAL(5,2),
-- ADD COLUMN IF NOT EXISTS grade_percentage DECIMAL(5,2),
-- ADD COLUMN IF NOT EXISTS weight_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS academic_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS external_calendar_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS reminder_schedule JSONB DEFAULT '{"reminders": []}'::jsonb,
ADD COLUMN IF NOT EXISTS semester_id UUID,
ADD COLUMN IF NOT EXISTS is_auto_detected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS detection_confidence DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS study_time_estimate INTEGER, -- in minutes
ADD COLUMN IF NOT EXISTS difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN assignments.assignment_type IS 'Type of academic work (assignment, exam, project, etc.)';
COMMENT ON COLUMN assignments.submission_type IS 'How the assignment should be submitted';
COMMENT ON COLUMN assignments.academic_metadata IS 'JSON object storing detection keywords, source calendar, etc.';
COMMENT ON COLUMN assignments.reminder_schedule IS 'Custom reminder patterns and settings';
COMMENT ON COLUMN assignments.is_auto_detected IS 'Whether this assignment was automatically detected from calendar';
COMMENT ON COLUMN assignments.detection_confidence IS 'Confidence score (0-1) for auto-detected assignments';
COMMENT ON COLUMN assignments.study_time_estimate IS 'Estimated study time in minutes';
COMMENT ON COLUMN assignments.tags IS 'Array of tags for categorization and filtering';

-- ========================
-- 2. CREATE SEMESTERS TABLE
-- ========================

CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL, -- e.g., "2024-2025"
    term_type VARCHAR(20) NOT NULL CHECK (term_type IN ('fall', 'spring', 'summer', 'winter', 'semester1', 'semester2', 'quarter1', 'quarter2', 'quarter3', 'quarter4')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    gpa_target DECIMAL(3,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_semester_dates CHECK (end_date > start_date),
    UNIQUE(user_id, name, academic_year)
);

COMMENT ON TABLE semesters IS 'Academic semesters/terms for organizing assignments and tracking academic progress';

-- ========================
-- 3. CREATE ASSIGNMENT CATEGORIES TABLE
-- ========================

CREATE TABLE IF NOT EXISTS public.assignment_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    keywords JSONB DEFAULT '[]'::jsonb,
    default_type VARCHAR(50) DEFAULT 'assignment',
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'assignment',
    is_system_category BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE assignment_categories IS 'Categories for automatic assignment classification and user organization';

-- Insert default system categories
INSERT INTO public.assignment_categories (name, description, keywords, default_type, color, icon, is_system_category) VALUES
('Assignments', 'General assignments and homework', '["assignment", "homework", "hw", "task", "work"]', 'assignment', '#3B82F6', 'assignment', TRUE),
('Exams', 'Tests, quizzes, and examinations', '["exam", "test", "quiz", "midterm", "final", "examination"]', 'exam', '#EF4444', 'exam', TRUE),
('Projects', 'Long-term projects and presentations', '["project", "presentation", "research", "thesis", "capstone"]', 'project', '#10B981', 'project', TRUE),
('Labs', 'Laboratory work and reports', '["lab", "laboratory", "experiment", "practical"]', 'lab', '#F59E0B', 'lab', TRUE),
('Papers', 'Essays and written assignments', '["paper", "essay", "report", "writing", "composition"]', 'paper', '#8B5CF6', 'paper', TRUE),
('Discussions', 'Discussion posts and forums', '["discussion", "forum", "post", "response", "comment"]', 'discussion', '#06B6D4', 'discussion', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ========================
-- 4. GRADE ANALYTICS TABLE (DEFERRED FOR FUTURE IMPLEMENTATION)
-- ========================

-- Grade analytics table - comprehensive grade tracking and analytics
-- This will be implemented in a future phase with full grade management features
-- 
-- Features planned:
-- - Automatic GPA calculations
-- - Grade trend analysis
-- - Performance predictions
-- - Subject-wise grade analytics
-- - Semester comparisons
-- - Study efficiency metrics
-- 
-- CREATE TABLE IF NOT EXISTS public.grade_analytics (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--     subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
--     semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
--     calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
--     total_assignments INTEGER DEFAULT 0,
--     completed_assignments INTEGER DEFAULT 0,
--     graded_assignments INTEGER DEFAULT 0,
--     average_grade DECIMAL(5,2),
--     weighted_average DECIMAL(5,2),
--     current_grade_letter VARCHAR(2),
--     trend_direction VARCHAR(20) CHECK (trend_direction IN ('improving', 'declining', 'stable', 'insufficient_data')),
--     trend_percentage DECIMAL(5,2),
--     prediction_final_grade DECIMAL(5,2),
--     prediction_confidence DECIMAL(3,2),
--     time_management_score DECIMAL(3,2), -- 0-1 score based on on-time submissions
--     study_efficiency_score DECIMAL(3,2), -- 0-1 score based on time spent vs grades
--     last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     analytics_data JSONB DEFAULT '{}'::jsonb, -- Additional analytics metrics
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     UNIQUE(user_id, subject_id, semester_id, calculation_date)
-- );

-- COMMENT ON TABLE grade_analytics IS 'Calculated analytics and insights for academic performance tracking';

-- ========================
-- 5. CREATE STUDY SESSIONS TABLE
-- ========================

CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    session_type VARCHAR(50) DEFAULT 'study' CHECK (session_type IN ('study', 'research', 'writing', 'reviewing', 'practice', 'group_study')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    planned_duration INTEGER, -- planned duration in minutes
    actual_duration INTEGER, -- actual duration in minutes
    productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 5),
    notes TEXT,
    location VARCHAR(255),
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_session_times CHECK (end_time IS NULL OR end_time > start_time)
);

COMMENT ON TABLE study_sessions IS 'Track study sessions and time spent on assignments for analytics';

-- ========================
-- 6. ADD FOREIGN KEY CONSTRAINTS
-- ========================

-- Add semester foreign key to assignments
ALTER TABLE public.assignments 
ADD CONSTRAINT fk_assignments_semester 
FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE SET NULL;

-- ========================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ========================

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_semester_id ON public.assignments(semester_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assignment_type ON public.assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_assignments_status_due_date ON public.assignments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_auto_detected ON public.assignments(is_auto_detected);
CREATE INDEX IF NOT EXISTS idx_assignments_external_calendar ON public.assignments(external_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_progress ON public.assignments(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_assignments_academic_metadata ON public.assignments USING GIN(academic_metadata);
CREATE INDEX IF NOT EXISTS idx_assignments_tags ON public.assignments USING GIN(tags);

-- Semesters indexes
CREATE INDEX IF NOT EXISTS idx_semesters_user_current ON public.semesters(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_semesters_date_range ON public.semesters(start_date, end_date);

-- Grade analytics indexes (deferred for future implementation)
-- CREATE INDEX IF NOT EXISTS idx_grade_analytics_user_subject ON public.grade_analytics(user_id, subject_id);
-- CREATE INDEX IF NOT EXISTS idx_grade_analytics_semester ON public.grade_analytics(semester_id);
-- CREATE INDEX IF NOT EXISTS idx_grade_analytics_calculation_date ON public.grade_analytics(calculation_date);

-- Study sessions indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_assignment ON public.study_sessions(user_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_time_range ON public.study_sessions(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON public.study_sessions(subject_id);

-- ========================
-- 8. CREATE FUNCTIONS FOR ANALYTICS
-- ========================

-- Function to calculate assignment completion rate
CREATE OR REPLACE FUNCTION calculate_completion_rate(p_user_id UUID, p_semester_id UUID DEFAULT NULL)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_count INTEGER;
    completed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM assignments
    WHERE user_id = p_user_id
    AND (p_semester_id IS NULL OR semester_id = p_semester_id);
    
    SELECT COUNT(*) INTO completed_count
    FROM assignments
    WHERE user_id = p_user_id
    AND status = 'Completed'
    AND (p_semester_id IS NULL OR semester_id = p_semester_id);
    
    IF total_count = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (completed_count::DECIMAL / total_count::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get upcoming assignments with priority scoring
CREATE OR REPLACE FUNCTION get_prioritized_assignments(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    assignment_id UUID,
    title VARCHAR(500),
    due_date TIMESTAMP WITH TIME ZONE,
    priority_score DECIMAL(5,2),
    urgency_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.due_date,
        -- Priority scoring algorithm
        CASE 
            WHEN a.due_date < NOW() + INTERVAL '1 day' THEN 100.0
            WHEN a.due_date < NOW() + INTERVAL '3 days' THEN 80.0
            WHEN a.due_date < NOW() + INTERVAL '7 days' THEN 60.0
            ELSE 40.0
        END +
        CASE a.priority
            WHEN 'High' THEN 20.0
            WHEN 'Medium' THEN 10.0
            ELSE 0.0
        END +
        CASE 
            WHEN a.progress_percentage < 25 THEN 15.0
            WHEN a.progress_percentage < 50 THEN 10.0
            WHEN a.progress_percentage < 75 THEN 5.0
            ELSE 0.0
        END AS priority_score,
        CASE 
            WHEN a.due_date < NOW() + INTERVAL '1 day' THEN 'critical'
            WHEN a.due_date < NOW() + INTERVAL '3 days' THEN 'high'
            WHEN a.due_date < NOW() + INTERVAL '7 days' THEN 'medium'
            ELSE 'low'
        END AS urgency_level
    FROM assignments a
    WHERE a.user_id = p_user_id
    AND a.status != 'Completed'
    AND a.due_date > NOW()
    ORDER BY priority_score DESC, a.due_date ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- 9. ENABLE ROW LEVEL SECURITY
-- ========================

-- Enable RLS on new tables
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.grade_analytics ENABLE ROW LEVEL SECURITY; -- Deferred for future implementation
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own semesters" ON public.semesters
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view assignment categories" ON public.assignment_categories
    FOR SELECT USING (TRUE);

-- CREATE POLICY "Users can manage their own grade analytics" ON public.grade_analytics
--     FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own study sessions" ON public.study_sessions
    FOR ALL USING (auth.uid() = user_id);

-- ========================
-- 10. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ========================

-- Grade analytics trigger function (deferred for future implementation)
-- This will automatically calculate and update grade analytics when assignments change
-- 
-- CREATE OR REPLACE FUNCTION update_grade_analytics_trigger()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     -- Recalculate analytics for the affected subject/semester combination
--     INSERT INTO grade_analytics (
--         user_id, subject_id, semester_id, calculation_date,
--         total_assignments, completed_assignments, graded_assignments,
--         average_grade, last_calculated_at
--     )
--     SELECT 
--         NEW.user_id,
--         NEW.subject_id,
--         NEW.semester_id,
--         CURRENT_DATE,
--         COUNT(*) as total,
--         COUNT(*) FILTER (WHERE status = 'Completed') as completed,
--         COUNT(*) FILTER (WHERE received_grade IS NOT NULL) as graded,
--         AVG(received_grade) as avg_grade,
--         NOW()
--     FROM assignments
--     WHERE user_id = NEW.user_id
--     AND subject_id = NEW.subject_id
--     AND (semester_id = NEW.semester_id OR (semester_id IS NULL AND NEW.semester_id IS NULL))
--     GROUP BY user_id, subject_id, semester_id
--     ON CONFLICT (user_id, subject_id, semester_id, calculation_date)
--     DO UPDATE SET
--         total_assignments = EXCLUDED.total_assignments,
--         completed_assignments = EXCLUDED.completed_assignments,
--         graded_assignments = EXCLUDED.graded_assignments,
--         average_grade = EXCLUDED.average_grade,
--         last_calculated_at = NOW();
--     
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE OR REPLACE TRIGGER trigger_update_grade_analytics
--     AFTER INSERT OR UPDATE OR DELETE ON public.assignments
--     FOR EACH ROW
--     EXECUTE FUNCTION update_grade_analytics_trigger();

-- Function to automatically update assignment status based on due date
CREATE OR REPLACE FUNCTION auto_update_assignment_status()
RETURNS VOID AS $$
BEGIN
    -- Mark assignments as overdue
    UPDATE assignments
    SET status = 'Overdue', updated_at = NOW()
    WHERE due_date < NOW()
    AND status NOT IN ('Completed', 'Overdue')
    AND status != 'Completed';
    
    -- Update assignments approaching due date to 'urgent' if they're not started
    UPDATE assignments
    SET status = 'To Do', updated_at = NOW()
    WHERE due_date < NOW() + INTERVAL '2 days'
    AND due_date > NOW()
    AND status = 'Not Started';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration completed successfully
INSERT INTO public.assignment_categories (name, description, keywords, default_type, color, icon, is_system_category) VALUES
('Midterms', 'Mid-semester examinations', '["midterm", "mid-term", "middle", "mid-semester"]', 'exam', '#F97316', 'exam', TRUE),
('Finals', 'Final examinations', '["final", "finals", "final exam", "end-of-semester"]', 'exam', '#DC2626', 'exam', TRUE)
ON CONFLICT (name) DO NOTHING;