/**
 * Microsoft Graph Calendar API Service - Handles all Microsoft Calendar operations
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { Event, Calendar, User, MailboxSettings } from '@microsoft/microsoft-graph-types';
import { MicrosoftAuthService, MicrosoftCalendarIntegration } from './MicrosoftAuthService';
import { TimezoneService } from '@/services/timezoneService';

export interface MicrosoftCalendarEventData {
  id?: string;
  subject: string;
  body?: {
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
    address?: any;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional' | 'resource';
    status: {
      response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
      time?: string;
    };
  }>;
  recurrence?: {
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
    };
  };
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  importance?: 'low' | 'normal' | 'high';
  isAllDay?: boolean;
  isCancelled?: boolean;
  isOrganizer?: boolean;
  responseRequested?: boolean;
  seriesMasterId?: string;
  type?: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  categories?: string[];
  onlineMeeting?: {
    joinUrl: string;
    conferenceId?: string;
    tollNumber?: string;
  };
  changeKey?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  etag?: string;
}

export interface MicrosoftCalendarInfo {
  id: string;
  name: string;
  description?: string;
  color?: string;
  hexColor?: string;
  isDefaultCalendar?: boolean;
  canShare?: boolean;
  canViewPrivateItems?: boolean;
  canEdit?: boolean;
  owner?: {
    name?: string;
    address?: string;
  };
  isRemovable?: boolean;
  changeKey?: string;
}

export interface CalendarListResponse {
  calendars: MicrosoftCalendarInfo[];
  nextLink?: string;
}

export interface EventsListResponse {
  events: MicrosoftCalendarEventData[];
  nextLink?: string;
  deltaLink?: string;
}

export interface MicrosoftCalendarSyncOptions {
  startTime?: string; // ISO 8601 format
  endTime?: string; // ISO 8601 format
  top?: number; // Max number of results
  orderBy?: string;
  filter?: string;
  deltaToken?: string;
  skipToken?: string;
}

export class MicrosoftCalendarService {
  private static instance: MicrosoftCalendarService;
  private authService: MicrosoftAuthService;

  private constructor() {
    this.authService = MicrosoftAuthService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MicrosoftCalendarService {
    if (!MicrosoftCalendarService.instance) {
      MicrosoftCalendarService.instance = new MicrosoftCalendarService();
    }
    return MicrosoftCalendarService.instance;
  }

  /**
   * Create authenticated Microsoft Graph client
   */
  private async createGraphClient(integration: MicrosoftCalendarIntegration): Promise<Client> {
    const accessToken = await this.authService.getValidAccessToken(integration);
    
    return Client.init({
      authProvider: async (done) => {
        done(null, accessToken);
      }
    });
  }

  /**
   * Get user's calendar list
   */
  async getCalendarList(integration: MicrosoftCalendarIntegration): Promise<CalendarListResponse> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      const response = await graphClient
        .api('/me/calendars')
        .select('id,name,description,color,hexColor,isDefaultCalendar,canShare,canViewPrivateItems,canEdit,owner,isRemovable,changeKey')
        .get();

      const calendars: MicrosoftCalendarInfo[] = response.value.map((cal: Calendar) => ({
        id: cal.id!,
        name: cal.name!,
        description: cal.description || undefined,
        color: cal.color || undefined,
        hexColor: cal.hexColor || undefined,
        isDefaultCalendar: cal.isDefaultCalendar || false,
        canShare: cal.canShare || false,
        canViewPrivateItems: cal.canViewPrivateItems || false,
        canEdit: cal.canEdit || false,
        owner: cal.owner ? {
          name: cal.owner.name,
          address: cal.owner.address
        } : undefined,
        isRemovable: cal.isRemovable || false,
        changeKey: cal.changeKey || undefined
      }));

      return {
        calendars,
        nextLink: response['@odata.nextLink']
      };
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw new Error('Failed to fetch calendar list from Microsoft Calendar');
    }
  }

  /**
   * Get calendar by ID
   */
  async getCalendar(integration: MicrosoftCalendarIntegration, calendarId: string): Promise<MicrosoftCalendarInfo> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      const calendar: Calendar = await graphClient
        .api(`/me/calendars/${calendarId}`)
        .select('id,name,description,color,hexColor,isDefaultCalendar,canShare,canViewPrivateItems,canEdit,owner,isRemovable,changeKey')
        .get();

      return {
        id: calendar.id!,
        name: calendar.name!,
        description: calendar.description || undefined,
        color: calendar.color || undefined,
        hexColor: calendar.hexColor || undefined,
        isDefaultCalendar: calendar.isDefaultCalendar || false,
        canShare: calendar.canShare || false,
        canViewPrivateItems: calendar.canViewPrivateItems || false,
        canEdit: calendar.canEdit || false,
        owner: calendar.owner ? {
          name: calendar.owner.name,
          address: calendar.owner.address
        } : undefined,
        isRemovable: calendar.isRemovable || false,
        changeKey: calendar.changeKey || undefined
      };
    } catch (error) {
      console.error('Error fetching calendar:', error);
      throw new Error('Failed to fetch calendar from Microsoft Calendar');
    }
  }

  /**
   * List events from a calendar
   */
  async listEvents(
    integration: MicrosoftCalendarIntegration,
    calendarId: string = 'calendar',
    options: MicrosoftCalendarSyncOptions = {}
  ): Promise<EventsListResponse> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      let request = graphClient.api(`/me/calendars/${calendarId}/events`);

      // Apply filters and options
      if (options.startTime && options.endTime) {
        request = request.filter(
          `start/dateTime ge '${options.startTime}' and end/dateTime le '${options.endTime}'`
        );
      } else if (options.filter) {
        request = request.filter(options.filter);
      }

      if (options.orderBy) {
        request = request.orderby(options.orderBy);
      } else {
        request = request.orderby('start/dateTime');
      }

      if (options.top) {
        request = request.top(options.top);
      } else {
        request = request.top(250);
      }

      if (options.skipToken) {
        request = request.skipToken(options.skipToken);
      }

      // Select specific fields
      request = request.select(
        'id,subject,body,start,end,location,attendees,recurrence,sensitivity,showAs,importance,isAllDay,isCancelled,isOrganizer,responseRequested,seriesMasterId,type,categories,onlineMeeting,changeKey,createdDateTime,lastModifiedDateTime'
      );

      const response = await request.get();

      const events: MicrosoftCalendarEventData[] = response.value.map((event: Event) => ({
        id: event.id!,
        subject: event.subject!,
        body: event.body ? {
          contentType: event.body.contentType as 'text' | 'html',
          content: event.body.content || ''
        } : undefined,
        start: {
          dateTime: event.start!.dateTime!,
          timeZone: event.start!.timeZone!
        },
        end: {
          dateTime: event.end!.dateTime!,
          timeZone: event.end!.timeZone!
        },
        location: event.location ? {
          displayName: event.location.displayName || '',
          address: event.location.address
        } : undefined,
        attendees: event.attendees?.map(attendee => ({
          emailAddress: {
            address: attendee.emailAddress!.address!,
            name: attendee.emailAddress!.name
          },
          type: attendee.type as 'required' | 'optional' | 'resource',
          status: {
            response: attendee.status!.response as any,
            time: attendee.status!.time
          }
        })),
        recurrence: event.recurrence ? {
          pattern: {
            type: event.recurrence.pattern!.type as any,
            interval: event.recurrence.pattern!.interval!,
            month: event.recurrence.pattern!.month,
            dayOfMonth: event.recurrence.pattern!.dayOfMonth,
            daysOfWeek: event.recurrence.pattern!.daysOfWeek,
            firstDayOfWeek: event.recurrence.pattern!.firstDayOfWeek,
            index: event.recurrence.pattern!.index as any
          },
          range: {
            type: event.recurrence.range!.type as any,
            startDate: event.recurrence.range!.startDate!,
            endDate: event.recurrence.range!.endDate,
            numberOfOccurrences: event.recurrence.range!.numberOfOccurrences
          }
        } : undefined,
        sensitivity: event.sensitivity as any,
        showAs: event.showAs as any,
        importance: event.importance as any,
        isAllDay: event.isAllDay || false,
        isCancelled: event.isCancelled || false,
        isOrganizer: event.isOrganizer || false,
        responseRequested: event.responseRequested || false,
        seriesMasterId: event.seriesMasterId,
        type: event.type as any,
        categories: event.categories,
        onlineMeeting: event.onlineMeeting ? {
          joinUrl: event.onlineMeeting.joinUrl!,
          conferenceId: event.onlineMeeting.conferenceId,
          tollNumber: event.onlineMeeting.tollNumber
        } : undefined,
        changeKey: event.changeKey,
        createdDateTime: event.createdDateTime,
        lastModifiedDateTime: event.lastModifiedDateTime
      }));

      return {
        events,
        nextLink: response['@odata.nextLink'],
        deltaLink: response['@odata.deltaLink']
      };
    } catch (error) {
      console.error('Error listing events:', error);
      throw new Error('Failed to list events from Microsoft Calendar');
    }
  }

  /**
   * Get a specific event
   */
  async getEvent(
    integration: MicrosoftCalendarIntegration,
    calendarId: string,
    eventId: string
  ): Promise<MicrosoftCalendarEventData> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      const event: Event = await graphClient
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .select('id,subject,body,start,end,location,attendees,recurrence,sensitivity,showAs,importance,isAllDay,isCancelled,isOrganizer,responseRequested,seriesMasterId,type,categories,onlineMeeting,changeKey,createdDateTime,lastModifiedDateTime')
        .get();

      return {
        id: event.id!,
        subject: event.subject!,
        body: event.body ? {
          contentType: event.body.contentType as 'text' | 'html',
          content: event.body.content || ''
        } : undefined,
        start: {
          dateTime: event.start!.dateTime!,
          timeZone: event.start!.timeZone!
        },
        end: {
          dateTime: event.end!.dateTime!,
          timeZone: event.end!.timeZone!
        },
        location: event.location ? {
          displayName: event.location.displayName || '',
          address: event.location.address
        } : undefined,
        attendees: event.attendees?.map(attendee => ({
          emailAddress: {
            address: attendee.emailAddress!.address!,
            name: attendee.emailAddress!.name
          },
          type: attendee.type as 'required' | 'optional' | 'resource',
          status: {
            response: attendee.status!.response as any,
            time: attendee.status!.time
          }
        })),
        recurrence: event.recurrence ? {
          pattern: {
            type: event.recurrence.pattern!.type as any,
            interval: event.recurrence.pattern!.interval!,
            month: event.recurrence.pattern!.month,
            dayOfMonth: event.recurrence.pattern!.dayOfMonth,
            daysOfWeek: event.recurrence.pattern!.daysOfWeek,
            firstDayOfWeek: event.recurrence.pattern!.firstDayOfWeek,
            index: event.recurrence.pattern!.index as any
          },
          range: {
            type: event.recurrence.range!.type as any,
            startDate: event.recurrence.range!.startDate!,
            endDate: event.recurrence.range!.endDate,
            numberOfOccurrences: event.recurrence.range!.numberOfOccurrences
          }
        } : undefined,
        sensitivity: event.sensitivity as any,
        showAs: event.showAs as any,
        importance: event.importance as any,
        isAllDay: event.isAllDay || false,
        isCancelled: event.isCancelled || false,
        isOrganizer: event.isOrganizer || false,
        responseRequested: event.responseRequested || false,
        seriesMasterId: event.seriesMasterId,
        type: event.type as any,
        categories: event.categories,
        onlineMeeting: event.onlineMeeting ? {
          joinUrl: event.onlineMeeting.joinUrl!,
          conferenceId: event.onlineMeeting.conferenceId,
          tollNumber: event.onlineMeeting.tollNumber
        } : undefined,
        changeKey: event.changeKey,
        createdDateTime: event.createdDateTime,
        lastModifiedDateTime: event.lastModifiedDateTime
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      throw new Error('Failed to fetch event from Microsoft Calendar');
    }
  }

  /**
   * Create a new event
   */
  async createEvent(
    integration: MicrosoftCalendarIntegration,
    calendarId: string,
    eventData: Omit<MicrosoftCalendarEventData, 'id' | 'changeKey' | 'createdDateTime' | 'lastModifiedDateTime' | 'etag'>
  ): Promise<MicrosoftCalendarEventData> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      const event: Event = {
        subject: eventData.subject,
        body: eventData.body,
        start: eventData.start,
        end: eventData.end,
        location: eventData.location,
        attendees: eventData.attendees,
        recurrence: eventData.recurrence,
        sensitivity: eventData.sensitivity,
        showAs: eventData.showAs,
        importance: eventData.importance,
        isAllDay: eventData.isAllDay,
        responseRequested: eventData.responseRequested,
        categories: eventData.categories
      };

      const createdEvent: Event = await graphClient
        .api(`/me/calendars/${calendarId}/events`)
        .post(event);

      return this.getEvent(integration, calendarId, createdEvent.id!);
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event in Microsoft Calendar');
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    integration: MicrosoftCalendarIntegration,
    calendarId: string,
    eventId: string,
    eventData: Partial<MicrosoftCalendarEventData>
  ): Promise<MicrosoftCalendarEventData> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      const updateData: Partial<Event> = {};
      
      if (eventData.subject !== undefined) updateData.subject = eventData.subject;
      if (eventData.body !== undefined) updateData.body = eventData.body;
      if (eventData.start !== undefined) updateData.start = eventData.start;
      if (eventData.end !== undefined) updateData.end = eventData.end;
      if (eventData.location !== undefined) updateData.location = eventData.location;
      if (eventData.attendees !== undefined) updateData.attendees = eventData.attendees;
      if (eventData.recurrence !== undefined) updateData.recurrence = eventData.recurrence;
      if (eventData.sensitivity !== undefined) updateData.sensitivity = eventData.sensitivity;
      if (eventData.showAs !== undefined) updateData.showAs = eventData.showAs;
      if (eventData.importance !== undefined) updateData.importance = eventData.importance;
      if (eventData.isAllDay !== undefined) updateData.isAllDay = eventData.isAllDay;
      if (eventData.categories !== undefined) updateData.categories = eventData.categories;

      await graphClient
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .patch(updateData);

      return this.getEvent(integration, calendarId, eventId);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event in Microsoft Calendar');
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    integration: MicrosoftCalendarIntegration,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      await graphClient
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .delete();
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event from Microsoft Calendar');
    }
  }

  /**
   * Get events within a date range for sync (with delta query support)
   */
  async getEventsForSync(
    integration: MicrosoftCalendarIntegration,
    calendarId: string,
    startDate: Date,
    endDate: Date,
    deltaToken?: string
  ): Promise<EventsListResponse> {
    if (deltaToken) {
      // Use delta query for incremental sync
      return this.getDeltaEvents(integration, calendarId, deltaToken);
    } else {
      // Full sync with date range
      const options: MicrosoftCalendarSyncOptions = {
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        orderBy: 'lastModifiedDateTime desc',
        top: 250
      };

      return this.listEvents(integration, calendarId, options);
    }
  }

  /**
   * Get delta events for incremental sync
   */
  private async getDeltaEvents(
    integration: MicrosoftCalendarIntegration,
    calendarId: string,
    deltaToken: string
  ): Promise<EventsListResponse> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      const response = await graphClient
        .api(`/me/calendars/${calendarId}/events/delta`)
        .query({ $deltatoken: deltaToken })
        .get();

      const events: MicrosoftCalendarEventData[] = response.value.map((event: Event) => ({
        id: event.id!,
        subject: event.subject || '',
        body: event.body ? {
          contentType: event.body.contentType as 'text' | 'html',
          content: event.body.content || ''
        } : undefined,
        start: event.start ? {
          dateTime: event.start.dateTime!,
          timeZone: event.start.timeZone!
        } : { dateTime: '', timeZone: '' },
        end: event.end ? {
          dateTime: event.end.dateTime!,
          timeZone: event.end.timeZone!
        } : { dateTime: '', timeZone: '' },
        isCancelled: event.isCancelled || false,
        changeKey: event.changeKey,
        lastModifiedDateTime: event.lastModifiedDateTime
      }));

      return {
        events,
        deltaLink: response['@odata.deltaLink']
      };
    } catch (error) {
      console.error('Error getting delta events:', error);
      throw new Error('Failed to get delta events from Microsoft Calendar');
    }
  }

  /**
   * Check if a calendar is writable
   */
  async isCalendarWritable(integration: MicrosoftCalendarIntegration, calendarId: string): Promise<boolean> {
    try {
      const calendar = await this.getCalendar(integration, calendarId);
      return calendar.canEdit || false;
    } catch (error) {
      console.error('Error checking calendar permissions:', error);
      return false;
    }
  }

  /**
   * Get user's mailbox settings
   */
  async getMailboxSettings(integration: MicrosoftCalendarIntegration): Promise<MailboxSettings | null> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      const settings: MailboxSettings = await graphClient
        .api('/me/mailboxSettings')
        .get();

      return settings;
    } catch (error) {
      console.error('Error fetching mailbox settings:', error);
      return null;
    }
  }

  /**
   * Create an online meeting for an event
   */
  async createOnlineMeeting(
    integration: MicrosoftCalendarIntegration,
    subject: string,
    startTime: string,
    endTime: string
  ): Promise<any> {
    try {
      const graphClient = await this.createGraphClient(integration);
      
      const meeting = {
        subject,
        startDateTime: startTime,
        endDateTime: endTime
      };

      const response = await graphClient
        .api('/me/onlineMeetings')
        .post(meeting);

      return response;
    } catch (error) {
      console.error('Error creating online meeting:', error);
      return null;
    }
  }

  /**
   * Test Microsoft Graph API connection
   */
  async testConnection(integration: MicrosoftCalendarIntegration): Promise<boolean> {
    try {
      await this.getCalendarList(integration);
      return true;
    } catch (error) {
      console.error('Microsoft Calendar connection test failed:', error);
      return false;
    }
  }

  /**
   * Get rate limit info (Microsoft Graph throttling limits)
   */
  getRateLimitInfo(): { requestsPerSecond: number; requestsPerDay: number } {
    return {
      requestsPerSecond: 10, // Microsoft Graph typically allows ~10 requests per second
      requestsPerDay: 100000 // 100K requests per day for most scenarios
    };
  }

  /**
   * Batch get multiple events
   */
  async batchGetEvents(
    integration: MicrosoftCalendarIntegration,
    calendarId: string,
    eventIds: string[]
  ): Promise<MicrosoftCalendarEventData[]> {
    try {
      const events: MicrosoftCalendarEventData[] = [];
      
      // Microsoft Graph batch API supports up to 20 requests per batch
      const batchSize = 20;
      for (let i = 0; i < eventIds.length; i += batchSize) {
        const batch = eventIds.slice(i, i + batchSize);
        
        for (const eventId of batch) {
          try {
            const event = await this.getEvent(integration, calendarId, eventId);
            events.push(event);
          } catch (error) {
            console.warn(`Failed to fetch event ${eventId}:`, error);
            // Continue with other events even if one fails
          }
        }
      }
      
      return events;
    } catch (error) {
      console.error('Error batch fetching events:', error);
      throw new Error('Failed to batch fetch events from Microsoft Calendar');
    }
  }
}