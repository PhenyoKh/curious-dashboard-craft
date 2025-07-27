/**
 * User Preferences Service - Manages user timezone and calendar preferences
 */

import { supabase } from '@/integrations/supabase/client';
import { TimezoneService, UserTimezonePreferences } from './timezoneService';

export interface CalendarSettings {
  sync_google: boolean;
  sync_outlook: boolean;
  show_weekends: boolean;
  default_view: 'week' | 'month' | 'day';
  week_starts_on: 'sunday' | 'monday';
  user_timezone: string;
  time_format: '12h' | '24h';
  default_event_duration: number;
  default_reminder_minutes: number;
  show_timezone_in_events: boolean;
  auto_detect_timezone: boolean;
}

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  sync_google: false,
  sync_outlook: false,
  show_weekends: true,
  default_view: 'week',
  week_starts_on: 'monday',
  user_timezone: 'UTC',
  time_format: '24h',
  default_event_duration: 60,
  default_reminder_minutes: 15,
  show_timezone_in_events: true,
  auto_detect_timezone: true
};

export class UserPreferencesService {
  
  /**
   * Get user's calendar preferences
   */
  static async getUserPreferences(userId: string): Promise<CalendarSettings> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('calendar_settings')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn('Error fetching user preferences:', error);
        return this.getDefaultPreferencesWithTimezone();
      }

      if (!data?.calendar_settings) {
        return this.getDefaultPreferencesWithTimezone();
      }

      // Merge with defaults to ensure all fields are present
      const preferences = {
        ...DEFAULT_CALENDAR_SETTINGS,
        ...data.calendar_settings
      };

      // Auto-detect timezone if enabled and timezone is still UTC
      if (preferences.auto_detect_timezone && preferences.user_timezone === 'UTC') {
        preferences.user_timezone = TimezoneService.getUserTimezone();
        await this.updateUserPreferences(userId, preferences);
      }

      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return this.getDefaultPreferencesWithTimezone();
    }
  }

  /**
   * Update user's calendar preferences
   */
  static async updateUserPreferences(
    userId: string, 
    preferences: Partial<CalendarSettings>
  ): Promise<CalendarSettings> {
    try {
      // Get current preferences first
      const currentPreferences = await this.getUserPreferences(userId);
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          calendar_settings: updatedPreferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      return updatedPreferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Get timezone preferences in the format expected by TimezoneService
   */
  static convertToTimezonePreferences(settings: CalendarSettings): UserTimezonePreferences {
    return {
      userTimezone: settings.user_timezone,
      timeFormat: settings.time_format,
      weekStartsOn: settings.week_starts_on,
      defaultEventDuration: settings.default_event_duration,
      defaultReminderMinutes: settings.default_reminder_minutes,
      showTimezoneInEvents: settings.show_timezone_in_events,
      autoDetectTimezone: settings.auto_detect_timezone
    };
  }

  /**
   * Get default preferences with auto-detected timezone
   */
  private static getDefaultPreferencesWithTimezone(): CalendarSettings {
    return {
      ...DEFAULT_CALENDAR_SETTINGS,
      user_timezone: TimezoneService.getUserTimezone()
    };
  }

  /**
   * Initialize user preferences for new users
   */
  static async initializeUserPreferences(userId: string): Promise<CalendarSettings> {
    try {
      const defaultPreferences = this.getDefaultPreferencesWithTimezone();
      
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          calendar_settings: defaultPreferences,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        throw error;
      }

      return defaultPreferences;
    } catch (error) {
      console.error('Error initializing user preferences:', error);
      return this.getDefaultPreferencesWithTimezone();
    }
  }

  /**
   * Get user's timezone preference
   */
  static async getUserTimezone(userId: string): Promise<string> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.user_timezone;
    } catch (error) {
      console.warn('Error getting user timezone:', error);
      return TimezoneService.getUserTimezone();
    }
  }

  /**
   * Update only the timezone preference
   */
  static async updateUserTimezone(userId: string, timezone: string): Promise<void> {
    if (!TimezoneService.isValidTimezone(timezone)) {
      throw new Error('Invalid timezone provided');
    }

    await this.updateUserPreferences(userId, {
      user_timezone: timezone
    });
  }

  /**
   * Get time format preference
   */
  static async getTimeFormat(userId: string): Promise<'12h' | '24h'> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.time_format;
    } catch (error) {
      console.warn('Error getting time format:', error);
      return '24h';
    }
  }

  /**
   * Update time format preference
   */
  static async updateTimeFormat(userId: string, format: '12h' | '24h'): Promise<void> {
    await this.updateUserPreferences(userId, {
      time_format: format
    });
  }

  /**
   * Get week start preference
   */
  static async getWeekStartDay(userId: string): Promise<'sunday' | 'monday'> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.week_starts_on;
    } catch (error) {
      console.warn('Error getting week start day:', error);
      return 'monday';
    }
  }

  /**
   * Get default event duration
   */
  static async getDefaultEventDuration(userId: string): Promise<number> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.default_event_duration;
    } catch (error) {
      console.warn('Error getting default event duration:', error);
      return 60; // 1 hour default
    }
  }

  /**
   * Get default reminder minutes
   */
  static async getDefaultReminderMinutes(userId: string): Promise<number> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.default_reminder_minutes;
    } catch (error) {
      console.warn('Error getting default reminder minutes:', error);
      return 15; // 15 minutes default
    }
  }

  /**
   * Check if timezone should be shown in events
   */
  static async shouldShowTimezone(userId: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.show_timezone_in_events;
    } catch (error) {
      console.warn('Error getting timezone display preference:', error);
      return true;
    }
  }

  /**
   * Export all user preferences for backup/transfer
   */
  static async exportUserPreferences(userId: string): Promise<CalendarSettings> {
    return this.getUserPreferences(userId);
  }

  /**
   * Import user preferences from backup
   */
  static async importUserPreferences(
    userId: string, 
    preferences: CalendarSettings
  ): Promise<void> {
    // Validate timezone before importing
    if (preferences.user_timezone && !TimezoneService.isValidTimezone(preferences.user_timezone)) {
      preferences.user_timezone = TimezoneService.getUserTimezone();
    }

    await this.updateUserPreferences(userId, preferences);
  }
}