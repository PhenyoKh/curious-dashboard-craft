/**
 * Timezone Service - Handles timezone conversions, user preferences, and timezone-aware operations
 */

import { logger } from '@/utils/logger';

export interface TimezoneInfo {
  timezone: string;
  offset: number;
  abbreviation: string;
  isDST: boolean;
}

export interface UserTimezonePreferences {
  userTimezone: string;
  timeFormat: '12h' | '24h';
  weekStartsOn: 'sunday' | 'monday';
  defaultEventDuration: number;
  defaultReminderMinutes: number;
  showTimezoneInEvents: boolean;
  autoDetectTimezone: boolean;
}

export interface TimezoneAwareEvent {
  id?: string;
  title: string;
  startTime: string; // ISO string in UTC
  endTime: string; // ISO string in UTC
  eventTimezone: string; // IANA timezone
  displayStartTime?: string; // Formatted for display in user's timezone
  displayEndTime?: string; // Formatted for display in user's timezone
}

export class TimezoneService {
  
  /**
   * Get user's current timezone using browser API
   */
  static getUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      logger.warn('Could not detect user timezone:', error);
      return 'UTC';
    }
  }

  /**
   * Get timezone information for a specific timezone
   */
  static getTimezoneInfo(timezone: string, date: Date = new Date()): TimezoneInfo {
    try {
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      
      const parts = formatter.formatToParts(date);
      const abbreviation = parts.find(part => part.type === 'timeZoneName')?.value || '';
      
      // Get offset in minutes
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      const offset = (localDate.getTime() - utcDate.getTime()) / (1000 * 60);
      
      // Check if DST is active
      const jan = new Date(date.getFullYear(), 0, 1);
      const jul = new Date(date.getFullYear(), 6, 1);
      const janOffset = this.getTimezoneOffset(timezone, jan);
      const julOffset = this.getTimezoneOffset(timezone, jul);
      const isDST = offset !== Math.min(janOffset, julOffset);
      
      return {
        timezone,
        offset,
        abbreviation,
        isDST
      };
    } catch (error) {
      logger.warn('Error getting timezone info:', error);
      return {
        timezone: 'UTC',
        offset: 0,
        abbreviation: 'UTC',
        isDST: false
      };
    }
  }

  /**
   * Get timezone offset in minutes for a specific date
   */
  private static getTimezoneOffset(timezone: string, date: Date): number {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (localDate.getTime() - utcDate.getTime()) / (1000 * 60);
  }

  /**
   * Convert a date from one timezone to another
   */
  static convertTimezone(
    dateString: string, 
    fromTimezone: string, 
    toTimezone: string
  ): string {
    try {
      const date = new Date(dateString);
      
      // If the date is already in UTC, convert directly
      if (fromTimezone === 'UTC') {
        return new Date(date.toLocaleString('en-US', { timeZone: toTimezone })).toISOString();
      }
      
      // Convert from source timezone to UTC first, then to target timezone
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const sourceDate = new Date(date.toLocaleString('en-US', { timeZone: fromTimezone }));
      const offsetMs = utcDate.getTime() - sourceDate.getTime();
      
      const adjustedDate = new Date(date.getTime() + offsetMs);
      return new Date(adjustedDate.toLocaleString('en-US', { timeZone: toTimezone })).toISOString();
    } catch (error) {
      logger.warn('Error converting timezone:', error);
      return dateString;
    }
  }

  /**
   * Convert local time to UTC for storage
   */
  static toUTC(localDateString: string, timezone: string): string {
    try {
      // Create a date assuming the input is in the specified timezone
      const date = new Date(localDateString);
      const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
      
      // Get the timezone offset for the specified timezone
      const targetOffset = this.getTimezoneOffset(timezone, date);
      const localTime = utcTime + (targetOffset * 60000);
      
      return new Date(localTime).toISOString();
    } catch (error) {
      logger.warn('Error converting to UTC:', error);
      return localDateString;
    }
  }

  /**
   * Convert UTC time to local timezone for display
   */
  static fromUTC(utcDateString: string, timezone: string): string {
    try {
      const date = new Date(utcDateString);
      return new Date(date.toLocaleString('en-US', { timeZone: timezone })).toISOString();
    } catch (error) {
      logger.warn('Error converting from UTC:', error);
      return utcDateString;
    }
  }

  /**
   * Format time according to user preferences
   */
  static formatTime(
    dateString: string, 
    timezone: string, 
    format: '12h' | '24h' = '24h',
    showTimezone: boolean = false
  ): string {
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: format === '12h'
      };

      if (showTimezone) {
        options.timeZoneName = 'short';
      }

      return date.toLocaleTimeString('en-US', options);
    } catch (error) {
      logger.warn('Error formatting time:', error);
      return dateString;
    }
  }

  /**
   * Format date and time according to user preferences
   */
  static formatDateTime(
    dateString: string, 
    timezone: string, 
    timeFormat: '12h' | '24h' = '24h',
    showTimezone: boolean = false
  ): string {
    try {
      const date = new Date(dateString);
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12h'
      };

      if (showTimezone) {
        dateOptions.timeZoneName = 'short';
      }

      return date.toLocaleString('en-US', dateOptions);
    } catch (error) {
      logger.warn('Error formatting datetime:', error);
      return dateString;
    }
  }

  /**
   * Get popular timezones for selection dropdown
   */
  static getPopularTimezones(): Array<{ value: string; label: string; offset: string }> {
    const popularZones = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Africa/Cairo',
      'Africa/Lagos',
      'Africa/Johannesburg',
      'Africa/Nairobi',
      'Africa/Casablanca',
      'Africa/Algiers',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Kolkata',
      'Australia/Sydney',
      'Pacific/Auckland'
    ];

    return popularZones.map(zone => {
      const info = this.getTimezoneInfo(zone);
      const offsetHours = info.offset / 60;
      const offsetSign = offsetHours >= 0 ? '+' : '-';
      const offsetString = `UTC${offsetSign}${Math.abs(offsetHours).toFixed(1).replace('.0', '')}`;
      
      return {
        value: zone,
        label: `${zone.replace('_', ' ')} (${info.abbreviation})`,
        offset: offsetString
      };
    });
  }

  /**
   * Check if two events have timezone conflicts (same local time but different timezones)
   */
  static hasTimezoneConflict(
    event1: TimezoneAwareEvent, 
    event2: TimezoneAwareEvent
  ): boolean {
    try {
      // Convert both events to UTC for comparison
      const event1StartUTC = this.toUTC(event1.startTime, event1.eventTimezone);
      const event1EndUTC = this.toUTC(event1.endTime, event1.eventTimezone);
      const event2StartUTC = this.toUTC(event2.startTime, event2.eventTimezone);
      const event2EndUTC = this.toUTC(event2.endTime, event2.eventTimezone);

      // Check for overlap
      return (
        new Date(event1StartUTC) < new Date(event2EndUTC) &&
        new Date(event2StartUTC) < new Date(event1EndUTC)
      );
    } catch (error) {
      logger.warn('Error checking timezone conflict:', error);
      return false;
    }
  }

  /**
   * Prepare event for display with timezone conversion
   */
  static prepareEventForDisplay(
    event: TimezoneAwareEvent,
    userTimezone: string,
    userPreferences: UserTimezonePreferences
  ): TimezoneAwareEvent {
    try {
      const displayStartTime = this.formatDateTime(
        this.fromUTC(event.startTime, userTimezone),
        userTimezone,
        userPreferences.timeFormat,
        userPreferences.showTimezoneInEvents
      );

      const displayEndTime = this.formatTime(
        this.fromUTC(event.endTime, userTimezone),
        userTimezone,
        userPreferences.timeFormat,
        userPreferences.showTimezoneInEvents
      );

      return {
        ...event,
        displayStartTime,
        displayEndTime
      };
    } catch (error) {
      logger.warn('Error preparing event for display:', error);
      return event;
    }
  }

  /**
   * Get week start date based on user preference
   */
  static getWeekStart(date: Date, weekStartsOn: 'sunday' | 'monday'): Date {
    const dayOfWeek = date.getDay();
    const startOffset = weekStartsOn === 'monday' ? 
      (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) : 
      -dayOfWeek;
    
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + startOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    return weekStart;
  }

  /**
   * Validate timezone string
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all available timezones (comprehensive list)
   */
  static getAllTimezones(): string[] {
    return Intl.supportedValuesOf('timeZone');
  }

  /**
   * Handle daylight saving time transitions for recurring events
   */
  static adjustForDST(
    originalDateTime: string,
    originalTimezone: string,
    targetDate: Date
  ): string {
    try {
      const originalDate = new Date(originalDateTime);
      const originalTime = {
        hours: originalDate.getHours(),
        minutes: originalDate.getMinutes(),
        seconds: originalDate.getSeconds()
      };

      // Create new date with same local time in the target date
      const adjustedDate = new Date(targetDate);
      adjustedDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, 0);

      return adjustedDate.toISOString();
    } catch (error) {
      logger.warn('Error adjusting for DST:', error);
      return originalDateTime;
    }
  }
}