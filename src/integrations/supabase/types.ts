export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      assignments: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          title: string
          description: string | null
          due_date: string
          status: 'Not Started' | 'In Progress' | 'To Do' | 'On Track' | 'Overdue' | 'Completed'
          priority: 'Low' | 'Medium' | 'High'
          estimated_hours: number | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          title: string
          description?: string | null
          due_date: string
          status?: 'Not Started' | 'In Progress' | 'To Do' | 'On Track' | 'Overdue' | 'Completed'
          priority?: 'Low' | 'Medium' | 'High'
          estimated_hours?: number | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          title?: string
          description?: string | null
          due_date?: string
          status?: 'Not Started' | 'In Progress' | 'To Do' | 'On Track' | 'Overdue' | 'Completed'
          priority?: 'Low' | 'Medium' | 'High'
          estimated_hours?: number | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notes: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          title: string
          content: string
          content_text: string
          word_count: number
          highlights: Json[]
          metadata: Json
          created_at: string
          modified_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          title: string
          content: string
          content_text: string
          word_count?: number
          highlights?: Json[]
          metadata?: Json
          created_at?: string
          modified_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          title?: string
          content?: string
          content_text?: string
          word_count?: number
          highlights?: Json[]
          metadata?: Json
          created_at?: string
          modified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      schedule_events: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          title: string
          description: string | null
          event_type: 'class' | 'study' | 'exam' | 'assignment' | 'break' | 'other'
          start_time: string
          end_time: string
          is_recurring: boolean
          recurrence_pattern: Json | null
          location: string | null
          reminder_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id?: string | null
          title: string
          description?: string | null
          event_type?: 'class' | 'study' | 'exam' | 'assignment' | 'break' | 'other'
          start_time: string
          end_time: string
          is_recurring?: boolean
          recurrence_pattern?: Json | null
          location?: string | null
          reminder_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string | null
          title?: string
          description?: string | null
          event_type?: 'class' | 'study' | 'exam' | 'assignment' | 'break' | 'other'
          start_time?: string
          end_time?: string
          is_recurring?: boolean
          recurrence_pattern?: Json | null
          location?: string | null
          reminder_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          value: string
          label: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          value: string
          label: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          value?: string
          label?: string
          color?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          bio: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme: 'light' | 'dark' | 'system'
          language: string
          auto_save_notes: boolean
          show_line_numbers: boolean
          enable_spell_check: boolean
          email_notifications: Json
          push_notifications: Json
          privacy_settings: Json
          calendar_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: 'light' | 'dark' | 'system'
          language?: string
          auto_save_notes?: boolean
          show_line_numbers?: boolean
          enable_spell_check?: boolean
          email_notifications?: Json
          push_notifications?: Json
          privacy_settings?: Json
          calendar_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: 'light' | 'dark' | 'system'
          language?: string
          auto_save_notes?: boolean
          show_line_numbers?: boolean
          enable_spell_check?: boolean
          email_notifications?: Json
          push_notifications?: Json
          privacy_settings?: Json
          calendar_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_recent_notes: {
        Args: {
          user_uuid: string
          note_limit?: number
        }
        Returns: {
          id: string
          title: string
          subject_label: string
          modified_at: string
          word_count: number
        }[]
      }
      get_upcoming_assignments: {
        Args: {
          user_uuid: string
          days_ahead?: number
        }
        Returns: {
          id: string
          title: string
          subject_label: string
          due_date: string
          status: string
          priority: string
        }[]
      }
      search_notes: {
        Args: {
          user_uuid: string
          search_query: string
          note_limit?: number
        }
        Returns: {
          id: string
          title: string
          content_text: string
          subject_label: string
          modified_at: string
          rank: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for specific JSONB fields
export interface EmailNotifications {
  assignment_reminders: boolean
  schedule_updates: boolean
  weekly_summary: boolean
}

export interface PushNotifications {
  study_reminders: boolean
  break_reminders: boolean
  achievement_notifications: boolean
}

export interface PrivacySettings {
  profile_private: boolean
  analytics_tracking: boolean
}

export interface CalendarSettings {
  sync_google: boolean
  sync_outlook: boolean
  show_weekends: boolean
  default_view: 'day' | 'week' | 'month'
  week_starts_on: 'sunday' | 'monday'
}

export interface NoteHighlight {
  id: string
  type: 'key_definition' | 'main_principle' | 'example' | 'to_review'
  startOffset: number
  endOffset: number
  text: string
  color: string
  created_at: string
}

export interface NoteMetadata {
  tags?: string[]
  lastEditedBy?: string
  version?: number
  exportedFormats?: string[]
  [key: string]: any
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  daysOfWeek?: number[]
  endDate?: string
  occurrences?: number
}

// Type aliases for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types
export type UserProfile = Tables<'user_profiles'>
export type UserSettings = Tables<'user_settings'>
export type Subject = Tables<'subjects'>
export type Note = Tables<'notes'>
export type Assignment = Tables<'assignments'>
export type ScheduleEvent = Tables<'schedule_events'>

// Insert types
export type UserProfileInsert = TablesInsert<'user_profiles'>
export type UserSettingsInsert = TablesInsert<'user_settings'>
export type SubjectInsert = TablesInsert<'subjects'>
export type NoteInsert = TablesInsert<'notes'>
export type AssignmentInsert = TablesInsert<'assignments'>
export type ScheduleEventInsert = TablesInsert<'schedule_events'>

// Update types
export type UserProfileUpdate = TablesUpdate<'user_profiles'>
export type UserSettingsUpdate = TablesUpdate<'user_settings'>
export type SubjectUpdate = TablesUpdate<'subjects'>
export type NoteUpdate = TablesUpdate<'notes'>
export type AssignmentUpdate = TablesUpdate<'assignments'>
export type ScheduleEventUpdate = TablesUpdate<'schedule_events'>

// Function return types
export type RecentNote = Database['public']['Functions']['get_recent_notes']['Returns'][0]
export type UpcomingAssignment = Database['public']['Functions']['get_upcoming_assignments']['Returns'][0]
export type SearchResult = Database['public']['Functions']['search_notes']['Returns'][0]