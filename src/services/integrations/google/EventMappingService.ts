/**
 * Event Mapping Service - Utilities for converting between local and Google Calendar event formats
 */

import { TimezoneService } from '@/services/timezoneService';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { RecurrenceService, RecurrencePattern } from '@/services/recurrenceService';
import { GoogleCalendarEventData } from './GoogleCalendarService';

export interface LocalEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  location?: string;
  is_all_day: boolean;
  reminder_minutes?: number;
  color?: string;
  external_calendar_id?: string;
  external_event_id?: string;
  sync_status?: 'local' | 'synced' | 'conflict' | 'deleted' | 'error';
  last_synced_at?: string;
  external_last_modified?: string;
  recurrence_pattern?: RecurrencePattern;
  recurrence_parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EventConversionOptions {
  userTimezone?: string;
  preserveTimezone?: boolean;
  includeAttendees?: boolean;
  includeRecurrence?: boolean;
  defaultReminderMinutes?: number;
}

export interface EventFieldMapping {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  allDay: boolean;
  reminders: any;
  recurrence: any;
  attendees: any;
  visibility: string;
  color: string;
}

export interface RecurrenceConversionResult {
  googleRecurrence?: string[];
  localPattern?: RecurrencePattern;
  isSupported: boolean;
  conversionNotes?: string;
}

