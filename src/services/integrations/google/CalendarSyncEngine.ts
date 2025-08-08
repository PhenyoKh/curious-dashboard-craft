/**
 * Calendar Sync Engine - Core synchronization logic for Google Calendar integration
 */

import { supabase } from '@/integrations/supabase/client';
import { GoogleCalendarService, GoogleCalendarEventData } from './GoogleCalendarService';
import { GoogleAuthService, CalendarIntegration } from './GoogleAuthService';
import { TimezoneService } from '@/services/timezoneService';
import { UserPreferencesService } from '@/services/userPreferencesService';

// Google Calendar recurrence pattern interface
export interface RecurrencePattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
}

// Integration sync update data
export interface SyncUpdateData {
  sync_status: string;
  last_sync_at: string;
  updated_at: string;
  error_message?: string;
  external_id?: string;
  external_last_modified?: string;
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
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsDetected: number;
  errors: string[];
}

export interface SyncOperation {
  type: 'import' | 'export' | 'bidirectional';
  calendarId: string;
  syncDirection: 'import_only' | 'export_only' | 'bidirectional';
  timeRange?: {
    start: Date;
    end: Date;
  };
  incremental?: boolean;
  syncToken?: string;
}

export interface ConflictInfo {
  localEvent: LocalEvent;
  externalEvent: GoogleCalendarEventData;
  conflictType: 'time_mismatch' | 'content_mismatch' | 'deletion_conflict' | 'creation_conflict';
  conflictDetails: string;
}

export class CalendarSyncEngine {
  private static instance: CalendarSyncEngine;
  private googleCalendarService: GoogleCalendarService;
  private authService: GoogleAuthService;

