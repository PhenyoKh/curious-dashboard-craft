/**
 * Conflict Resolution Service - Handles synchronization conflicts between local and Google Calendar events
 */

import { supabase } from '@/integrations/supabase/client';
import { GoogleCalendarEventData } from './GoogleCalendarService';
import { LocalEvent } from './EventMappingService';

export interface SyncConflict {
  id: string;
  user_id: string;
  event_sync_mapping_id: string;
  conflict_type: 'time_mismatch' | 'content_mismatch' | 'deletion_conflict' | 'creation_conflict';
  conflict_description: string;
  local_event_data: LocalEvent;
  external_event_data: GoogleCalendarEventData;
  resolution_status: 'pending' | 'resolved' | 'ignored';
  resolution_choice?: 'keep_local' | 'keep_external' | 'merge' | 'ignore';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConflictResolutionStrategy {
  type: 'manual' | 'automatic';
  autoResolutionRule?: 'local_wins' | 'external_wins' | 'newest_wins' | 'longest_wins';
  fieldPriorities?: {
    title: 'local' | 'external' | 'newest';
    description: 'local' | 'external' | 'newest';
    time: 'local' | 'external' | 'newest';
    location: 'local' | 'external' | 'newest';
    reminders: 'local' | 'external' | 'newest';
  };
}

export interface ConflictAnalysis {
  conflictType: SyncConflict['conflict_type'];
  description: string;
  affectedFields: string[];
  severity: 'low' | 'medium' | 'high';
  autoResolvable: boolean;
  suggestedResolution?: 'keep_local' | 'keep_external' | 'merge';
}

export interface ConflictResolutionResult {
  success: boolean;
  resolvedEvent?: LocalEvent;
  error?: string;
  appliedChanges: string[];
}

export class ConflictResolutionService {
  private static instance: ConflictResolutionService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }

  /**
   * Analyze conflicts between local and external events
   */
  analyzeConflict(
    localEvent: LocalEvent,
    externalEvent: GoogleCalendarEventData
  ): ConflictAnalysis {
    const affectedFields: string[] = [];
    let conflictType: SyncConflict['conflict_type'] = 'content_mismatch';
    let severity: ConflictAnalysis['severity'] = 'low';

    // Check title conflicts
    if (localEvent.title !== externalEvent.summary) {
      affectedFields.push('title');
    }

    // Check description conflicts
    const localDesc = localEvent.description || '';
    const externalDesc = externalEvent.description || '';
    if (localDesc !== externalDesc) {
      affectedFields.push('description');
    }

    // Check time conflicts
    const localStart = new Date(localEvent.start_time);
    const localEnd = new Date(localEvent.end_time);
    const externalStart = new Date(externalEvent.start.dateTime);
    const externalEnd = new Date(externalEvent.end.dateTime);

    if (localStart.getTime() !== externalStart.getTime() || 
        localEnd.getTime() !== externalEnd.getTime()) {
      affectedFields.push('time');
      conflictType = 'time_mismatch';
      severity = 'high'; // Time conflicts are more critical
    }

    // Check location conflicts
    const localLocation = localEvent.location || '';
    const externalLocation = externalEvent.location || '';
    if (localLocation !== externalLocation) {
      affectedFields.push('location');
    }

    // Determine severity and auto-resolvability
    const isAutoResolvable = severity !== 'high' && affectedFields.length <= 2;
    
    if (affectedFields.length > 3) {
      severity = 'high';
    } else if (affectedFields.includes('time')) {
      severity = 'high';
    } else if (affectedFields.length > 1) {
      severity = 'medium';
    }

    // Suggest resolution based on conflict analysis
    let suggestedResolution: ConflictAnalysis['suggestedResolution'];
    if (conflictType === 'time_mismatch') {
      suggestedResolution = this.getNewestEvent(localEvent, externalEvent) === 'local' ? 'keep_local' : 'keep_external';
    } else if (affectedFields.length === 1) {
      suggestedResolution = 'merge';
    } else {
      suggestedResolution = this.getNewestEvent(localEvent, externalEvent) === 'local' ? 'keep_local' : 'keep_external';
    }

    return {
      conflictType,
      description: this.generateConflictDescription(affectedFields, conflictType),
      affectedFields,
      severity,
      autoResolvable: isAutoResolvable,
      suggestedResolution
    };
  }

