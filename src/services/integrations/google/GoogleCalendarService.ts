/**
 * Google Calendar API Service - Handles all Google Calendar operations
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GoogleAuthService, CalendarIntegration } from './GoogleAuthService';
import { TimezoneService } from '@/services/timezoneService';

// Google Calendar API Types
export type GoogleCalendarAccessRole = 'freeBusyReader' | 'reader' | 'writer' | 'owner';
export type GoogleReminderMethod = 'email' | 'popup' | 'sms';
export type GoogleAttendeeResponseStatus = 'needsAction' | 'declined' | 'tentative' | 'accepted';
export type GoogleEventVisibility = 'default' | 'public' | 'private' | 'confidential';
export type GoogleEventStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface GoogleCalendarEventData {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  status?: 'confirmed' | 'tentative' | 'cancelled';
  colorId?: string;
  etag?: string;
  updated?: string;
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  defaultReminders?: Array<{
    method: 'email' | 'popup';
    minutes: number;
  }>;
  primary?: boolean;
  selected?: boolean;
}

export interface CalendarListResponse {
  calendars: GoogleCalendarInfo[];
  nextPageToken?: string;
}

export interface EventsListResponse {
  events: GoogleCalendarEventData[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface GoogleCalendarSyncOptions {
  timeMin?: string; // RFC3339 timestamp
  timeMax?: string; // RFC3339 timestamp
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
  singleEvents?: boolean;
  syncToken?: string;
  pageToken?: string;
  showDeleted?: boolean;
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private authService: GoogleAuthService;

  private constructor() {
    this.authService = GoogleAuthService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Create authenticated OAuth2 client for a user
   */
  private async createAuthenticatedClient(integration: CalendarIntegration): Promise<OAuth2Client> {
    const accessToken = await this.authService.getValidAccessToken(integration);
    
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    return oauth2Client;
  }

  /**
   * Create Google Calendar API client
   */
  private async createCalendarClient(integration: CalendarIntegration): Promise<calendar_v3.Calendar> {
    const auth = await this.createAuthenticatedClient(integration);
    return google.calendar({ version: 'v3', auth });
  }

  /**
   * Get user's calendar list
   */
  async getCalendarList(integration: CalendarIntegration): Promise<CalendarListResponse> {
    try {
      const calendar = await this.createCalendarClient(integration);
      
      const response = await calendar.calendarList.list({
        minAccessRole: 'reader',
        showDeleted: false,
        showHidden: false
      });

      const calendars: GoogleCalendarInfo[] = (response.data.items || []).map(cal => ({
        id: cal.id!,
        summary: cal.summary!,
        description: cal.description || undefined,
        location: cal.location || undefined,
        timeZone: cal.timeZone!,
        backgroundColor: cal.backgroundColor || undefined,
        foregroundColor: cal.foregroundColor || undefined,
        accessRole: cal.accessRole as GoogleCalendarAccessRole,
        defaultReminders: cal.defaultReminders?.map(reminder => ({
          method: reminder.method as GoogleReminderMethod,
          minutes: reminder.minutes!
        })),
        primary: cal.primary || false,
        selected: cal.selected || false
      }));

      return {
        calendars,
        nextPageToken: response.data.nextPageToken || undefined
      };
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw new Error('Failed to fetch calendar list from Google Calendar');
    }
  }

  /**
   * Get calendar by ID
   */
  async getCalendar(integration: CalendarIntegration, calendarId: string): Promise<GoogleCalendarInfo> {
    try {
      const calendar = await this.createCalendarClient(integration);
      
      const response = await calendar.calendars.get({
        calendarId: calendarId
      });

      const cal = response.data;
      return {
        id: cal.id!,
        summary: cal.summary!,
        description: cal.description || undefined,
        location: cal.location || undefined,
        timeZone: cal.timeZone!
      };
    } catch (error) {
      console.error('Error fetching calendar:', error);
      throw new Error('Failed to fetch calendar from Google Calendar');
    }
  }

  /**
   * List events from a calendar
   */
  async listEvents(
    integration: CalendarIntegration,
    calendarId: string,
    options: GoogleCalendarSyncOptions = {}
  ): Promise<EventsListResponse> {
    try {
      const calendar = await this.createCalendarClient(integration);
      
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        maxResults: options.maxResults || 250,
        orderBy: options.orderBy || 'startTime',
        singleEvents: options.singleEvents !== false, // Default to true
        syncToken: options.syncToken,
        pageToken: options.pageToken,
        showDeleted: options.showDeleted || false
      });

      const events: GoogleCalendarEventData[] = (response.data.items || []).map(event => ({
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || event.start?.date + 'T00:00:00',
          timeZone: event.start?.timeZone || 'UTC'
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date + 'T23:59:59',
          timeZone: event.end?.timeZone || 'UTC'
        },
        location: event.location || undefined,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email!,
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus as GoogleAttendeeResponseStatus
        })),
        reminders: event.reminders ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides?.map(override => ({
            method: override.method as GoogleReminderMethod,
            minutes: override.minutes!
          }))
        } : undefined,
        recurrence: event.recurrence || undefined,
        visibility: event.visibility as GoogleEventVisibility,
        status: event.status as GoogleEventStatus,
        colorId: event.colorId || undefined,
        etag: event.etag || undefined,
        updated: event.updated || undefined
      }));

      return {
        events,
        nextPageToken: response.data.nextPageToken || undefined,
        nextSyncToken: response.data.nextSyncToken || undefined
      };
    } catch (error) {
      console.error('Error listing events:', error);
      throw new Error('Failed to list events from Google Calendar');
    }
  }

  /**
   * Get a specific event
   */
  async getEvent(
    integration: CalendarIntegration,
    calendarId: string,
    eventId: string
  ): Promise<GoogleCalendarEventData> {
    try {
      const calendar = await this.createCalendarClient(integration);
      
      const response = await calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
      });

      const event = response.data;
      return {
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || event.start?.date + 'T00:00:00',
          timeZone: event.start?.timeZone || 'UTC'
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date + 'T23:59:59',
          timeZone: event.end?.timeZone || 'UTC'
        },
        location: event.location || undefined,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email!,
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus as GoogleAttendeeResponseStatus
        })),
        reminders: event.reminders ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides?.map(override => ({
            method: override.method as GoogleReminderMethod,
            minutes: override.minutes!
          }))
        } : undefined,
        recurrence: event.recurrence || undefined,
        visibility: event.visibility as GoogleEventVisibility,
        status: event.status as GoogleEventStatus,
        colorId: event.colorId || undefined,
        etag: event.etag || undefined,
        updated: event.updated || undefined
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      throw new Error('Failed to fetch event from Google Calendar');
    }
  }

  /**
   * Create a new event
   */
  async createEvent(
    integration: CalendarIntegration,
    calendarId: string,
    eventData: Omit<GoogleCalendarEventData, 'id' | 'etag' | 'updated'>
  ): Promise<GoogleCalendarEventData> {
    try {
      const calendar = await this.createCalendarClient(integration);
      
      const resource: calendar_v3.Schema$Event = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.start.dateTime,
          timeZone: eventData.start.timeZone
        },
        end: {
          dateTime: eventData.end.dateTime,
          timeZone: eventData.end.timeZone
        },
        location: eventData.location,
        attendees: eventData.attendees?.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus
        })),
        reminders: eventData.reminders ? {
          useDefault: eventData.reminders.useDefault,
          overrides: eventData.reminders.overrides?.map(override => ({
            method: override.method,
            minutes: override.minutes
          }))
        } : undefined,
        recurrence: eventData.recurrence,
        visibility: eventData.visibility,
        status: eventData.status,
        colorId: eventData.colorId
      };

      const response = await calendar.events.insert({
        calendarId: calendarId,
        resource: resource,
        sendUpdates: 'all' // Send notifications to attendees
      });

      const event = response.data;
      return {
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || event.start?.date + 'T00:00:00',
          timeZone: event.start?.timeZone || 'UTC'
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date + 'T23:59:59',
          timeZone: event.end?.timeZone || 'UTC'
        },
        location: event.location || undefined,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email!,
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus as GoogleAttendeeResponseStatus
        })),
        reminders: event.reminders ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides?.map(override => ({
            method: override.method as GoogleReminderMethod,
            minutes: override.minutes!
          }))
        } : undefined,
        recurrence: event.recurrence || undefined,
        visibility: event.visibility as GoogleEventVisibility,
        status: event.status as GoogleEventStatus,
        colorId: event.colorId || undefined,
        etag: event.etag || undefined,
        updated: event.updated || undefined
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event in Google Calendar');
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    integration: CalendarIntegration,
    calendarId: string,
    eventId: string,
    eventData: Partial<GoogleCalendarEventData>
  ): Promise<GoogleCalendarEventData> {
    try {
      const calendar = await this.createCalendarClient(integration);
      
      const resource: calendar_v3.Schema$Event = {};
      
      if (eventData.summary !== undefined) resource.summary = eventData.summary;
      if (eventData.description !== undefined) resource.description = eventData.description;
      if (eventData.start) {
        resource.start = {
          dateTime: eventData.start.dateTime,
          timeZone: eventData.start.timeZone
        };
      }
      if (eventData.end) {
        resource.end = {
          dateTime: eventData.end.dateTime,
          timeZone: eventData.end.timeZone
        };
      }
      if (eventData.location !== undefined) resource.location = eventData.location;
      if (eventData.attendees) {
        resource.attendees = eventData.attendees.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus
        }));
      }
      if (eventData.reminders) {
        resource.reminders = {
          useDefault: eventData.reminders.useDefault,
          overrides: eventData.reminders.overrides?.map(override => ({
            method: override.method,
            minutes: override.minutes
          }))
        };
      }
      if (eventData.recurrence) resource.recurrence = eventData.recurrence;
      if (eventData.visibility) resource.visibility = eventData.visibility;
      if (eventData.status) resource.status = eventData.status;
      if (eventData.colorId) resource.colorId = eventData.colorId;

      const response = await calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: resource,
        sendUpdates: 'all' // Send notifications to attendees
      });

      const event = response.data;
      return {
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || event.start?.date + 'T00:00:00',
          timeZone: event.start?.timeZone || 'UTC'
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date + 'T23:59:59',
          timeZone: event.end?.timeZone || 'UTC'
        },
        location: event.location || undefined,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email!,
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus as GoogleAttendeeResponseStatus
        })),
        reminders: event.reminders ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides?.map(override => ({
            method: override.method as GoogleReminderMethod,
            minutes: override.minutes!
          }))
        } : undefined,
        recurrence: event.recurrence || undefined,
        visibility: event.visibility as GoogleEventVisibility,
        status: event.status as GoogleEventStatus,
        colorId: event.colorId || undefined,
        etag: event.etag || undefined,
        updated: event.updated || undefined
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event in Google Calendar');
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    integration: CalendarIntegration,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    try {
      const calendar = await this.createCalendarClient(integration);
      
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
        sendUpdates: 'all' // Send notifications to attendees
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event from Google Calendar');
    }
  }

  /**
   * Get events within a date range for sync
   */
  async getEventsForSync(
    integration: CalendarIntegration,
    calendarId: string,
    startDate: Date,
    endDate: Date,
    syncToken?: string
  ): Promise<EventsListResponse> {
    const options: GoogleCalendarSyncOptions = {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'updated',
      showDeleted: true, // Important for sync to know about deleted events
      maxResults: 250
    };

    if (syncToken) {
      options.syncToken = syncToken;
      // Remove timeMin/timeMax when using syncToken as they're mutually exclusive
      delete options.timeMin;
      delete options.timeMax;
    }

    return this.listEvents(integration, calendarId, options);
  }

  /**
   * Check if a calendar is writable
   */
  async isCalendarWritable(integration: CalendarIntegration, calendarId: string): Promise<boolean> {
    try {
      const calendars = await this.getCalendarList(integration);
      const calendar = calendars.calendars.find(cal => cal.id === calendarId);
      
      return calendar?.accessRole === 'writer' || calendar?.accessRole === 'owner';
    } catch (error) {
      console.error('Error checking calendar permissions:', error);
      return false;
    }
  }

  /**
   * Batch get multiple events
   */
  async batchGetEvents(
    integration: CalendarIntegration,
    calendarId: string,
    eventIds: string[]
  ): Promise<GoogleCalendarEventData[]> {
    try {
      const events: GoogleCalendarEventData[] = [];
      
      // Google Calendar API doesn't have native batch get, so we'll fetch individually
      // In a production system, you might want to implement proper batching
      for (const eventId of eventIds) {
        try {
          const event = await this.getEvent(integration, calendarId, eventId);
          events.push(event);
        } catch (error) {
          console.warn(`Failed to fetch event ${eventId}:`, error);
          // Continue with other events even if one fails
        }
      }
      
      return events;
    } catch (error) {
      console.error('Error batch fetching events:', error);
      throw new Error('Failed to batch fetch events from Google Calendar');
    }
  }

  /**
   * Test calendar API connection
   */
  async testConnection(integration: CalendarIntegration): Promise<boolean> {
    try {
      await this.getCalendarList(integration);
      return true;
    } catch (error) {
      console.error('Calendar connection test failed:', error);
      return false;
    }
  }

  /**
   * Get rate limit info (approximate)
   */
  getRateLimitInfo(): { requestsPerSecond: number; requestsPerDay: number } {
    return {
      requestsPerSecond: 10, // Google Calendar API allows ~10 requests per second
      requestsPerDay: 1000000 // 1M requests per day for free tier
    };
  }
}