export class EventMappingService {
  private static instance: EventMappingService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): EventMappingService {
    if (!EventMappingService.instance) {
      EventMappingService.instance = new EventMappingService();
    }
    return EventMappingService.instance;
  }

  /**
   * Convert Google Calendar event to local event format
   */
  async convertGoogleToLocal(
    userId: string,
    googleEvent: GoogleCalendarEventData,
    integrationId: string,
    options: EventConversionOptions = {}
  ): Promise<Partial<LocalEvent>> {
    // Get user preferences if not provided
    const userPreferences = await UserPreferencesService.getUserPreferences(userId);
    const userTimezone = options.userTimezone || userPreferences.user_timezone;
    const defaultReminder = options.defaultReminderMinutes || userPreferences.default_reminder_minutes;

    // Handle timezone conversion
    const { startTime, endTime, timezone, isAllDay } = this.convertGoogleTimes(
      googleEvent,
      userTimezone,
      options.preserveTimezone
    );

    // Convert recurrence pattern
    const recurrencePattern = options.includeRecurrence ? 
      this.convertGoogleRecurrenceToLocal(googleEvent.recurrence) : undefined;

    // Extract reminder minutes
    const reminderMinutes = this.extractReminderFromGoogle(googleEvent.reminders, defaultReminder);

    // Convert color
    const color = this.mapGoogleColorToLocal(googleEvent.colorId);

    return {
      user_id: userId,
      title: this.sanitizeText(googleEvent.summary) || 'Untitled Event',
      description: this.sanitizeText(googleEvent.description) || '',
      start_time: startTime,
      end_time: endTime,
      timezone: timezone,
      location: this.sanitizeText(googleEvent.location) || '',
      is_all_day: isAllDay,
      reminder_minutes: reminderMinutes,
      color: color,
      external_calendar_id: integrationId,
      external_event_id: googleEvent.id,
      sync_status: 'synced',
      external_last_modified: googleEvent.updated,
      recurrence_pattern: recurrencePattern?.localPattern,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Convert local event to Google Calendar format
   */
  async convertLocalToGoogle(
    localEvent: LocalEvent,
    options: EventConversionOptions = {}
  ): Promise<Omit<GoogleCalendarEventData, 'id' | 'etag' | 'updated'>> {
    // Handle timezone conversion for Google Calendar
    const { startDateTime, endDateTime, timeZone } = this.convertLocalTimes(
      localEvent,
      options.preserveTimezone
    );

    // Convert recurrence pattern
    const googleRecurrence = options.includeRecurrence ? 
      this.convertLocalRecurrenceToGoogle(localEvent.recurrence_pattern) : undefined;

    // Convert reminders
    const reminders = this.convertLocalRemindersToGoogle(
      localEvent.reminder_minutes,
      options.defaultReminderMinutes
    );

    // Convert color
    const colorId = this.mapLocalColorToGoogle(localEvent.color);

    // Build attendees if needed
    const attendees = options.includeAttendees ? [] : undefined; // Placeholder for attendee logic

    return {
      summary: localEvent.title,
      description: localEvent.description || '',
      start: {
        dateTime: startDateTime,
        timeZone: timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone
      },
      location: localEvent.location || '',
      reminders: reminders,
      recurrence: googleRecurrence?.googleRecurrence,
      attendees: attendees,
      visibility: 'default',
      status: 'confirmed',
      colorId: colorId
    };
  }

  /**
   * Convert Google Calendar time format to local format
   */
  private convertGoogleTimes(
    googleEvent: GoogleCalendarEventData,
    userTimezone: string,
    preserveTimezone?: boolean
  ): { startTime: string; endTime: string; timezone: string; isAllDay: boolean } {
    const googleStart = googleEvent.start;
    const googleEnd = googleEvent.end;

    // Detect all-day events
    const isAllDay = this.isGoogleEventAllDay(googleEvent);

    if (isAllDay) {
      // For all-day events, use the date as-is but set to user timezone
      const startDate = googleStart.dateTime.split('T')[0];
      const endDate = googleEnd.dateTime.split('T')[0];
      
      return {
        startTime: `${startDate}T00:00:00`,
        endTime: `${endDate}T23:59:59`,
        timezone: userTimezone,
        isAllDay: true
      };
    }

    // For timed events, convert timezone if needed
    const targetTimezone = preserveTimezone ? googleStart.timeZone : userTimezone;
    
    let startTime: string;
    let endTime: string;

    if (googleStart.timeZone === targetTimezone) {
      // No conversion needed
      startTime = googleStart.dateTime;
      endTime = googleEnd.dateTime;
    } else {
      // Convert timezone
      const startUTC = TimezoneService.toUTC(googleStart.dateTime, googleStart.timeZone);
      const endUTC = TimezoneService.toUTC(googleEnd.dateTime, googleEnd.timeZone);
      
      startTime = TimezoneService.fromUTC(startUTC, targetTimezone);
      endTime = TimezoneService.fromUTC(endUTC, targetTimezone);
    }

    return {
      startTime,
      endTime,
      timezone: targetTimezone,
      isAllDay: false
    };
  }

  /**
   * Convert local event times to Google Calendar format
   */
  private convertLocalTimes(
    localEvent: LocalEvent,
    preserveTimezone?: boolean
  ): { startDateTime: string; endDateTime: string; timeZone: string } {
    if (localEvent.is_all_day) {
      // For all-day events, convert to proper Google format
      const startDate = localEvent.start_time.split('T')[0];
      const endDate = localEvent.end_time.split('T')[0];
      
      return {
        startDateTime: `${startDate}T00:00:00`,
        endDateTime: `${endDate}T23:59:59`,
        timeZone: localEvent.timezone
      };
    }

    // For timed events, ensure proper format
    const timezone = preserveTimezone ? localEvent.timezone : 'UTC';
    
    let startDateTime: string;
    let endDateTime: string;

    if (timezone === localEvent.timezone) {
      startDateTime = localEvent.start_time;
      endDateTime = localEvent.end_time;
    } else {
      // Convert to target timezone
      startDateTime = TimezoneService.convertBetweenTimezones(
        localEvent.start_time,
        localEvent.timezone,
        timezone
      );
      endDateTime = TimezoneService.convertBetweenTimezones(
        localEvent.end_time,
        localEvent.timezone,
        timezone
      );
    }

    // Ensure proper ISO format
    if (!startDateTime.includes('T')) {
      startDateTime += 'T00:00:00';
    }
    if (!endDateTime.includes('T')) {
      endDateTime += 'T23:59:59';
    }

    return {
      startDateTime,
      endDateTime,
      timeZone: timezone
    };
  }

  /**
   * Convert Google Calendar recurrence rules to local format
   */
  private convertGoogleRecurrenceToLocal(googleRecurrence?: string[]): RecurrenceConversionResult {
    if (!googleRecurrence || googleRecurrence.length === 0) {
      return { isSupported: true };
    }

    try {
      // Parse RRULE (RFC 5545 format)
      const rrule = googleRecurrence[0]; // Google typically uses one RRULE
      
      if (!rrule.startsWith('RRULE:')) {
        return { isSupported: false, conversionNotes: 'Not a valid RRULE format' };
      }

      const ruleParams = this.parseRRule(rrule.substring(6)); // Remove 'RRULE:' prefix
      
      const localPattern: RecurrencePattern = {
        type: this.mapGoogleFrequencyToLocal(ruleParams.FREQ),
        interval: parseInt(ruleParams.INTERVAL || '1'),
        endDate: ruleParams.UNTIL ? new Date(ruleParams.UNTIL).toISOString().split('T')[0] : undefined,
        count: ruleParams.COUNT ? parseInt(ruleParams.COUNT) : undefined,
        byWeekDay: ruleParams.BYDAY ? this.parseGoogleWeekDays(ruleParams.BYDAY) : undefined,
        byMonthDay: ruleParams.BYMONTHDAY ? ruleParams.BYMONTHDAY.split(',').map(d => parseInt(d)) : undefined,
        byMonth: ruleParams.BYMONTH ? ruleParams.BYMONTH.split(',').map(m => parseInt(m)) : undefined
      };

      return {
        localPattern,
        isSupported: true
      };
    } catch (error) {
      console.error('Error converting Google recurrence to local:', error);
      return {
        isSupported: false,
        conversionNotes: `Conversion error: ${error}`
      };
    }
  }

  /**
   * Convert local recurrence pattern to Google Calendar format
   */
  private convertLocalRecurrenceToGoogle(localPattern?: RecurrencePattern): RecurrenceConversionResult {
    if (!localPattern) {
      return { isSupported: true };
    }

    try {
      let rrule = 'RRULE:';
      
      // Frequency (required)
      rrule += `FREQ=${this.mapLocalFrequencyToGoogle(localPattern.type)}`;
      
      // Interval
      if (localPattern.interval && localPattern.interval > 1) {
        rrule += `;INTERVAL=${localPattern.interval}`;
      }
      
      // End condition
      if (localPattern.endDate) {
        const endDate = new Date(localPattern.endDate);
        rrule += `;UNTIL=${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
      } else if (localPattern.count) {
        rrule += `;COUNT=${localPattern.count}`;
      }
      
      // By day (for weekly patterns)
      if (localPattern.byWeekDay && localPattern.byWeekDay.length > 0) {
        const googleDays = localPattern.byWeekDay.map(day => this.mapLocalDayToGoogle(day));
        rrule += `;BYDAY=${googleDays.join(',')}`;
      }
      
      // By month day (for monthly patterns)
      if (localPattern.byMonthDay && localPattern.byMonthDay.length > 0) {
        rrule += `;BYMONTHDAY=${localPattern.byMonthDay.join(',')}`;
      }
      
      // By month (for yearly patterns)
      if (localPattern.byMonth && localPattern.byMonth.length > 0) {
        rrule += `;BYMONTH=${localPattern.byMonth.join(',')}`;
      }

      return {
        googleRecurrence: [rrule],
        isSupported: true
      };
    } catch (error) {
      console.error('Error converting local recurrence to Google:', error);
      return {
        isSupported: false,
        conversionNotes: `Conversion error: ${error}`
      };
    }
  }

  /**
   * Extract reminder minutes from Google Calendar event
   */
  private extractReminderFromGoogle(
    googleReminders?: GoogleCalendarEventData['reminders'],
    defaultMinutes: number = 15
  ): number {
    if (!googleReminders) {
      return defaultMinutes;
    }

    if (googleReminders.useDefault) {
      return defaultMinutes;
    }

    if (googleReminders.overrides && googleReminders.overrides.length > 0) {
      // Use the first popup reminder
      const popupReminder = googleReminders.overrides.find(r => r.method === 'popup');
      return popupReminder?.minutes || defaultMinutes;
    }

    return defaultMinutes;
  }

  /**
   * Convert local reminder to Google Calendar format
   */
  private convertLocalRemindersToGoogle(
    reminderMinutes?: number,
    defaultMinutes: number = 15
  ): GoogleCalendarEventData['reminders'] {
    if (!reminderMinutes && !defaultMinutes) {
      return { useDefault: true };
    }

    const minutes = reminderMinutes || defaultMinutes;
    
    return {
      useDefault: false,
      overrides: [{
        method: 'popup',
        minutes: minutes
      }]
    };
  }

  /**
   * Color mapping utilities
   */
  private mapGoogleColorToLocal(googleColorId?: string): string | undefined {
    const colorMap: { [key: string]: string } = {
      '1': '#3174ad', // Blue
      '2': '#16a765', // Green  
      '3': '#7627bb', // Purple
      '4': '#b1365f', // Red
      '5': '#ff7537', // Orange
      '6': '#ffad46', // Yellow
      '7': '#42d692', // Turquoise
      '8': '#9fc6e7', // Light Blue
      '9': '#9a9cff', // Light Purple
      '10': '#cab2d6', // Light Pink
      '11': '#ddd1da'  // Light Gray
    };

    return googleColorId ? colorMap[googleColorId] : undefined;
  }

  private mapLocalColorToGoogle(localColor?: string): string | undefined {
    if (!localColor) return undefined;

    const reverseColorMap: { [key: string]: string } = {
      '#3174ad': '1', // Blue
      '#16a765': '2', // Green
      '#7627bb': '3', // Purple
      '#b1365f': '4', // Red
      '#ff7537': '5', // Orange
      '#ffad46': '6', // Yellow
      '#42d692': '7', // Turquoise
      '#9fc6e7': '8', // Light Blue
      '#9a9cff': '9', // Light Purple
      '#cab2d6': '10', // Light Pink
      '#ddd1da': '11'  // Light Gray
    };

    return reverseColorMap[localColor] || '1'; // Default to blue
  }

  /**
   * Frequency mapping utilities
   */
  private mapGoogleFrequencyToLocal(googleFreq: string): RecurrencePattern['type'] {
    const freqMap: { [key: string]: RecurrencePattern['type'] } = {
      'DAILY': 'daily',
      'WEEKLY': 'weekly',
      'MONTHLY': 'monthly',
      'YEARLY': 'yearly'
    };

    return freqMap[googleFreq] || 'daily';
  }

  private mapLocalFrequencyToGoogle(localType: RecurrencePattern['type']): string {
    const freqMap: { [key in RecurrencePattern['type']]: string } = {
      'daily': 'DAILY',
      'weekly': 'WEEKLY',
      'monthly': 'MONTHLY',
      'yearly': 'YEARLY'
    };

    return freqMap[localType];
  }

  /**
   * Day mapping utilities
   */
  private parseGoogleWeekDays(byDay: string): number[] {
    const dayMap: { [key: string]: number } = {
      'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
    };

    return byDay.split(',').map(day => dayMap[day]).filter(d => d !== undefined);
  }

  private mapLocalDayToGoogle(dayIndex: number): string {
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    return dayMap[dayIndex] || 'SU';
  }

  /**
   * Utility methods
   */
  private isGoogleEventAllDay(googleEvent: GoogleCalendarEventData): boolean {
    // Check if the event spans full days
    const start = googleEvent.start.dateTime;
    const end = googleEvent.end.dateTime;
    
    return (start.includes('T00:00:00') && end.includes('T23:59:59')) ||
           (start.includes('T00:00:00') && end.includes('T00:00:00'));
  }

  private parseRRule(rrule: string): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    
    rrule.split(';').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[key] = value;
      }
    });
    
    return params;
  }

  private sanitizeText(text?: string): string {
    if (!text) return '';
    
    // Basic HTML stripping and sanitization
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Validation methods
   */
  validateLocalEvent(event: Partial<LocalEvent>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event.title || event.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!event.start_time) {
      errors.push('Start time is required');
    }

    if (!event.end_time) {
      errors.push('End time is required');
    }

    if (event.start_time && event.end_time) {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      
      if (start >= end) {
        errors.push('End time must be after start time');
      }
    }

    if (!event.timezone) {
      errors.push('Timezone is required');
    } else if (!TimezoneService.isValidTimezone(event.timezone)) {
      errors.push('Invalid timezone');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateGoogleEvent(event: GoogleCalendarEventData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event.summary || event.summary.trim().length === 0) {
      errors.push('Summary is required');
    }

    if (!event.start?.dateTime) {
      errors.push('Start time is required');
    }

    if (!event.end?.dateTime) {
      errors.push('End time is required');
    }

    if (event.start?.dateTime && event.end?.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      
      if (start >= end) {
        errors.push('End time must be after start time');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Batch conversion methods
   */
  async convertMultipleGoogleToLocal(
    userId: string,
    googleEvents: GoogleCalendarEventData[],
    integrationId: string,
    options: EventConversionOptions = {}
  ): Promise<Partial<LocalEvent>[]> {
    const results: Partial<LocalEvent>[] = [];

    for (const googleEvent of googleEvents) {
      try {
        const localEvent = await this.convertGoogleToLocal(userId, googleEvent, integrationId, options);
        results.push(localEvent);
      } catch (error) {
        console.error(`Failed to convert Google event ${googleEvent.id}:`, error);
        // Continue with other events
      }
    }

    return results;
  }

  async convertMultipleLocalToGoogle(
    localEvents: LocalEvent[],
    options: EventConversionOptions = {}
  ): Promise<Omit<GoogleCalendarEventData, 'id' | 'etag' | 'updated'>[]> {
    const results: Omit<GoogleCalendarEventData, 'id' | 'etag' | 'updated'>[] = [];

    for (const localEvent of localEvents) {
      try {
        const googleEvent = await this.convertLocalToGoogle(localEvent, options);
        results.push(googleEvent);
      } catch (error) {
        console.error(`Failed to convert local event ${localEvent.id}:`, error);
        // Continue with other events
      }
    }

    return results;
  }
}