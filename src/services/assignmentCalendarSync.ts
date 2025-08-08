/**
 * Assignment Calendar Sync Service
 * 
 * Handles bidirectional synchronization between assignments and calendar events.
 * Integrates with existing Google and Microsoft Calendar services.
 */

import { GoogleCalendarService, GoogleCalendarEventData } from './integrations/google/GoogleCalendarService';
import { MicrosoftCalendarService, MicrosoftCalendarEventData } from './integrations/microsoft/MicrosoftCalendarService';
import { assignmentsService, scheduleService } from './supabaseService';
import { assignmentDetectionEngine } from './assignmentDetectionEngine';
import type { 
  Assignment, 
  AssignmentInsert, 
  AssignmentUpdate,
  EnhancedAssignment,
  CalendarEventMapping,
  AssignmentType
} from '../types/assignments';

// Calendar provider types
export type CalendarProvider = 'google' | 'microsoft' | 'apple';

// Union type for calendar event data from different providers
export type ProviderCalendarEventData = GoogleCalendarEventData | MicrosoftCalendarEventData;

// Conflict value types
export type ConflictValue = string | Date | number | boolean | null | undefined;

// Calendar event metadata
export interface CalendarEventMetadata {
  provider_id?: string;
  assignment_id?: string;
  sync_timestamp?: string;
  conflict_resolution_applied?: string;
  original_title?: string;
  source_type?: 'assignment' | 'calendar' | 'manual';
  [key: string]: string | number | boolean | null | undefined;
}

// Assignment detection result from engine
export interface AssignmentDetectionResult {
  confidence: number;
  assignment_type: AssignmentType;
  is_assignment: boolean;
  suggested_data: {
    title: string;
    due_date: Date;
    assignment_type: AssignmentType;
    subject?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  reasoning: string[];
}

// Sync status types
export type SyncStatus = 'synced' | 'pending' | 'error' | 'conflict' | 'manual_override';

// Sync direction
export type SyncDirection = 'assignment_to_calendar' | 'calendar_to_assignment' | 'bidirectional';

// Sync configuration
export interface SyncConfiguration {
  provider: CalendarProvider;
  calendar_id: string;
  enabled: boolean;
  sync_direction: SyncDirection;
  auto_create_events: boolean;
  auto_update_assignments: boolean;
  conflict_resolution: 'manual' | 'calendar_wins' | 'assignment_wins' | 'newest_wins';
  sync_categories: AssignmentType[];
}

// Sync result
export interface SyncResult {
  success: boolean;
  created_events: number;
  updated_events: number;
  created_assignments: number;
  updated_assignments: number;
  conflicts: SyncConflict[];
  errors: SyncError[];
}

// Sync conflict
export interface SyncConflict {
  assignment_id: string;
  calendar_event_id: string;
  conflict_type: 'title_mismatch' | 'date_mismatch' | 'description_mismatch' | 'deletion_conflict';
  assignment_value: ConflictValue;
  calendar_value: ConflictValue;
  resolution_needed: boolean;
}

// Sync error
export interface SyncError {
  type: 'api_error' | 'permission_error' | 'validation_error' | 'network_error';
  message: string;
  assignment_id?: string;
  calendar_event_id?: string;
  retryable: boolean;
}

// Calendar event interface (normalized across providers)
export interface NormalizedCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  calendar_id: string;
  provider: CalendarProvider;
  last_modified: Date;
  metadata?: CalendarEventMetadata;
}

export class AssignmentCalendarSyncService {
  private googleService: GoogleCalendarService;
  private microsoftService: MicrosoftCalendarService;
  private syncConfigurations: Map<string, SyncConfiguration> = new Map();

  constructor() {
    this.googleService = new GoogleCalendarService();
    this.microsoftService = new MicrosoftCalendarService();
  }

  /**
   * Initialize sync configurations for a user
   */
  async initializeSyncConfiguration(userId: string, config: SyncConfiguration): Promise<void> {
    this.syncConfigurations.set(userId, config);
    
    // Store configuration in database
    await this.storeSyncConfiguration(userId, config);
  }

