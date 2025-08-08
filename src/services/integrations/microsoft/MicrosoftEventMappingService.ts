/**
 * Microsoft Event Mapping Service - Utilities for converting between local and Microsoft Calendar event formats
 */

import { TimezoneService } from '@/services/timezoneService';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { RecurrenceService, RecurrencePattern } from '@/services/recurrenceService';
import { MicrosoftCalendarEventData } from './MicrosoftCalendarService';

// Microsoft Graph recurrence pattern structure
export interface MicrosoftRecurrencePattern {
  pattern: {
    type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
    interval: number;
    month?: number;
    dayOfMonth?: number;
    daysOfWeek?: string[];
    firstDayOfWeek?: string;
    index?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  };
  range: {
    type: 'endDate' | 'noEnd' | 'numbered';
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
    recurrenceTimeZone?: string;
  };
}

// Microsoft Graph Calendar Event structure
export interface MicrosoftGraphEvent {
  subject: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isAllDay: boolean;
  importance: 'low' | 'normal' | 'high';
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere';
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
  categories?: string[];
  recurrence?: MicrosoftRecurrencePattern;
  onlineMeeting?: {
    joinUrl: string;
    conferenceId?: string;
  };
}

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
  teams_meeting_url?: string;
  teams_meeting_id?: string;
  is_online_meeting?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MicrosoftEventConversionOptions {
  userTimezone?: string;
  preserveTimezone?: boolean;
  includeAttendees?: boolean;
  includeRecurrence?: boolean;
  includeOnlineMeeting?: boolean;
  defaultReminderMinutes?: number;
  syncPrivateEvents?: boolean;
}

export interface MicrosoftRecurrenceConversionResult {
  microsoftRecurrence?: MicrosoftCalendarEventData['recurrence'];
  localPattern?: RecurrencePattern;
  isSupported: boolean;
  conversionNotes?: string;
}

export class MicrosoftEventMappingService {
  private static instance: MicrosoftEventMappingService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MicrosoftEventMappingService {
    if (!MicrosoftEventMappingService.instance) {
      MicrosoftEventMappingService.instance = new MicrosoftEventMappingService();
    }
    return MicrosoftEventMappingService.instance;
  }

