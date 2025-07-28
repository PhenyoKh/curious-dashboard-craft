/**
 * Enhanced Assignment Types - Academic-focused assignment management
 * Supports advanced features like auto-detection, progress tracking, and calendar integration
 */

import type { Database } from '../integrations/supabase/types';

// Base types from database
export type Assignment = Database['public']['Tables']['assignments']['Row'];
export type AssignmentInsert = Database['public']['Tables']['assignments']['Insert'];
export type AssignmentUpdate = Database['public']['Tables']['assignments']['Update'];
export type Semester = Database['public']['Tables']['semesters']['Row'];
export type SemesterInsert = Database['public']['Tables']['semesters']['Insert'];
export type SemesterUpdate = Database['public']['Tables']['semesters']['Update'];
export type AssignmentCategory = Database['public']['Tables']['assignment_categories']['Row'];
export type StudySession = Database['public']['Tables']['study_sessions']['Row'];
export type StudySessionInsert = Database['public']['Tables']['study_sessions']['Insert'];

// Enhanced assignment types with computed fields
export interface EnhancedAssignment extends Assignment {
  subject_name?: string;
  subject_code?: string; 
  subject_color?: string;
  semester_name?: string;
  category_name?: string;
  days_until_due?: number;
  urgency_level?: UrgencyLevel;
  completion_status?: CompletionStatus;
  total_study_time?: number; // from study_sessions
  average_session_productivity?: number;
}

// Assignment type enumeration
export type AssignmentType = 
  | 'assignment'
  | 'exam' 
  | 'project'
  | 'quiz'
  | 'presentation'
  | 'lab'
  | 'homework'
  | 'paper'
  | 'discussion';

// Submission type enumeration
export type SubmissionType =
  | 'online'
  | 'paper'
  | 'presentation'
  | 'email'
  | 'in_person'
  | 'upload'
  | 'quiz_platform';

// Assignment status with enhanced academic context
export type AssignmentStatus =
  | 'Not Started'
  | 'In Progress'
  | 'To Do'
  | 'On Track'
  | 'Overdue'
  | 'Completed'
  | 'Submitted'
  | 'Graded'
  | 'Late Submission';

// Priority levels
export type Priority = 'Low' | 'Medium' | 'High';

// Difficulty rating (1-5 scale)
export type DifficultyRating = 1 | 2 | 3 | 4 | 5;

// Urgency levels based on due date proximity
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

// Completion status based on progress and due date
export type CompletionStatus = 'on_time' | 'at_risk' | 'overdue' | 'completed' | 'submitted';

// Academic metadata for auto-detected assignments
export interface AcademicMetadata {
  detection_keywords?: string[];
  source_calendar?: string;
  original_title?: string;
  confidence_factors?: {
    keyword_match: number;
    title_pattern: number;
    calendar_source: number;
    context_clues: number;
  };
  classification_tags?: string[];
  instructor_info?: {
    name?: string;
    email?: string;
    course?: string;
  };
  course_info?: {
    code?: string;
    section?: string;
    credits?: number;
  };
}

// Reminder schedule configuration
export interface ReminderSchedule {
  reminders: ReminderConfig[];
  default_enabled: boolean;
  custom_schedule?: boolean;
}

export interface ReminderConfig {
  id: string;
  type: 'due_date' | 'start_work' | 'progress_check' | 'custom';
  timing: number; // minutes before due date or custom timestamp
  message?: string;
  enabled: boolean;
  method: 'push' | 'email' | 'both';
}

// Study session types
export type StudySessionType = 
  | 'study'
  | 'research'
  | 'writing'
  | 'reviewing'
  | 'practice'
  | 'group_study';

// Productivity rating (1-5 scale)
export type ProductivityRating = 1 | 2 | 3 | 4 | 5;

// Enhanced study session with assignment context
export interface EnhancedStudySession extends StudySession {
  assignment_title?: string;
  subject_name?: string;
  efficiency_score?: number; // calculated metric
  focus_rating?: number;
  break_frequency?: number;
}

// Semester term types
export type TermType = 
  | 'fall'
  | 'spring' 
  | 'summer'
  | 'winter'
  | 'semester1'
  | 'semester2'
  | 'quarter1'
  | 'quarter2'
  | 'quarter3'
  | 'quarter4';

// Assignment creation form data
export interface AssignmentFormData {
  title: string;
  description?: string;
  due_date: Date;
  assignment_type: AssignmentType;
  submission_type: SubmissionType;
  priority: Priority;
  subject_id?: string;
  semester_id?: string;
  submission_url?: string;
  submission_instructions?: string;
  study_time_estimate?: number;
  difficulty_rating?: DifficultyRating;
  tags?: string[];
  reminder_schedule?: ReminderSchedule;
}

// Assignment update form data
export interface AssignmentUpdateData {
  title?: string;
  description?: string;
  due_date?: Date;
  status?: AssignmentStatus;
  progress_percentage?: number;
  time_spent_minutes?: number;
  difficulty_rating?: DifficultyRating;
  tags?: string[];
  submission_url?: string;
}