  /**
   * Sync assignment to calendar event (create or update)
   */
  async syncAssignmentToCalendar(
    assignment: Assignment, 
    userId: string, 
    forceCreate: boolean = false
  ): Promise<{ success: boolean; event_id?: string; error?: string }> {
    try {
      const config = await this.getSyncConfiguration(userId);
      if (!config || !config.enabled) {
        return { success: false, error: 'Sync not configured or disabled' };
      }

      // Check if assignment should be synced based on categories
      if (!config.sync_categories.includes(assignment.assignment_type as AssignmentType)) {
        return { success: false, error: 'Assignment type not configured for sync' };
      }

      // Create calendar event from assignment
      const calendarEvent = this.createCalendarEventFromAssignment(assignment, config);

      // Check if assignment already has a calendar event
      const existingMapping = await this.getCalendarEventMapping(assignment.id);

      let eventId: string;
      
      if (existingMapping && !forceCreate) {
        // Update existing event
        eventId = await this.updateCalendarEvent(existingMapping, calendarEvent, config);
      } else {
        // Create new event
        eventId = await this.createCalendarEvent(calendarEvent, config);
        
        // Store mapping
        await this.storeCalendarEventMapping({
          assignment_id: assignment.id,
          external_calendar_id: config.calendar_id,
          external_event_id: eventId,
          provider: config.provider,
          last_synced: new Date(),
          sync_status: 'synced'
        });
      }

      // Update assignment with external calendar event ID
      await assignmentsService.updateAssignment(assignment.id, {
        external_calendar_event_id: eventId,
        updated_at: new Date().toISOString()
      }, userId);

      return { success: true, event_id: eventId };

    } catch (error) {
      console.error('Error syncing assignment to calendar:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Sync calendar event to assignment (create or update)
   */
  async syncCalendarEventToAssignment(
    calendarEvent: NormalizedCalendarEvent,
    userId: string
  ): Promise<{ success: boolean; assignment_id?: string; error?: string }> {
    try {
      const config = await this.getSyncConfiguration(userId);
      if (!config || !config.enabled) {
        return { success: false, error: 'Sync not configured or disabled' };
      }

      // Use detection engine to analyze the calendar event
      const detectionResult = await assignmentDetectionEngine.detectAssignmentFromCalendarEvent({
        id: calendarEvent.id,
        title: calendarEvent.title,
        description: calendarEvent.description,
        start: calendarEvent.start,
        end: calendarEvent.end,
        location: calendarEvent.location,
        calendar_source: calendarEvent.provider,
        calendar_name: calendarEvent.calendar_id
      });

      if (!detectionResult.detected) {
        return { success: false, error: 'Event not detected as academic assignment' };
      }

      // Check if calendar event already has an assignment
      const existingMapping = await this.getAssignmentByCalendarEvent(calendarEvent.id);

      let assignmentId: string;

      if (existingMapping) {
        // Update existing assignment
        const updateData = this.createAssignmentUpdateFromCalendarEvent(calendarEvent, detectionResult);
        await assignmentsService.updateAssignment(existingMapping.id, updateData, userId);
        assignmentId = existingMapping.id;
      } else {
        // Create new assignment
        const assignmentData = this.createAssignmentFromCalendarEvent(calendarEvent, detectionResult, userId);
        const newAssignment = await assignmentsService.createAssignment(assignmentData);
        assignmentId = newAssignment.id;

        // Store mapping
        await this.storeCalendarEventMapping({
          assignment_id: assignmentId,
          external_calendar_id: calendarEvent.calendar_id,
          external_event_id: calendarEvent.id,
          provider: calendarEvent.provider,
          last_synced: new Date(),
          sync_status: 'synced'
        });
      }

      return { success: true, assignment_id: assignmentId };

    } catch (error) {
      console.error('Error syncing calendar event to assignment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Perform full bidirectional sync for a user
   */
  async performFullSync(userId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      created_events: 0,
      updated_events: 0,
      created_assignments: 0,
      updated_assignments: 0,
      conflicts: [],
      errors: []
    };

    try {
      const config = await this.getSyncConfiguration(userId);
      if (!config || !config.enabled) {
        result.success = false;
        result.errors.push({
          type: 'validation_error',
          message: 'Sync not configured or disabled',
          retryable: false
        });
        return result;
      }

      // Get all assignments for user
      const assignments = await assignmentsService.getUserAssignments(userId);
      
      // Get all calendar events from configured calendar
      const calendarEvents = await this.getCalendarEvents(config);

      // Sync assignments to calendar (if enabled)
      if (config.sync_direction === 'assignment_to_calendar' || config.sync_direction === 'bidirectional') {
        for (const assignment of assignments) {
          if (config.sync_categories.includes(assignment.assignment_type as AssignmentType)) {
            const syncResult = await this.syncAssignmentToCalendar(assignment, userId);
            if (syncResult.success) {
              result.created_events++;
            } else {
              result.errors.push({
                type: 'api_error',
                message: syncResult.error || 'Unknown error',
                assignment_id: assignment.id,
                retryable: true
              });
            }
          }
        }
      }

      // Sync calendar events to assignments (if enabled)
      if (config.sync_direction === 'calendar_to_assignment' || config.sync_direction === 'bidirectional') {
        for (const event of calendarEvents) {
          const syncResult = await this.syncCalendarEventToAssignment(event, userId);
          if (syncResult.success) {
            result.created_assignments++;
          } else if (syncResult.error !== 'Event not detected as academic assignment') {
            result.errors.push({
              type: 'api_error',
              message: syncResult.error || 'Unknown error',
              calendar_event_id: event.id,
              retryable: true
            });
          }
        }
      }

      // Detect and resolve conflicts
      result.conflicts = await this.detectSyncConflicts(userId, assignments, calendarEvents);

    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'api_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      });
    }

    return result;
  }

  /**
   * Handle assignment updates and sync to calendar
   */
  async handleAssignmentUpdate(assignment: Assignment, userId: string): Promise<void> {
    const config = await this.getSyncConfiguration(userId);
    if (!config || !config.enabled || !config.auto_create_events) {
      return;
    }

    // Only sync if assignment type is configured for sync
    if (!config.sync_categories.includes(assignment.assignment_type as AssignmentType)) {
      return;
    }

    await this.syncAssignmentToCalendar(assignment, userId);
  }

  /**
   * Handle calendar event updates and sync to assignment
   */
  async handleCalendarEventUpdate(event: NormalizedCalendarEvent, userId: string): Promise<void> {
    const config = await this.getSyncConfiguration(userId);
    if (!config || !config.enabled || !config.auto_update_assignments) {
      return;
    }

    await this.syncCalendarEventToAssignment(event, userId);
  }

  /**
   * Delete calendar event when assignment is deleted
   */
  async handleAssignmentDeletion(assignmentId: string, userId: string): Promise<void> {
    const config = await this.getSyncConfiguration(userId);
    if (!config || !config.enabled) {
      return;
    }

    const mapping = await this.getCalendarEventMapping(assignmentId);
    if (mapping) {
      await this.deleteCalendarEvent(mapping.external_event_id, config);
      await this.deleteCalendarEventMapping(assignmentId);
    }
  }

  /**
   * Create calendar event from assignment data
   */
  private createCalendarEventFromAssignment(assignment: Assignment, config: SyncConfiguration): ProviderCalendarEventData {
    const eventTitle = `${assignment.assignment_type?.toUpperCase() || 'ASSIGNMENT'}: ${assignment.title}`;
    
    // Calculate event duration based on assignment type
    const duration = this.getEventDurationForAssignmentType(assignment.assignment_type as AssignmentType);
    const endTime = new Date(assignment.due_date);
    const startTime = new Date(endTime.getTime() - duration * 60000); // duration in minutes

    const event = {
      title: eventTitle,
      description: this.createEventDescription(assignment),
      start: startTime,
      end: endTime,
      location: assignment.submission_type === 'in_person' ? 'Classroom' : undefined,
      metadata: {
        assignment_id: assignment.id,
        assignment_type: assignment.assignment_type,
        priority: assignment.priority,
        progress: assignment.progress_percentage || 0,
        created_by: 'curious_dashboard'
      }
    };

    return event;
  }

  /**
   * Create assignment from calendar event data
   */
  private createAssignmentFromCalendarEvent(
    event: NormalizedCalendarEvent,
    detectionResult: AssignmentDetectionResult,
    userId: string
  ): AssignmentInsert {
    return {
      user_id: userId,
      title: detectionResult.suggested_data.title || event.title,
      description: event.description,
      due_date: event.start.toISOString(),
      assignment_type: detectionResult.suggested_data.assignment_type || 'assignment',
      submission_type: detectionResult.suggested_data.submission_type || 'online',
      priority: detectionResult.suggested_data.priority || 'Medium',
      status: 'Not Started',
      external_calendar_event_id: event.id,
      is_auto_detected: true,
      detection_confidence: detectionResult.confidence,
      academic_metadata: {
        source_calendar: event.provider,
        calendar_id: event.calendar_id,
        detection_reasons: detectionResult.detection_reasons,
        original_title: event.title
      },
      tags: detectionResult.suggested_data.tags || [],
      study_time_estimate: detectionResult.suggested_data.study_time_estimate
    };
  }

  /**
   * Create assignment update data from calendar event
   */
  private createAssignmentUpdateFromCalendarEvent(
    event: NormalizedCalendarEvent,
    detectionResult: AssignmentDetectionResult
  ): AssignmentUpdate {
    return {
      title: detectionResult.suggested_data.title || event.title,
      description: event.description,
      due_date: event.start.toISOString(),
      updated_at: new Date().toISOString(),
      academic_metadata: {
        last_calendar_sync: new Date().toISOString(),
        sync_source: event.provider
      }
    };
  }

  /**
   * Create event description with assignment metadata
   */
  private createEventDescription(assignment: Assignment): string {
    let description = assignment.description || '';
    
    description += '\n\n--- Assignment Details ---\n';
    description += `Type: ${assignment.assignment_type}\n`;
    description += `Priority: ${assignment.priority}\n`;
    description += `Status: ${assignment.status}\n`;
    
    if (assignment.progress_percentage !== null) {
      description += `Progress: ${assignment.progress_percentage}%\n`;
    }
    
    if (assignment.submission_url) {
      description += `Submission: ${assignment.submission_url}\n`;
    }
    
    description += '\n🎓 Created by Curious Dashboard';
    
    return description;
  }

  /**
   * Get event duration based on assignment type
   */
  private getEventDurationForAssignmentType(type: AssignmentType): number {
    const durations = {
      'assignment': 60,    // 1 hour
      'exam': 180,         // 3 hours
      'project': 240,      // 4 hours
      'quiz': 30,          // 30 minutes
      'presentation': 120, // 2 hours
      'lab': 180,          // 3 hours
      'homework': 60,      // 1 hour
      'paper': 120,        // 2 hours
      'discussion': 30     // 30 minutes
    };
    
    return durations[type] || 60;
  }

  /**
   * Get calendar events from configured provider
   */
  private async getCalendarEvents(config: SyncConfiguration): Promise<NormalizedCalendarEvent[]> {
    try {
      switch (config.provider) {
        case 'google':
          return await this.googleService.getCalendarEvents(config.calendar_id);
        case 'microsoft':
          return await this.microsoftService.getCalendarEvents(config.calendar_id);
        default:
          throw new Error(`Unsupported calendar provider: ${config.provider}`);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  /**
   * Create calendar event via provider API
   */
  private async createCalendarEvent(event: ProviderCalendarEventData, config: SyncConfiguration): Promise<string> {
    switch (config.provider) {
      case 'google':
        return await this.googleService.createEvent(config.calendar_id, event);
      case 'microsoft':
        return await this.microsoftService.createEvent(config.calendar_id, event);
      default:
        throw new Error(`Unsupported calendar provider: ${config.provider}`);
    }
  }

  /**
   * Update calendar event via provider API
   */
  private async updateCalendarEvent(
    mapping: CalendarEventMapping,
    event: ProviderCalendarEventData,
    config: SyncConfiguration
  ): Promise<string> {
    switch (config.provider) {
      case 'google':
        return await this.googleService.updateEvent(config.calendar_id, mapping.external_event_id, event);
      case 'microsoft':
        return await this.microsoftService.updateEvent(config.calendar_id, mapping.external_event_id, event);
      default:
        throw new Error(`Unsupported calendar provider: ${config.provider}`);
    }
  }

  /**
   * Delete calendar event via provider API
   */
  private async deleteCalendarEvent(eventId: string, config: SyncConfiguration): Promise<void> {
    switch (config.provider) {
      case 'google':
        await this.googleService.deleteEvent(config.calendar_id, eventId);
        break;
      case 'microsoft':
        await this.microsoftService.deleteEvent(config.calendar_id, eventId);
        break;
      default:
        throw new Error(`Unsupported calendar provider: ${config.provider}`);
    }
  }

  /**
   * Detect sync conflicts between assignments and calendar events
   */
  private async detectSyncConflicts(
    userId: string,
    assignments: Assignment[],
    calendarEvents: NormalizedCalendarEvent[]
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // Implementation would compare assignments with their corresponding calendar events
    // and detect mismatches in title, date, description, etc.
    
    return conflicts;
  }

  /**
   * Database operations for sync configuration and mappings
   */
  private async getSyncConfiguration(userId: string): Promise<SyncConfiguration | null> {
    // Implementation would fetch from database
    return this.syncConfigurations.get(userId) || null;
  }

  private async storeSyncConfiguration(userId: string, config: SyncConfiguration): Promise<void> {
    // Implementation would store in database
  }

  private async getCalendarEventMapping(assignmentId: string): Promise<CalendarEventMapping | null> {
    // Implementation would fetch from database
    return null;
  }

  private async getAssignmentByCalendarEvent(calendarEventId: string): Promise<Assignment | null> {
    // Implementation would fetch from database
    return null;
  }

  private async storeCalendarEventMapping(mapping: CalendarEventMapping): Promise<void> {
    // Implementation would store in database
  }

  private async deleteCalendarEventMapping(assignmentId: string): Promise<void> {
    // Implementation would delete from database
  }
}

// Export singleton instance
export const assignmentCalendarSyncService = new AssignmentCalendarSyncService();