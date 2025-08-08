/**
 * Microsoft Calendar Sync Engine - Core synchronization logic for Microsoft Graph integration
 */

import { supabase } from '@/integrations/supabase/client';
import { MicrosoftCalendarService, MicrosoftCalendarEventData, MicrosoftRecurrencePatternType, MicrosoftRecurrenceRangeType, MicrosoftRecurrenceIndex } from './MicrosoftCalendarService';
import { MicrosoftAuthService, MicrosoftCalendarIntegration } from './MicrosoftAuthService';
import { TimezoneService } from '@/services/timezoneService';
import { UserPreferencesService } from '@/services/userPreferencesService';

// Microsoft Graph Recurrence Pattern Interface
export interface MicrosoftRecurrencePattern {
  pattern: {
    type: MicrosoftRecurrencePatternType;
    interval: number;
    month?: number;
    dayOfMonth?: number;
    daysOfWeek?: string[];
    firstDayOfWeek?: string;
    index?: MicrosoftRecurrenceIndex;
  };
  range: {
    type: MicrosoftRecurrenceRangeType;
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
  };
}

// Sync Status Update Interface
export interface MicrosoftSyncStatusUpdate {
  sync_status: 'pending' | 'syncing' | 'success' | 'error' | 'disabled';
  last_sync_at: string;
  updated_at: string;
  error_message?: string;
  last_successful_sync_at?: string;
  sync_error_message?: string | null;
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
  recurrence_pattern?: MicrosoftRecurrencePattern;
  recurrence_parent_id?: string;
  teams_meeting_url?: string;
  teams_meeting_id?: string;
  is_online_meeting?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MicrosoftSyncResult {
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsDetected: number;
  onlineMeetingsCreated: number;
  errors: string[];
}

export interface MicrosoftSyncOperation {
  type: 'import' | 'export' | 'bidirectional';
  calendarId: string;
  syncDirection: 'import_only' | 'export_only' | 'bidirectional';
  timeRange?: {
    start: Date;
    end: Date;
  };
  incremental?: boolean;
  deltaToken?: string;
  includeTeamsMeetings?: boolean;
  syncPrivateEvents?: boolean;
}

export interface MicrosoftConflictInfo {
  localEvent: LocalEvent;
  externalEvent: MicrosoftCalendarEventData;
  conflictType: 'time_mismatch' | 'content_mismatch' | 'deletion_conflict' | 'creation_conflict' | 'attendee_conflict' | 'category_conflict';
  conflictDetails: string;
}

export class MicrosoftCalendarSyncEngine {
  private static instance: MicrosoftCalendarSyncEngine;
  private microsoftCalendarService: MicrosoftCalendarService;
  private authService: MicrosoftAuthService;