  /**
   * Convert Microsoft Calendar event to local event format
   */
  async convertMicrosoftToLocal(
    userId: string,
    microsoftEvent: MicrosoftCalendarEventData,
    integrationId: string,
    options: MicrosoftEventConversionOptions = {}
  ): Promise<Partial<LocalEvent>> {
    // Get user preferences if not provided
    const userPreferences = await UserPreferencesService.getUserPreferences(userId);
    const userTimezone = options.userTimezone || userPreferences.user_timezone;
    const defaultReminder = options.defaultReminderMinutes || userPreferences.default_reminder_minutes;

    // Handle timezone conversion
    const { startTime, endTime, timezone, isAllDay } = this.convertMicrosoftTimes(
      microsoftEvent,
      userTimezone,
      options.preserveTimezone
    );

    // Convert recurrence pattern
    const recurrencePattern = options.includeRecurrence ? 
      this.convertMicrosoftRecurrenceToLocal(microsoftEvent.recurrence) : undefined;

    // Extract reminder minutes
    const reminderMinutes = this.extractReminderFromMicrosoft(microsoftEvent, defaultReminder);

    // Convert categories to color
    const color = this.mapMicrosoftCategoriesToColor(microsoftEvent.categories);

    return {
      user_id: userId,
      title: this.sanitizeText(microsoftEvent.subject) || 'Untitled Event',
      description: this.sanitizeText(microsoftEvent.body?.content) || '',
      start_time: startTime,
      end_time: endTime,
      timezone: timezone,
      location: this.sanitizeText(microsoftEvent.location?.displayName) || '',
      is_all_day: isAllDay,
      reminder_minutes: reminderMinutes,
      color: color,
      external_calendar_id: integrationId,
      external_event_id: microsoftEvent.id,
      sync_status: 'synced',
      external_last_modified: microsoftEvent.lastModifiedDateTime,
      recurrence_pattern: recurrencePattern?.localPattern,
      teams_meeting_url: microsoftEvent.onlineMeeting?.joinUrl,
      teams_meeting_id: microsoftEvent.onlineMeeting?.conferenceId,
      is_online_meeting: !!microsoftEvent.onlineMeeting,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Convert local event to Microsoft Calendar format
   */
  async convertLocalToMicrosoft(
    localEvent: LocalEvent,
    options: MicrosoftEventConversionOptions = {}
  ): Promise<Omit<MicrosoftCalendarEventData, 'id' | 'changeKey' | 'createdDateTime' | 'lastModifiedDateTime' | 'etag'>> {
    // Handle timezone conversion for Microsoft Calendar
    const { startDateTime, endDateTime, timeZone } = this.convertLocalTimes(
      localEvent,
      options.preserveTimezone
    );

    // Convert recurrence pattern
    const microsoftRecurrence = options.includeRecurrence ? 
      this.convertLocalRecurrenceToMicrosoft(localEvent.recurrence_pattern) : undefined;

    // Convert color to categories
    const categories = this.mapLocalColorToMicrosoftCategories(localEvent.color);

    // Build the Microsoft event
    const microsoftEvent: MicrosoftGraphEvent = {
      subject: localEvent.title,
      body: {
        contentType: 'text' as const,
        content: localEvent.description || ''
      },
      start: {
        dateTime: startDateTime,
        timeZone: timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone
      },
      location: localEvent.location ? {
        displayName: localEvent.location
      } : undefined,
      isAllDay: localEvent.is_all_day,
      importance: 'normal' as const,
      showAs: 'busy' as const,
      sensitivity: options.syncPrivateEvents ? 'normal' as const : 'private' as const,
      categories: categories,
      recurrence: microsoftRecurrence?.microsoftRecurrence
    };

    // Add Teams meeting information if available
    if (options.includeOnlineMeeting && localEvent.teams_meeting_url) {
      microsoftEvent.onlineMeeting = {
        joinUrl: localEvent.teams_meeting_url,
        conferenceId: localEvent.teams_meeting_id
      };
    }

    return microsoftEvent;
  }

  /**
   * Convert Microsoft Calendar time format to local format
   */
  private convertMicrosoftTimes(
    microsoftEvent: MicrosoftCalendarEventData,
    userTimezone: string,
    preserveTimezone?: boolean
  ): { startTime: string; endTime: string; timezone: string; isAllDay: boolean } {
    const microsoftStart = microsoftEvent.start;
    const microsoftEnd = microsoftEvent.end;

    // Detect all-day events
    const isAllDay = microsoftEvent.isAllDay || false;

    if (isAllDay) {
      // For all-day events, use the date as-is but set to user timezone
      const startDate = microsoftStart.dateTime.split('T')[0];
      const endDate = microsoftEnd.dateTime.split('T')[0];
      
      return {
        startTime: `${startDate}T00:00:00`,
        endTime: `${endDate}T23:59:59`,
        timezone: userTimezone,
        isAllDay: true
      };
    }

    // For timed events, convert timezone if needed
    const targetTimezone = preserveTimezone ? microsoftStart.timeZone : userTimezone;
    
    let startTime: string;
    let endTime: string;

    if (microsoftStart.timeZone === targetTimezone) {
      // No conversion needed
      startTime = microsoftStart.dateTime;
      endTime = microsoftEnd.dateTime;
    } else {
      // Convert timezone
      const startUTC = TimezoneService.toUTC(microsoftStart.dateTime, microsoftStart.timeZone);
      const endUTC = TimezoneService.toUTC(microsoftEnd.dateTime, microsoftEnd.timeZone);
      
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
   * Convert local event times to Microsoft Calendar format
   */
  private convertLocalTimes(
    localEvent: LocalEvent,
    preserveTimezone?: boolean
  ): { startDateTime: string; endDateTime: string; timeZone: string } {
    if (localEvent.is_all_day) {
      // For all-day events, convert to proper Microsoft format
      const startDate = localEvent.start_time.split('T')[0];
      const endDate = localEvent.end_time.split('T')[0];
      
      return {
        startDateTime: `${startDate}T00:00:00.0000000`,
        endDateTime: `${endDate}T23:59:59.9999999`,
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

    // Ensure proper ISO format for Microsoft Graph
    if (!startDateTime.includes('T')) {
      startDateTime += 'T00:00:00.0000000';
    } else if (!startDateTime.includes('.')) {
      startDateTime += '.0000000';
    }
    
    if (!endDateTime.includes('T')) {
      endDateTime += 'T23:59:59.9999999';
    } else if (!endDateTime.includes('.')) {
      endDateTime += '.9999999';
    }

    return {
      startDateTime,
      endDateTime,
      timeZone: timezone
    };
  }

  /**
   * Convert Microsoft recurrence rules to local format
   */
  private convertMicrosoftRecurrenceToLocal(microsoftRecurrence?: MicrosoftCalendarEventData['recurrence']): MicrosoftRecurrenceConversionResult {
    if (!microsoftRecurrence) {
      return { isSupported: true };
    }

    try {
      const pattern = microsoftRecurrence.pattern;
      const range = microsoftRecurrence.range;

      const localPattern: RecurrencePattern = {
        type: this.mapMicrosoftFrequencyToLocal(pattern.type),
        interval: pattern.interval,
        endDate: range.endDate ? new Date(range.endDate).toISOString().split('T')[0] : undefined,
        count: range.numberOfOccurrences,
        byWeekDay: pattern.daysOfWeek ? this.parseMicrosoftWeekDays(pattern.daysOfWeek) : undefined,
        byMonthDay: pattern.dayOfMonth ? [pattern.dayOfMonth] : undefined,
        byMonth: pattern.month ? [pattern.month] : undefined
      };

      return {
        localPattern,
        isSupported: true
      };
    } catch (error) {
      console.error('Error converting Microsoft recurrence to local:', error);
      return {
        isSupported: false,
        conversionNotes: `Conversion error: ${error}`
      };
    }
  }

  /**
   * Convert local recurrence pattern to Microsoft Calendar format
   */
  private convertLocalRecurrenceToMicrosoft(localPattern?: RecurrencePattern): MicrosoftRecurrenceConversionResult {
    if (!localPattern) {
      return { isSupported: true };
    }

    try {
      const microsoftRecurrence: MicrosoftCalendarEventData['recurrence'] = {
        pattern: {
          type: this.mapLocalFrequencyToMicrosoft(localPattern.type),
          interval: localPattern.interval,
          month: localPattern.byMonth ? localPattern.byMonth[0] : undefined,
          dayOfMonth: localPattern.byMonthDay ? localPattern.byMonthDay[0] : undefined,
          daysOfWeek: localPattern.byWeekDay ? localPattern.byWeekDay.map(day => this.mapLocalDayToMicrosoft(day)) : undefined,
          firstDayOfWeek: 'monday'
        },
        range: {
          type: localPattern.endDate ? 'endDate' : (localPattern.count ? 'numbered' : 'noEnd'),
          startDate: new Date().toISOString().split('T')[0], // Current date as default
          endDate: localPattern.endDate,
          numberOfOccurrences: localPattern.count
        }
      };

      return {
        microsoftRecurrence,
        isSupported: true
      };
    } catch (error) {
      console.error('Error converting local recurrence to Microsoft:', error);
      return {
        isSupported: false,
        conversionNotes: `Conversion error: ${error}`
      };
    }
  }

  /**
   * Extract reminder minutes from Microsoft Calendar event
   */
  private extractReminderFromMicrosoft(
    microsoftEvent: MicrosoftCalendarEventData,
    defaultMinutes: number = 15
  ): number {
    // Microsoft Calendar reminders are typically managed at the calendar level
    // or through specific reminder properties. For now, return default.
    return defaultMinutes;
  }

  /**
   * Category and color mapping utilities
   */
  private mapMicrosoftCategoriesToColor(categories?: string[]): string | undefined {
    if (!categories || categories.length === 0) return undefined;

    // Map common Microsoft category names to colors
    const categoryColorMap: { [key: string]: string } = {
      'Red category': '#d32f2f',
      'Orange category': '#f57c00',
      'Yellow category': '#fbc02d',
      'Green category': '#388e3c',
      'Blue category': '#1976d2',
      'Purple category': '#7b1fa2',
      'Important': '#d32f2f',
      'Business': '#1976d2',
      'Personal': '#388e3c',
      'Vacation': '#fbc02d',
      'Must attend': '#d32f2f'
    };

    // Return color for first recognized category
    for (const category of categories) {
      if (categoryColorMap[category]) {
        return categoryColorMap[category];
      }
    }

    // Default color for unknown categories
    return '#1976d2';
  }

  private mapLocalColorToMicrosoftCategories(localColor?: string): string[] | undefined {
    if (!localColor) return undefined;

    // Map colors back to Microsoft categories
    const colorCategoryMap: { [key: string]: string } = {
      '#d32f2f': 'Red category',
      '#f57c00': 'Orange category',
      '#fbc02d': 'Yellow category',
      '#388e3c': 'Green category',
      '#1976d2': 'Blue category',
      '#7b1fa2': 'Purple category'
    };

    const category = colorCategoryMap[localColor];
    return category ? [category] : undefined;
  }

  /**
   * Frequency mapping utilities
   */
  private mapMicrosoftFrequencyToLocal(microsoftType: string): RecurrencePattern['type'] {
    const freqMap: { [key: string]: RecurrencePattern['type'] } = {
      'daily': 'daily',
      'weekly': 'weekly',
      'absoluteMonthly': 'monthly',
      'relativeMonthly': 'monthly',
      'absoluteYearly': 'yearly',
      'relativeYearly': 'yearly'
    };

    return freqMap[microsoftType] || 'daily';
  }

  private mapLocalFrequencyToMicrosoft(localType: RecurrencePattern['type']): string {
    const freqMap: { [key in RecurrencePattern['type']]: string } = {
      'daily': 'daily',
      'weekly': 'weekly',
      'monthly': 'absoluteMonthly',
      'yearly': 'absoluteYearly'
    };

    return freqMap[localType];
  }

  /**
   * Day mapping utilities
   */
  private parseMicrosoftWeekDays(daysOfWeek: string[]): number[] {
    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    return daysOfWeek.map(day => dayMap[day.toLowerCase()]).filter(d => d !== undefined);
  }

  private mapLocalDayToMicrosoft(dayIndex: number): string {
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayMap[dayIndex] || 'sunday';
  }

  /**
   * Utility methods
   */
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

  validateMicrosoftEvent(event: MicrosoftCalendarEventData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event.subject || event.subject.trim().length === 0) {
      errors.push('Subject is required');
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
  async convertMultipleMicrosoftToLocal(
    userId: string,
    microsoftEvents: MicrosoftCalendarEventData[],
    integrationId: string,
    options: MicrosoftEventConversionOptions = {}
  ): Promise<Partial<LocalEvent>[]> {
    const results: Partial<LocalEvent>[] = [];

    for (const microsoftEvent of microsoftEvents) {
      try {
        const localEvent = await this.convertMicrosoftToLocal(userId, microsoftEvent, integrationId, options);
        results.push(localEvent);
      } catch (error) {
        console.error(`Failed to convert Microsoft event ${microsoftEvent.id}:`, error);
        // Continue with other events
      }
    }

    return results;
  }

  async convertMultipleLocalToMicrosoft(
    localEvents: LocalEvent[],
    options: MicrosoftEventConversionOptions = {}
  ): Promise<Omit<MicrosoftCalendarEventData, 'id' | 'changeKey' | 'createdDateTime' | 'lastModifiedDateTime' | 'etag'>[]> {
    const results: Omit<MicrosoftCalendarEventData, 'id' | 'changeKey' | 'createdDateTime' | 'lastModifiedDateTime' | 'etag'>[] = [];

    for (const localEvent of localEvents) {
      try {
        const microsoftEvent = await this.convertLocalToMicrosoft(localEvent, options);
        results.push(microsoftEvent);
      } catch (error) {
        console.error(`Failed to convert local event ${localEvent.id}:`, error);
        // Continue with other events
      }
    }

    return results;
  }

  /**
   * Microsoft-specific utility methods
   */
  
  /**
   * Extract attendee information from Microsoft event
   */
  extractAttendeeInfo(microsoftEvent: MicrosoftCalendarEventData): {
    organizer?: { name?: string; email: string };
    requiredAttendees: { name?: string; email: string; status: string }[];
    optionalAttendees: { name?: string; email: string; status: string }[];
  } {
    const result = {
      organizer: undefined as { name?: string; email: string } | undefined,
      requiredAttendees: [] as { name?: string; email: string; status: string }[],
      optionalAttendees: [] as { name?: string; email: string; status: string }[]
    };

    if (microsoftEvent.attendees) {
      for (const attendee of microsoftEvent.attendees) {
        const attendeeInfo = {
          name: attendee.emailAddress.name,
          email: attendee.emailAddress.address,
          status: attendee.status.response
        };

        if (attendee.status.response === 'organizer') {
          result.organizer = attendeeInfo;
        } else if (attendee.type === 'required') {
          result.requiredAttendees.push(attendeeInfo);
        } else if (attendee.type === 'optional') {
          result.optionalAttendees.push(attendeeInfo);
        }
      }
    }

    return result;
  }

  /**
   * Check if event has Teams meeting
   */
  hasTeamsMeeting(microsoftEvent: MicrosoftCalendarEventData): boolean {
    return !!(microsoftEvent.onlineMeeting?.joinUrl);
  }

  /**
   * Extract Teams meeting information
   */
  extractTeamsMeetingInfo(microsoftEvent: MicrosoftCalendarEventData): {
    joinUrl?: string;
    conferenceId?: string;
    tollNumber?: string;
  } | null {
    if (!microsoftEvent.onlineMeeting) return null;

    return {
      joinUrl: microsoftEvent.onlineMeeting.joinUrl,
      conferenceId: microsoftEvent.onlineMeeting.conferenceId,
      tollNumber: microsoftEvent.onlineMeeting.tollNumber
    };
  }

  /**
   * Check if event is private/confidential
   */
  isPrivateEvent(microsoftEvent: MicrosoftCalendarEventData): boolean {
    return microsoftEvent.sensitivity === 'private' || microsoftEvent.sensitivity === 'confidential';
  }
}