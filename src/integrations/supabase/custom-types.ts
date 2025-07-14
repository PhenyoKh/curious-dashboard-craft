
import { Tables, TablesUpdate } from './types';

// Custom types for the application
export type UserProfile = Tables<'user_profiles'>;
export type UserSettings = Tables<'user_settings'>;

export type UserProfileUpdate = TablesUpdate<'user_profiles'>;
export type UserSettingsUpdate = TablesUpdate<'user_settings'>;

// Nested settings types
export interface EmailNotifications {
  assignment_reminders: boolean;
  schedule_updates: boolean;
  weekly_summary: boolean;
}

export interface PushNotifications {
  study_reminders: boolean;
  break_reminders: boolean;
  achievement_notifications: boolean;
}

export interface PrivacySettings {
  profile_private: boolean;
  analytics_tracking: boolean;
}

export interface CalendarSettings {
  sync_google: boolean;
  sync_outlook: boolean;
  show_weekends: boolean;
  default_view: 'day' | 'week' | 'month';
  week_starts_on: 'sunday' | 'monday';
}