// Assignment filters for UI
export interface AssignmentFilters {
  status?: AssignmentStatus[];
  type?: AssignmentType[];
  priority?: Priority[];
  subject_id?: string[];
  semester_id?: string;
  urgency_level?: UrgencyLevel[];
  date_range?: {
    from: Date;
    to: Date;
  };
  tags?: string[];
  search_query?: string;
}

// Sort options for assignments
export type AssignmentSortOption = 
  | 'due_date'
  | 'created_at'
  | 'priority'
  | 'status'
  | 'title'
  | 'subject'
  | 'progress'
  | 'urgency_score';

export interface AssignmentSortConfig {
  field: AssignmentSortOption;
  direction: 'asc' | 'desc';
}

// Calendar integration types
export interface CalendarEventMapping {
  assignment_id: string;
  external_calendar_id: string;
  external_event_id: string;
  provider: 'google' | 'microsoft' | 'apple';
  last_synced: Date;
  sync_status: 'synced' | 'pending' | 'error' | 'conflict';
}

// Assignment detection from calendar events
export interface AssignmentDetectionResult {
  detected: boolean;
  confidence: number; // 0-1 scale
  suggested_data: Partial<AssignmentFormData>;
  detection_reasons: string[];
  requires_review: boolean;
}

// Batch operations
export interface BatchAssignmentOperation {
  operation: 'update_status' | 'update_priority' | 'delete' | 'move_semester' | 'add_tags';
  assignment_ids: string[];
  data: any;
}

// Assignment analytics summary
export interface AssignmentAnalytics {
  total_assignments: number;
  completed_assignments: number;
  overdue_assignments: number;
  completion_rate: number;
  average_completion_time: number; // in days
  most_common_type: AssignmentType;
  subjects_by_workload: Array<{
    subject_id: string;
    subject_name: string;
    assignment_count: number;
    avg_difficulty: number;
  }>;
  upcoming_deadlines: Array<{
    assignment_id: string;
    title: string;
    due_date: Date;
    urgency_level: UrgencyLevel;
  }>;
}

// Time management insights
export interface TimeManagementInsights {
  total_study_time: number; // minutes
  average_daily_study_time: number;
  most_productive_hours: number[];
  efficiency_by_subject: Array<{
    subject_id: string;
    subject_name: string;
    minutes_per_assignment: number;
    productivity_score: number;
  }>;
  procrastination_patterns: {
    avg_start_delay: number; // days between assignment creation and first study session
    last_minute_completion_rate: number;
    optimal_start_time: number; // days before due date
  };
}

// Syllabus parsing result
export interface ParsedSyllabus {
  course_info: {
    name: string;
    code: string;
    instructor: string;
    semester: string;
    credits?: number;
  };
  assignments: Array<{
    title: string;
    type: AssignmentType;
    due_date: Date;
    description?: string;
    weight?: number;
  }>;
  exams: Array<{
    title: string;
    type: 'midterm' | 'final' | 'quiz';
    date: Date;
    coverage?: string;
  }>;
  important_dates: Array<{
    date: Date;
    description: string;
    type: 'assignment' | 'exam' | 'holiday' | 'break';
  }>;
  grading_scale?: {
    [key: string]: number; // e.g., "A": 90, "B": 80
  };
}

// Assignment recommendation engine
export interface AssignmentRecommendation {
  type: 'start_early' | 'break_down' | 'schedule_study' | 'seek_help' | 'prioritize';
  assignment_id: string;
  title: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  action_items: string[];
  estimated_time_savings?: number; // minutes
}

// Export utility types
export type CreateAssignmentPayload = Omit<AssignmentInsert, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAssignmentPayload = Partial<AssignmentUpdate>;

// View mode types for UI
export type AssignmentViewMode = 'list' | 'calendar' | 'kanban' | 'timeline' | 'analytics';

// Kanban board configuration
export interface KanbanBoardConfig {
  columns: Array<{
    id: string;
    title: string;
    status: AssignmentStatus[];
    color: string;
    limit?: number;
  }>;
  group_by: 'status' | 'priority' | 'subject' | 'type';
}

// Timeline view configuration
export interface TimelineViewConfig {
  time_range: 'week' | 'month' | 'semester';
  group_by: 'subject' | 'type' | 'priority';
  show_study_sessions: boolean;
  show_milestones: boolean;
}

// Assignment template for recurring assignments
export interface AssignmentTemplate {
  id: string;
  name: string;
  description?: string;
  template_data: Partial<AssignmentFormData>;
  usage_count: number;
  is_shared: boolean;
  created_by: string;
  tags: string[];
}

// Notification preferences for assignments
export interface AssignmentNotificationPreferences {
  due_date_reminders: boolean;
  progress_check_reminders: boolean;
  overdue_notifications: boolean;
  completion_celebrations: boolean;
  daily_summary: boolean;
  weekly_outlook: boolean;
  custom_reminders: ReminderConfig[];
}