  /**
   * Create a conflict record in the database
   */
  async createConflict(
    userId: string,
    mappingId: string,
    localEvent: LocalEvent,
    externalEvent: GoogleCalendarEventData,
    analysis: ConflictAnalysis
  ): Promise<string> {
    const { data, error } = await supabase
      .from('sync_conflicts')
      .insert({
        user_id: userId,
        event_sync_mapping_id: mappingId,
        conflict_type: analysis.conflictType,
        conflict_description: analysis.description,
        local_event_data: localEvent,
        external_event_data: externalEvent,
        resolution_status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Get pending conflicts for a user
   */
  async getPendingConflicts(userId: string): Promise<SyncConflict[]> {
    const { data, error } = await supabase
      .from('sync_conflicts')
      .select('*')
      .eq('user_id', userId)
      .eq('resolution_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get conflict by ID
   */
  async getConflict(conflictId: string): Promise<SyncConflict | null> {
    const { data, error } = await supabase
      .from('sync_conflicts')
      .select('*')
      .eq('id', conflictId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflictManually(
    conflictId: string,
    userId: string,
    resolution: 'keep_local' | 'keep_external' | 'merge' | 'ignore',
    mergedData?: Partial<LocalEvent>
  ): Promise<ConflictResolutionResult> {
    try {
      const conflict = await this.getConflict(conflictId);
      if (!conflict) {
        return { success: false, error: 'Conflict not found' };
      }

      let resolvedEvent: LocalEvent;
      const appliedChanges: string[] = [];

      switch (resolution) {
        case 'keep_local':
          resolvedEvent = conflict.local_event_data;
          appliedChanges.push('Kept local event data');
          break;

        case 'keep_external':
          resolvedEvent = await this.convertExternalToLocal(
            conflict.external_event_data,
            conflict.local_event_data
          );
          appliedChanges.push('Applied external event data');
          break;

        case 'merge':
          if (!mergedData) {
            return { success: false, error: 'Merged data required for merge resolution' };
          }
          resolvedEvent = { ...conflict.local_event_data, ...mergedData };
          appliedChanges.push('Merged local and external data');
          break;

        case 'ignore':
          resolvedEvent = conflict.local_event_data;
          appliedChanges.push('Ignored conflict - kept local data');
          break;

        default:
          return { success: false, error: 'Invalid resolution type' };
      }

      // Update the local event
      await this.updateLocalEvent(conflict.local_event_data.id, resolvedEvent);

      // Mark conflict as resolved
      await this.markConflictResolved(conflictId, userId, resolution);

      return {
        success: true,
        resolvedEvent,
        appliedChanges
      };
    } catch (error) {
      console.error('Error resolving conflict manually:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Apply automatic conflict resolution
   */
  async resolveConflictAutomatically(
    conflict: SyncConflict,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolutionResult> {
    try {
      if (strategy.type !== 'automatic' || !strategy.autoResolutionRule) {
        return { success: false, error: 'Invalid automatic resolution strategy' };
      }

      const analysis = this.analyzeConflict(
        conflict.local_event_data,
        conflict.external_event_data
      );

      if (!analysis.autoResolvable) {
        return { success: false, error: 'Conflict is not auto-resolvable' };
      }

      let resolution: 'keep_local' | 'keep_external' | 'merge';
      const appliedChanges: string[] = [];

      switch (strategy.autoResolutionRule) {
        case 'local_wins':
          resolution = 'keep_local';
          break;

        case 'external_wins':
          resolution = 'keep_external';
          break;

        case 'newest_wins':
          resolution = this.getNewestEvent(
            conflict.local_event_data,
            conflict.external_event_data
          ) === 'local' ? 'keep_local' : 'keep_external';
          break;

        case 'longest_wins':
          resolution = this.getLongestEvent(
            conflict.local_event_data,
            conflict.external_event_data
          ) === 'local' ? 'keep_local' : 'keep_external';
          break;

        default:
          return { success: false, error: 'Unknown auto-resolution rule' };
      }

      return this.resolveConflictManually(
        conflict.id,
        conflict.user_id,
        resolution
      );
    } catch (error) {
      console.error('Error resolving conflict automatically:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Apply smart merge resolution using field priorities
   */
  async resolveConflictWithSmartMerge(
    conflict: SyncConflict,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolutionResult> {
    try {
      if (!strategy.fieldPriorities) {
        return { success: false, error: 'Field priorities required for smart merge' };
      }

      const localEvent = conflict.local_event_data;
      const externalEvent = conflict.external_event_data;
      const priorities = strategy.fieldPriorities;
      const appliedChanges: string[] = [];

      const mergedEvent: Partial<LocalEvent> = { ...localEvent };

      // Merge title
      if (priorities.title === 'external') {
        mergedEvent.title = externalEvent.summary;
        appliedChanges.push('Used external title');
      } else if (priorities.title === 'newest') {
        const newestSource = this.getNewestEvent(localEvent, externalEvent);
        if (newestSource === 'external') {
          mergedEvent.title = externalEvent.summary;
          appliedChanges.push('Used newest title (external)');
        }
      }

      // Merge description
      if (priorities.description === 'external') {
        mergedEvent.description = externalEvent.description || '';
        appliedChanges.push('Used external description');
      } else if (priorities.description === 'newest') {
        const newestSource = this.getNewestEvent(localEvent, externalEvent);
        if (newestSource === 'external') {
          mergedEvent.description = externalEvent.description || '';
          appliedChanges.push('Used newest description (external)');
        }
      }

      // Merge time
      if (priorities.time === 'external') {
        mergedEvent.start_time = externalEvent.start.dateTime;
        mergedEvent.end_time = externalEvent.end.dateTime;
        appliedChanges.push('Used external time');
      } else if (priorities.time === 'newest') {
        const newestSource = this.getNewestEvent(localEvent, externalEvent);
        if (newestSource === 'external') {
          mergedEvent.start_time = externalEvent.start.dateTime;
          mergedEvent.end_time = externalEvent.end.dateTime;
          appliedChanges.push('Used newest time (external)');
        }
      }

      // Merge location
      if (priorities.location === 'external') {
        mergedEvent.location = externalEvent.location || '';
        appliedChanges.push('Used external location');
      } else if (priorities.location === 'newest') {
        const newestSource = this.getNewestEvent(localEvent, externalEvent);
        if (newestSource === 'external') {
          mergedEvent.location = externalEvent.location || '';
          appliedChanges.push('Used newest location (external)');
        }
      }

      return this.resolveConflictManually(
        conflict.id,
        conflict.user_id,
        'merge',
        mergedEvent
      );
    } catch (error) {
      console.error('Error resolving conflict with smart merge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch resolve multiple conflicts
   */
  async batchResolveConflicts(
    conflictIds: string[],
    userId: string,
    strategy: ConflictResolutionStrategy
  ): Promise<{ resolved: number; failed: number; errors: string[] }> {
    let resolved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const conflictId of conflictIds) {
      try {
        const conflict = await this.getConflict(conflictId);
        if (!conflict) {
          failed++;
          errors.push(`Conflict ${conflictId} not found`);
          continue;
        }

        let result: ConflictResolutionResult;

        if (strategy.type === 'automatic') {
          result = await this.resolveConflictAutomatically(conflict, strategy);
        } else if (strategy.fieldPriorities) {
          result = await this.resolveConflictWithSmartMerge(conflict, strategy);
        } else {
          failed++;
          errors.push(`Invalid strategy for conflict ${conflictId}`);
          continue;
        }

        if (result.success) {
          resolved++;
        } else {
          failed++;
          errors.push(`Failed to resolve conflict ${conflictId}: ${result.error}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Error processing conflict ${conflictId}: ${error}`);
      }
    }

    return { resolved, failed, errors };
  }

  /**
   * Get conflict statistics for a user
   */
  async getConflictStatistics(userId: string): Promise<{
    total: number;
    pending: number;
    resolved: number;
    ignored: number;
    byType: { [key: string]: number };
  }> {
    const { data, error } = await supabase
      .from('sync_conflicts')
      .select('conflict_type, resolution_status')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: 0,
      resolved: 0,
      ignored: 0,
      byType: {} as { [key: string]: number }
    };

    data.forEach(conflict => {
      // Count by status
      if (conflict.resolution_status === 'pending') stats.pending++;
      else if (conflict.resolution_status === 'resolved') stats.resolved++;
      else if (conflict.resolution_status === 'ignored') stats.ignored++;

      // Count by type
      stats.byType[conflict.conflict_type] = (stats.byType[conflict.conflict_type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Private helper methods
   */
  private getNewestEvent(
    localEvent: LocalEvent,
    externalEvent: GoogleCalendarEventData
  ): 'local' | 'external' {
    const localUpdated = new Date(localEvent.updated_at);
    const externalUpdated = new Date(externalEvent.updated || externalEvent.start.dateTime);
    
    return localUpdated > externalUpdated ? 'local' : 'external';
  }

  private getLongestEvent(
    localEvent: LocalEvent,
    externalEvent: GoogleCalendarEventData
  ): 'local' | 'external' {
    const localDuration = new Date(localEvent.end_time).getTime() - new Date(localEvent.start_time).getTime();
    const externalDuration = new Date(externalEvent.end.dateTime).getTime() - new Date(externalEvent.start.dateTime).getTime();
    
    return localDuration >= externalDuration ? 'local' : 'external';
  }

  private generateConflictDescription(
    affectedFields: string[],
    conflictType: SyncConflict['conflict_type']
  ): string {
    if (conflictType === 'time_mismatch') {
      return 'Event times differ between local and Google Calendar';
    }

    if (affectedFields.length === 1) {
      return `Event ${affectedFields[0]} differs between local and Google Calendar`;
    }

    return `Multiple fields differ: ${affectedFields.join(', ')}`;
  }

  private async convertExternalToLocal(
    externalEvent: GoogleCalendarEventData,
    templateEvent: LocalEvent
  ): Promise<LocalEvent> {
    // Convert external event to local format using template for user-specific fields
    return {
      ...templateEvent,
      title: externalEvent.summary,
      description: externalEvent.description || '',
      start_time: externalEvent.start.dateTime,
      end_time: externalEvent.end.dateTime,
      location: externalEvent.location || '',
      updated_at: new Date().toISOString()
    };
  }

  private async updateLocalEvent(eventId: string, eventData: Partial<LocalEvent>): Promise<void> {
    const { error } = await supabase
      .from('schedule_events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (error) throw error;
  }

  private async markConflictResolved(
    conflictId: string,
    userId: string,
    resolution: string
  ): Promise<void> {
    const { error } = await supabase
      .from('sync_conflicts')
      .update({
        resolution_status: 'resolved',
        resolution_choice: resolution,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conflictId);

    if (error) throw error;
  }
}