  private constructor() {
    this.microsoftCalendarService = MicrosoftCalendarService.getInstance();
    this.authService = MicrosoftAuthService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MicrosoftCalendarSyncEngine {
    if (!MicrosoftCalendarSyncEngine.instance) {
      MicrosoftCalendarSyncEngine.instance = new MicrosoftCalendarSyncEngine();
    }
    return MicrosoftCalendarSyncEngine.instance;
  }

  /**
   * Perform full Microsoft Calendar synchronization
   */
  async syncCalendar(
    userId: string,
    integration: MicrosoftCalendarIntegration,
    operation: MicrosoftSyncOperation
  ): Promise<MicrosoftSyncResult> {
    const syncHistoryId = await this.createSyncHistory(userId, integration.id, operation);
    
    try {
      const result: MicrosoftSyncResult = {
        success: false,
        eventsProcessed: 0,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflictsDetected: 0,
        onlineMeetingsCreated: 0,
        errors: []
      };

      // Set sync status to 'syncing'
      await this.updateIntegrationSyncStatus(integration.id, 'syncing');

      switch (operation.syncDirection) {
        case 'import_only':
          await this.performImport(userId, integration, operation, result);
          break;
        case 'export_only':
          await this.performExport(userId, integration, operation, result);
          break;
        case 'bidirectional':
          await this.performBidirectionalSync(userId, integration, operation, result);
          break;
      }

      result.success = result.errors.length === 0;

      // Update integration status
      await this.updateIntegrationSyncStatus(
        integration.id, 
        result.success ? 'success' : 'error',
        result.errors.length > 0 ? result.errors.join('; ') : undefined
      );

      // Complete sync history
      await this.completeSyncHistory(syncHistoryId, result);

      return result;
    } catch (error) {
      console.error('Microsoft sync failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      await this.updateIntegrationSyncStatus(integration.id, 'error', errorMessage);
      await this.completeSyncHistory(syncHistoryId, {
        success: false,
        eventsProcessed: 0,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflictsDetected: 0,
        onlineMeetingsCreated: 0,
        errors: [errorMessage]
      });

      throw error;
    }
  }

  /**
   * Import events from Microsoft Calendar to local database
   */
  private async performImport(
    userId: string,
    integration: MicrosoftCalendarIntegration,
    operation: MicrosoftSyncOperation,
    result: MicrosoftSyncResult
  ): Promise<void> {
    try {
      const calendarId = integration.provider_calendar_id || 'calendar';
      
      // Get user preferences for timezone conversion
      const userPreferences = await UserPreferencesService.getUserPreferences(userId);
      const userTimezone = userPreferences.user_timezone;

      // Determine sync time range
      const timeRange = operation.timeRange || this.getDefaultSyncTimeRange(integration);
      
      // Get delta token for incremental sync
      const deltaToken = operation.deltaToken || await this.getDeltaToken(integration.id, calendarId);
      
      // Get events from Microsoft Calendar
      const microsoftEvents = await this.microsoftCalendarService.getEventsForSync(
        integration,
        calendarId,
        timeRange.start,
        timeRange.end,
        deltaToken
      );

      result.eventsProcessed = microsoftEvents.events.length;

      for (const microsoftEvent of microsoftEvents.events) {
        try {
          await this.importSingleEvent(userId, integration, microsoftEvent, userTimezone, result);
        } catch (error) {
          console.error(`Failed to import event ${microsoftEvent.id}:`, error);
          result.errors.push(`Import failed for event ${microsoftEvent.id}: ${error}`);
        }
      }

      // Update delta token for next incremental sync
      if (microsoftEvents.deltaLink) {
        await this.updateDeltaToken(integration.id, calendarId, microsoftEvents.deltaLink);
      }
    } catch (error) {
      console.error('Microsoft import operation failed:', error);
      result.errors.push(`Import operation failed: ${error}`);
    }
  }

  /**
   * Export events from local database to Microsoft Calendar
   */
  private async performExport(
    userId: string,
    integration: MicrosoftCalendarIntegration,
    operation: MicrosoftSyncOperation,
    result: MicrosoftSyncResult
  ): Promise<void> {
    try {
      const calendarId = integration.provider_calendar_id || 'calendar';
      
      // Get local events that need to be synced
      const localEvents = await this.getLocalEventsForSync(userId, integration.id, operation.timeRange);
      
      result.eventsProcessed = localEvents.length;

      for (const localEvent of localEvents) {
        try {
          await this.exportSingleEvent(integration, calendarId, localEvent, operation, result);
        } catch (error) {
          console.error(`Failed to export event ${localEvent.id}:`, error);
          result.errors.push(`Export failed for event ${localEvent.id}: ${error}`);
        }
      }
    } catch (error) {
      console.error('Microsoft export operation failed:', error);
      result.errors.push(`Export operation failed: ${error}`);
    }
  }

  /**
   * Perform bidirectional synchronization
   */
  private async performBidirectionalSync(
    userId: string,
    integration: MicrosoftCalendarIntegration,
    operation: MicrosoftSyncOperation,
    result: MicrosoftSyncResult
  ): Promise<void> {
    // First import from Microsoft Calendar
    await this.performImport(userId, integration, operation, result);
    
    // Then export local changes to Microsoft Calendar
    await this.performExport(userId, integration, operation, result);
    
    // Detect and handle conflicts
    await this.detectAndHandleConflicts(userId, integration, result);
  }

  /**
   * Import a single event from Microsoft Calendar
   */
  private async importSingleEvent(
    userId: string,
    integration: MicrosoftCalendarIntegration,
    microsoftEvent: MicrosoftCalendarEventData,
    userTimezone: string,
    result: MicrosoftSyncResult
  ): Promise<void> {
    // Check if event already exists
    const existingMapping = await this.getEventSyncMapping(integration.id, microsoftEvent.id!);
    
    if (microsoftEvent.isCancelled) {
      // Handle deleted event
      if (existingMapping) {
        await this.deleteLocalEvent(existingMapping.local_event_id);
        await this.deleteEventSyncMapping(existingMapping.id);
        result.eventsDeleted++;
      }
      return;
    }

    // Convert Microsoft event to local event format
    const localEventData = await this.convertMicrosoftEventToLocal(
      userId,
      microsoftEvent,
      userTimezone,
      integration.id
    );

    if (existingMapping) {
      // Update existing event
      const conflict = await this.checkForConflicts(existingMapping.local_event_id, microsoftEvent);
      
      if (conflict) {
        await this.createSyncConflict(userId, existingMapping.id, conflict);
        result.conflictsDetected++;
      } else {
        await this.updateLocalEvent(existingMapping.local_event_id, localEventData);
        await this.updateEventSyncMapping(existingMapping.id, microsoftEvent);
        result.eventsUpdated++;
      }
    } else {
      // Create new event
      const localEventId = await this.createLocalEvent(localEventData);
      await this.createEventSyncMapping(
        localEventId,
        integration.id,
        microsoftEvent.id!,
        'import',
        microsoftEvent
      );
      result.eventsCreated++;
    }
  }

  /**
   * Export a single event to Microsoft Calendar
   */
  private async exportSingleEvent(
    integration: MicrosoftCalendarIntegration,
    calendarId: string,
    localEvent: LocalEvent,
    operation: MicrosoftSyncOperation,
    result: MicrosoftSyncResult
  ): Promise<void> {
    // Convert local event to Microsoft Calendar format
    const microsoftEventData = await this.convertLocalEventToMicrosoft(localEvent, operation);

    if (localEvent.external_event_id) {
      // Update existing Microsoft Calendar event
      try {
        await this.microsoftCalendarService.updateEvent(
          integration,
          calendarId,
          localEvent.external_event_id,
          microsoftEventData
        );
        
        await this.updateLocalEventSyncStatus(localEvent.id, 'synced');
        result.eventsUpdated++;
      } catch (error) {
        console.error('Failed to update Microsoft Calendar event:', error);
        await this.updateLocalEventSyncStatus(localEvent.id, 'error');
        throw error;
      }
    } else {
      // Create new Microsoft Calendar event
      try {
        const createdEvent = await this.microsoftCalendarService.createEvent(
          integration,
          calendarId,
          microsoftEventData
        );
        
        // Handle Teams meeting creation if needed
        if (operation.includeTeamsMeetings && !localEvent.is_online_meeting) {
          const onlineMeeting = await this.microsoftCalendarService.createOnlineMeeting(
            integration,
            localEvent.title,
            localEvent.start_time,
            localEvent.end_time
          );

          if (onlineMeeting) {
            // Update event with Teams meeting info
            await this.microsoftCalendarService.updateEvent(
              integration,
              calendarId,
              createdEvent.id!,
              {
                onlineMeeting: {
                  joinUrl: onlineMeeting.joinUrl,
                  conferenceId: onlineMeeting.conferenceId
                }
              }
            );

            // Update local event with Teams info
            await this.updateLocalEventTeamsInfo(
              localEvent.id,
              onlineMeeting.joinUrl,
              onlineMeeting.conferenceId
            );

            result.onlineMeetingsCreated++;
          }
        }
        
        // Update local event with external ID
        await this.updateLocalEventExternalId(
          localEvent.id,
          integration.id,
          createdEvent.id!,
          'synced'
        );
        
        // Create sync mapping
        await this.createEventSyncMapping(
          localEvent.id,
          integration.id,
          createdEvent.id!,
          'export',
          createdEvent
        );
        
        result.eventsCreated++;
      } catch (error) {
        console.error('Failed to create Microsoft Calendar event:', error);
        await this.updateLocalEventSyncStatus(localEvent.id, 'error');
        throw error;
      }
    }
  }

  /**
   * Convert Microsoft Calendar event to local event format
   */
  private async convertMicrosoftEventToLocal(
    userId: string,
    microsoftEvent: MicrosoftCalendarEventData,
    userTimezone: string,
    integrationId: string
  ): Promise<Partial<LocalEvent>> {
    // Convert times to user's timezone
    const startTime = TimezoneService.fromUTC(
      TimezoneService.toUTC(microsoftEvent.start.dateTime, microsoftEvent.start.timeZone),
      userTimezone
    );
    
    const endTime = TimezoneService.fromUTC(
      TimezoneService.toUTC(microsoftEvent.end.dateTime, microsoftEvent.end.timeZone),
      userTimezone
    );

    // Extract reminder minutes from event
    const reminderMinutes = this.extractReminderMinutes(microsoftEvent);

    return {
      user_id: userId,
      title: microsoftEvent.subject,
      description: microsoftEvent.body?.content || '',
      start_time: startTime,
      end_time: endTime,
      timezone: userTimezone,
      location: microsoftEvent.location?.displayName || '',
      is_all_day: microsoftEvent.isAllDay || false,
      reminder_minutes: reminderMinutes,
      external_calendar_id: integrationId,
      external_event_id: microsoftEvent.id,
      sync_status: 'synced',
      external_last_modified: microsoftEvent.lastModifiedDateTime,
      teams_meeting_url: microsoftEvent.onlineMeeting?.joinUrl,
      teams_meeting_id: microsoftEvent.onlineMeeting?.conferenceId,
      is_online_meeting: !!microsoftEvent.onlineMeeting,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Convert local event to Microsoft Calendar format
   */
  private async convertLocalEventToMicrosoft(
    localEvent: LocalEvent,
    operation: MicrosoftSyncOperation
  ): Promise<Omit<MicrosoftCalendarEventData, 'id' | 'changeKey' | 'createdDateTime' | 'lastModifiedDateTime' | 'etag'>> {
    // Convert times to UTC for Microsoft Calendar
    const startDateTime = TimezoneService.toUTC(localEvent.start_time, localEvent.timezone);
    const endDateTime = TimezoneService.toUTC(localEvent.end_time, localEvent.timezone);

    const eventData: MicrosoftCalendarEventData = {
      subject: localEvent.title,
      body: {
        contentType: 'text' as const,
        content: localEvent.description || ''
      },
      start: {
        dateTime: startDateTime,
        timeZone: localEvent.timezone
      },
      end: {
        dateTime: endDateTime,
        timeZone: localEvent.timezone
      },
      location: localEvent.location ? {
        displayName: localEvent.location
      } : undefined,
      isAllDay: localEvent.is_all_day,
      importance: 'normal' as const,
      showAs: 'busy' as const,
      sensitivity: operation.syncPrivateEvents ? 'normal' as const : 'private' as const
    };

    // Add Teams meeting if applicable
    if (localEvent.teams_meeting_url) {
      eventData.onlineMeeting = {
        joinUrl: localEvent.teams_meeting_url,
        conferenceId: localEvent.teams_meeting_id
      };
    }

    return eventData;
  }

  /**
   * Database operations for Microsoft sync mappings and events
   */
  private async getEventSyncMapping(integrationId: string, externalEventId: string) {
    const { data } = await supabase
      .from('event_sync_mappings')
      .select('*')
      .eq('calendar_integration_id', integrationId)
      .eq('external_event_id', externalEventId)
      .single();
    
    return data;
  }

  private async createEventSyncMapping(
    localEventId: string,
    integrationId: string,
    externalEventId: string,
    syncDirection: 'import' | 'export' | 'bidirectional',
    externalEvent: MicrosoftCalendarEventData
  ) {
    const { error } = await supabase
      .from('event_sync_mappings')
      .insert({
        local_event_id: localEventId,
        calendar_integration_id: integrationId,
        external_event_id: externalEventId,
        sync_direction: syncDirection,
        microsoft_change_key: externalEvent.changeKey,
        microsoft_event_type: externalEvent.type || 'singleInstance',
        outlook_categories: externalEvent.categories,
        last_sync_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async updateEventSyncMapping(mappingId: string, externalEvent: MicrosoftCalendarEventData) {
    const { error } = await supabase
      .from('event_sync_mappings')
      .update({
        microsoft_change_key: externalEvent.changeKey,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', mappingId);

    if (error) throw error;
  }

  private async deleteEventSyncMapping(mappingId: string) {
    const { error } = await supabase
      .from('event_sync_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) throw error;
  }

  private async createLocalEvent(eventData: Partial<LocalEvent>): Promise<string> {
    const { data, error } = await supabase
      .from('schedule_events')
      .insert(eventData)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async updateLocalEvent(eventId: string, eventData: Partial<LocalEvent>) {
    const { error } = await supabase
      .from('schedule_events')
      .update(eventData)
      .eq('id', eventId);

    if (error) throw error;
  }

  private async deleteLocalEvent(eventId: string) {
    const { error } = await supabase
      .from('schedule_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  }

  private async updateLocalEventSyncStatus(eventId: string, status: string) {
    const { error } = await supabase
      .from('schedule_events')
      .update({
        sync_status: status,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (error) throw error;
  }

  private async updateLocalEventExternalId(
    eventId: string,
    integrationId: string,
    externalEventId: string,
    syncStatus: string
  ) {
    const { error } = await supabase
      .from('schedule_events')
      .update({
        external_calendar_id: integrationId,
        external_event_id: externalEventId,
        sync_status: syncStatus,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (error) throw error;
  }

  private async updateLocalEventTeamsInfo(
    eventId: string,
    teamsUrl: string,
    teamsId: string
  ) {
    const { error } = await supabase
      .from('schedule_events')
      .update({
        teams_meeting_url: teamsUrl,
        teams_meeting_id: teamsId,
        is_online_meeting: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (error) throw error;
  }

  private async getLocalEventsForSync(
    userId: string,
    integrationId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<LocalEvent[]> {
    let query = supabase
      .from('schedule_events')
      .select('*')
      .eq('user_id', userId)
      .or(`external_calendar_id.is.null,external_calendar_id.eq.${integrationId}`)
      .in('sync_status', ['local', 'conflict']);

    if (timeRange) {
      query = query
        .gte('start_time', timeRange.start.toISOString())
        .lte('end_time', timeRange.end.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  }

  /**
   * Microsoft-specific delta token management
   */
  private async getDeltaToken(integrationId: string, calendarId: string): Promise<string | undefined> {
    const { data } = await supabase
      .from('microsoft_sync_tokens')
      .select('delta_token')
      .eq('integration_id', integrationId)
      .eq('calendar_id', calendarId)
      .eq('sync_type', 'events')
      .single();

    return data?.delta_token;
  }

  private async updateDeltaToken(integrationId: string, calendarId: string, deltaLink: string) {
    // Extract delta token from delta link
    const deltaToken = deltaLink.split('$deltatoken=')[1]?.split('&')[0];
    
    if (deltaToken) {
      const { error } = await supabase
        .from('microsoft_sync_tokens')
        .upsert({
          integration_id: integrationId,
          calendar_id: calendarId,
          sync_type: 'events',
          delta_token: deltaToken,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'integration_id,calendar_id,sync_type'
        });

      if (error) console.warn('Failed to update delta token:', error);
    }
  }

  /**
   * Sync history and status management
   */
  private async createSyncHistory(
    userId: string,
    integrationId: string,
    operation: MicrosoftSyncOperation
  ): Promise<string> {
    const { data, error } = await supabase
      .from('sync_history')
      .insert({
        user_id: userId,
        calendar_integration_id: integrationId,
        sync_type: operation.incremental ? 'incremental' : 'full',
        sync_direction: operation.syncDirection,
        sync_status: 'started',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async completeSyncHistory(historyId: string, result: MicrosoftSyncResult) {
    const { error } = await supabase
      .from('sync_history')
      .update({
        sync_status: result.success ? 'completed' : 'failed',
        events_processed: result.eventsProcessed,
        events_created: result.eventsCreated,
        events_updated: result.eventsUpdated,
        events_deleted: result.eventsDeleted,
        conflicts_detected: result.conflictsDetected,
        error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.floor((Date.now() - new Date().getTime()) / 1000)
      })
      .eq('id', historyId);

    if (error) throw error;
  }

  private async updateIntegrationSyncStatus(
    integrationId: string,
    status: 'pending' | 'syncing' | 'success' | 'error' | 'disabled',
    errorMessage?: string
  ) {
    const updateData: MicrosoftSyncStatusUpdate = {
      sync_status: status,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (status === 'success') {
      updateData.last_successful_sync_at = new Date().toISOString();
      updateData.sync_error_message = null;
    } else if (status === 'error' && errorMessage) {
      updateData.sync_error_message = errorMessage;
    }

    const { error } = await supabase
      .from('calendar_integrations')
      .update(updateData)
      .eq('id', integrationId);

    if (error) throw error;
  }

  /**
   * Conflict detection and resolution
   */
  private async checkForConflicts(localEventId: string, microsoftEvent: MicrosoftCalendarEventData): Promise<MicrosoftConflictInfo | null> {
    // Get the local event
    const { data: localEvent, error } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('id', localEventId)
      .single();

    if (error || !localEvent) return null;

    // Check for time conflicts
    const localStartTime = new Date(localEvent.start_time).getTime();
    const localEndTime = new Date(localEvent.end_time).getTime();
    const microsoftStartTime = new Date(microsoftEvent.start.dateTime).getTime();
    const microsoftEndTime = new Date(microsoftEvent.end.dateTime).getTime();

    if (localStartTime !== microsoftStartTime || localEndTime !== microsoftEndTime) {
      return {
        localEvent,
        externalEvent: microsoftEvent,
        conflictType: 'time_mismatch',
        conflictDetails: 'Event times differ between local and Microsoft Calendar'
      };
    }

    // Check for content conflicts
    if (localEvent.title !== microsoftEvent.subject || 
        localEvent.description !== (microsoftEvent.body?.content || '')) {
      return {
        localEvent,
        externalEvent: microsoftEvent,
        conflictType: 'content_mismatch',
        conflictDetails: 'Event content differs between local and Microsoft Calendar'
      };
    }

    // Check for attendee conflicts (if attendees are tracked)
    if (microsoftEvent.attendees && microsoftEvent.attendees.length > 0) {
      return {
        localEvent,
        externalEvent: microsoftEvent,
        conflictType: 'attendee_conflict',
        conflictDetails: 'Event has attendee information that may need review'
      };
    }

    return null;
  }

  private async createSyncConflict(userId: string, mappingId: string, conflict: MicrosoftConflictInfo) {
    const { error } = await supabase
      .from('sync_conflicts')
      .insert({
        user_id: userId,
        event_sync_mapping_id: mappingId,
        conflict_type: conflict.conflictType,
        conflict_description: conflict.conflictDetails,
        local_event_data: conflict.localEvent,
        external_event_data: conflict.externalEvent,
        resolution_status: 'pending'
      });

    if (error) throw error;
  }

  private async detectAndHandleConflicts(
    userId: string,
    integration: MicrosoftCalendarIntegration,
    result: MicrosoftSyncResult
  ) {
    // This is a placeholder for more sophisticated conflict detection
    // In a full implementation, you would check for various types of conflicts
    // and apply automatic resolution strategies where possible
  }

  /**
   * Utility methods
   */
  private extractReminderMinutes(microsoftEvent: MicrosoftCalendarEventData): number | undefined {
    // Microsoft Calendar reminders are typically set at the calendar level
    // or in the event's reminder settings. For now, return a default.
    return 15; // Default 15 minutes
  }

  private getDefaultSyncTimeRange(integration: MicrosoftCalendarIntegration): { start: Date; end: Date } {
    const now = new Date();
    const pastDays = integration.sync_past_days || 30;
    const futureDays = integration.sync_future_days || 365;
    
    return {
      start: new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000),
      end: new Date(now.getTime() + futureDays * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Public API methods for Microsoft sync operations
   */
  async performFullSync(userId: string, integrationId: string): Promise<MicrosoftSyncResult> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Microsoft calendar integration not found');
    }

    const operation: MicrosoftSyncOperation = {
      type: 'bidirectional',
      calendarId: integration.provider_calendar_id || 'calendar',
      syncDirection: integration.sync_direction,
      incremental: false,
      includeTeamsMeetings: true,
      syncPrivateEvents: false
    };

    return this.syncCalendar(userId, integration, operation);
  }

  async performIncrementalSync(userId: string, integrationId: string): Promise<MicrosoftSyncResult> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Microsoft calendar integration not found');
    }

    // Get stored delta token
    const deltaToken = await this.getDeltaToken(integrationId, integration.provider_calendar_id || 'calendar');

    const operation: MicrosoftSyncOperation = {
      type: 'bidirectional',
      calendarId: integration.provider_calendar_id || 'calendar',
      syncDirection: integration.sync_direction,
      incremental: true,
      deltaToken,
      includeTeamsMeetings: true,
      syncPrivateEvents: false
    };

    return this.syncCalendar(userId, integration, operation);
  }

  private async getIntegration(integrationId: string): Promise<MicrosoftCalendarIntegration | null> {
    const { data, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    return error ? null : data;
  }
}