  private constructor() {
    this.googleCalendarService = GoogleCalendarService.getInstance();
    this.authService = GoogleAuthService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CalendarSyncEngine {
    if (!CalendarSyncEngine.instance) {
      CalendarSyncEngine.instance = new CalendarSyncEngine();
    }
    return CalendarSyncEngine.instance;
  }

  /**
   * Perform full calendar synchronization
   */
  async syncCalendar(
    userId: string,
    integration: CalendarIntegration,
    operation: SyncOperation
  ): Promise<SyncResult> {
    const syncHistoryId = await this.createSyncHistory(userId, integration.id, operation);
    
    try {
      const result: SyncResult = {
        success: false,
        eventsProcessed: 0,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflictsDetected: 0,
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
      console.error('Sync failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      await this.updateIntegrationSyncStatus(integration.id, 'error', errorMessage);
      await this.completeSyncHistory(syncHistoryId, {
        success: false,
        eventsProcessed: 0,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflictsDetected: 0,
        errors: [errorMessage]
      });

      throw error;
    }
  }

  /**
   * Import events from Google Calendar to local database
   */
  private async performImport(
    userId: string,
    integration: CalendarIntegration,
    operation: SyncOperation,
    result: SyncResult
  ): Promise<void> {
    try {
      const calendarId = integration.provider_calendar_id || 'primary';
      
      // Get user preferences for timezone conversion
      const userPreferences = await UserPreferencesService.getUserPreferences(userId);
      const userTimezone = userPreferences.user_timezone;

      // Determine sync time range
      const timeRange = operation.timeRange || this.getDefaultSyncTimeRange(integration);
      
      // Get events from Google Calendar
      const googleEvents = await this.googleCalendarService.getEventsForSync(
        integration,
        calendarId,
        timeRange.start,
        timeRange.end,
        operation.syncToken
      );

      result.eventsProcessed = googleEvents.events.length;

      for (const googleEvent of googleEvents.events) {
        try {
          await this.importSingleEvent(userId, integration, googleEvent, userTimezone, result);
        } catch (error) {
          console.error(`Failed to import event ${googleEvent.id}:`, error);
          result.errors.push(`Import failed for event ${googleEvent.id}: ${error}`);
        }
      }

      // Update sync token for incremental sync
      if (googleEvents.nextSyncToken) {
        await this.updateSyncToken(integration.id, googleEvents.nextSyncToken);
      }
    } catch (error) {
      console.error('Import operation failed:', error);
      result.errors.push(`Import operation failed: ${error}`);
    }
  }

  /**
   * Export events from local database to Google Calendar
   */
  private async performExport(
    userId: string,
    integration: CalendarIntegration,
    operation: SyncOperation,
    result: SyncResult
  ): Promise<void> {
    try {
      const calendarId = integration.provider_calendar_id || 'primary';
      
      // Get local events that need to be synced
      const localEvents = await this.getLocalEventsForSync(userId, integration.id, operation.timeRange);
      
      result.eventsProcessed = localEvents.length;

      for (const localEvent of localEvents) {
        try {
          await this.exportSingleEvent(integration, calendarId, localEvent, result);
        } catch (error) {
          console.error(`Failed to export event ${localEvent.id}:`, error);
          result.errors.push(`Export failed for event ${localEvent.id}: ${error}`);
        }
      }
    } catch (error) {
      console.error('Export operation failed:', error);
      result.errors.push(`Export operation failed: ${error}`);
    }
  }

  /**
   * Perform bidirectional synchronization
   */
  private async performBidirectionalSync(
    userId: string,
    integration: CalendarIntegration,
    operation: SyncOperation,
    result: SyncResult
  ): Promise<void> {
    // First import from Google Calendar
    await this.performImport(userId, integration, operation, result);
    
    // Then export local changes to Google Calendar
    await this.performExport(userId, integration, operation, result);
    
    // Detect and handle conflicts
    await this.detectAndHandleConflicts(userId, integration, result);
  }

  /**
   * Import a single event from Google Calendar
   */
  private async importSingleEvent(
    userId: string,
    integration: CalendarIntegration,
    googleEvent: GoogleCalendarEventData,
    userTimezone: string,
    result: SyncResult
  ): Promise<void> {
    // Check if event already exists
    const existingMapping = await this.getEventSyncMapping(integration.id, googleEvent.id!);
    
    if (googleEvent.status === 'cancelled') {
      // Handle deleted event
      if (existingMapping) {
        await this.deleteLocalEvent(existingMapping.local_event_id);
        await this.deleteEventSyncMapping(existingMapping.id);
        result.eventsDeleted++;
      }
      return;
    }

    // Convert Google event to local event format
    const localEventData = await this.convertGoogleEventToLocal(
      userId,
      googleEvent,
      userTimezone,
      integration.id
    );

    if (existingMapping) {
      // Update existing event
      const conflict = await this.checkForConflicts(existingMapping.local_event_id, googleEvent);
      
      if (conflict) {
        await this.createSyncConflict(userId, existingMapping.id, conflict);
        result.conflictsDetected++;
      } else {
        await this.updateLocalEvent(existingMapping.local_event_id, localEventData);
        await this.updateEventSyncMapping(existingMapping.id, googleEvent);
        result.eventsUpdated++;
      }
    } else {
      // Create new event
      const localEventId = await this.createLocalEvent(localEventData);
      await this.createEventSyncMapping(
        localEventId,
        integration.id,
        googleEvent.id!,
        'import',
        googleEvent
      );
      result.eventsCreated++;
    }
  }

  /**
   * Export a single event to Google Calendar
   */
  private async exportSingleEvent(
    integration: CalendarIntegration,
    calendarId: string,
    localEvent: LocalEvent,
    result: SyncResult
  ): Promise<void> {
    // Convert local event to Google Calendar format
    const googleEventData = await this.convertLocalEventToGoogle(localEvent);

    if (localEvent.external_event_id) {
      // Update existing Google Calendar event
      try {
        await this.googleCalendarService.updateEvent(
          integration,
          calendarId,
          localEvent.external_event_id,
          googleEventData
        );
        
        await this.updateLocalEventSyncStatus(localEvent.id, 'synced');
        result.eventsUpdated++;
      } catch (error) {
        console.error('Failed to update Google Calendar event:', error);
        await this.updateLocalEventSyncStatus(localEvent.id, 'error');
        throw error;
      }
    } else {
      // Create new Google Calendar event
      try {
        const createdEvent = await this.googleCalendarService.createEvent(
          integration,
          calendarId,
          googleEventData
        );
        
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
        console.error('Failed to create Google Calendar event:', error);
        await this.updateLocalEventSyncStatus(localEvent.id, 'error');
        throw error;
      }
    }
  }

  /**
   * Convert Google Calendar event to local event format
   */
  private async convertGoogleEventToLocal(
    userId: string,
    googleEvent: GoogleCalendarEventData,
    userTimezone: string,
    integrationId: string
  ): Promise<Partial<LocalEvent>> {
    // Convert times to user's timezone
    const startTime = TimezoneService.fromUTC(
      TimezoneService.toUTC(googleEvent.start.dateTime, googleEvent.start.timeZone),
      userTimezone
    );
    
    const endTime = TimezoneService.fromUTC(
      TimezoneService.toUTC(googleEvent.end.dateTime, googleEvent.end.timeZone),
      userTimezone
    );

    // Determine if it's an all-day event
    const isAllDay = googleEvent.start.dateTime.includes('T00:00:00') && 
                     googleEvent.end.dateTime.includes('T23:59:59');

    return {
      user_id: userId,
      title: googleEvent.summary,
      description: googleEvent.description || '',
      start_time: startTime,
      end_time: endTime,
      timezone: userTimezone,
      location: googleEvent.location || '',
      is_all_day: isAllDay,
      reminder_minutes: this.extractReminderMinutes(googleEvent.reminders),
      external_calendar_id: integrationId,
      external_event_id: googleEvent.id,
      sync_status: 'synced',
      external_last_modified: googleEvent.updated,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Convert local event to Google Calendar format
   */
  private async convertLocalEventToGoogle(localEvent: LocalEvent): Promise<Omit<GoogleCalendarEventData, 'id' | 'etag' | 'updated'>> {
    // Convert times to UTC for Google Calendar
    const startDateTime = TimezoneService.toUTC(localEvent.start_time, localEvent.timezone);
    const endDateTime = TimezoneService.toUTC(localEvent.end_time, localEvent.timezone);

    return {
      summary: localEvent.title,
      description: localEvent.description || '',
      start: {
        dateTime: startDateTime,
        timeZone: localEvent.timezone
      },
      end: {
        dateTime: endDateTime,
        timeZone: localEvent.timezone
      },
      location: localEvent.location || '',
      reminders: localEvent.reminder_minutes ? {
        useDefault: false,
        overrides: [{
          method: 'popup',
          minutes: localEvent.reminder_minutes
        }]
      } : { useDefault: true },
      status: 'confirmed'
    };
  }

  /**
   * Database operations for sync mappings and events
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
    externalEvent: GoogleCalendarEventData
  ) {
    const { error } = await supabase
      .from('event_sync_mappings')
      .insert({
        local_event_id: localEventId,
        calendar_integration_id: integrationId,
        external_event_id: externalEventId,
        sync_direction: syncDirection,
        last_sync_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async updateEventSyncMapping(mappingId: string, externalEvent: GoogleCalendarEventData) {
    const { error } = await supabase
      .from('event_sync_mappings')
      .update({
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
   * Sync history and status management
   */
  private async createSyncHistory(
    userId: string,
    integrationId: string,
    operation: SyncOperation
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

  private async completeSyncHistory(historyId: string, result: SyncResult) {
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
    status: string,
    errorMessage?: string
  ) {
    const updateData: SyncUpdateData = {
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

  private async updateSyncToken(integrationId: string, syncToken: string) {
    // Store sync token in calendar_integrations metadata
    const { error } = await supabase
      .from('calendar_integrations')
      .update({
        // Assuming we add a sync_metadata JSONB column to store tokens
        sync_metadata: { syncToken },
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId);

    if (error) console.warn('Failed to update sync token:', error);
  }

  /**
   * Conflict detection and resolution
   */
  private async checkForConflicts(localEventId: string, googleEvent: GoogleCalendarEventData): Promise<ConflictInfo | null> {
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
    const googleStartTime = new Date(googleEvent.start.dateTime).getTime();
    const googleEndTime = new Date(googleEvent.end.dateTime).getTime();

    if (localStartTime !== googleStartTime || localEndTime !== googleEndTime) {
      return {
        localEvent,
        externalEvent: googleEvent,
        conflictType: 'time_mismatch',
        conflictDetails: 'Event times differ between local and Google Calendar'
      };
    }

    // Check for content conflicts
    if (localEvent.title !== googleEvent.summary || 
        localEvent.description !== (googleEvent.description || '')) {
      return {
        localEvent,
        externalEvent: googleEvent,
        conflictType: 'content_mismatch',
        conflictDetails: 'Event content differs between local and Google Calendar'
      };
    }

    return null;
  }

  private async createSyncConflict(userId: string, mappingId: string, conflict: ConflictInfo) {
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
    integration: CalendarIntegration,
    result: SyncResult
  ) {
    // This is a placeholder for more sophisticated conflict detection
    // In a full implementation, you would check for various types of conflicts
    // and apply automatic resolution strategies where possible
  }

  /**
   * Utility methods
   */
  private extractReminderMinutes(reminders?: GoogleCalendarEventData['reminders']): number | undefined {
    if (!reminders || reminders.useDefault) {
      return 15; // Default reminder
    }
    
    if (reminders.overrides && reminders.overrides.length > 0) {
      return reminders.overrides[0].minutes;
    }
    
    return undefined;
  }

  private getDefaultSyncTimeRange(integration: CalendarIntegration): { start: Date; end: Date } {
    const now = new Date();
    const pastDays = integration.sync_past_days || 30;
    const futureDays = integration.sync_future_days || 365;
    
    return {
      start: new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000),
      end: new Date(now.getTime() + futureDays * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Public API methods for sync operations
   */
  async performFullSync(userId: string, integrationId: string): Promise<SyncResult> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Calendar integration not found');
    }

    const operation: SyncOperation = {
      type: 'bidirectional',
      calendarId: integration.provider_calendar_id || 'primary',
      syncDirection: integration.sync_direction,
      incremental: false
    };

    return this.syncCalendar(userId, integration, operation);
  }

  async performIncrementalSync(userId: string, integrationId: string): Promise<SyncResult> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Calendar integration not found');
    }

    // Get stored sync token
    const syncToken = integration.sync_metadata?.syncToken;

    const operation: SyncOperation = {
      type: 'bidirectional',
      calendarId: integration.provider_calendar_id || 'primary',
      syncDirection: integration.sync_direction,
      incremental: true,
      syncToken
    };

    return this.syncCalendar(userId, integration, operation);
  }

  private async getIntegration(integrationId: string): Promise<CalendarIntegration | null> {
    const { data, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    return error ? null : data;
  }
}