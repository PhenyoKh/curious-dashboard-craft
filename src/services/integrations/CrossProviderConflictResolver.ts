/**
 * Cross-Provider Conflict Resolver - Handles conflicts between Google and Microsoft Calendar integrations
 */

import { supabase } from '@/integrations/supabase/client';
import { ConflictResolutionService, SyncConflict, ConflictResolutionStrategy } from '@/services/integrations/google/ConflictResolutionService';
import { GoogleCalendarEventData } from '@/services/integrations/google/GoogleCalendarService';
import { MicrosoftCalendarEventData } from '@/services/integrations/microsoft/MicrosoftCalendarService';
import { logger } from '@/utils/logger';

// Local event from database with sync mappings
export interface LocalEventWithSync {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  location?: string;
  is_all_day: boolean;
  external_calendar_id?: string;
  external_event_id?: string;
  sync_status?: 'local' | 'synced' | 'conflict' | 'deleted' | 'error';
  created_at: string;
  updated_at: string;
  google_mapping?: Array<{
    calendar_integration_id: string;
    external_event_id: string;
    microsoft_change_key?: string;
  }>;
}

// Union type for events from different providers
export type CrossProviderEvent = LocalEventWithSync;

// Grouped events for conflict analysis
export interface EventGroup {
  [key: string]: CrossProviderEvent[];
}

export interface CrossProviderConflict {
  id: string;
  user_id: string;
  local_event_id: string;
  google_event_data?: GoogleCalendarEventData;
  microsoft_event_data?: MicrosoftCalendarEventData;
  conflict_type: 'duplicate_event' | 'time_mismatch' | 'content_mismatch' | 'provider_priority';
  conflict_description: string;
  google_integration_id?: string;
  microsoft_integration_id?: string;
  resolution_status: 'pending' | 'resolved' | 'ignored';
  resolution_choice?: 'keep_google' | 'keep_microsoft' | 'merge' | 'create_separate';
  auto_resolution_rule?: 'google_priority' | 'microsoft_priority' | 'newest_wins' | 'manual_only';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CrossProviderResolutionStrategy {
  defaultProvider: 'google' | 'microsoft' | 'manual';
  duplicateHandling: 'merge' | 'separate' | 'priority_based';
  conflictStrategy: 'auto_resolve' | 'manual_review' | 'smart_merge';
  timeConflictResolution: 'google_wins' | 'microsoft_wins' | 'newest_wins' | 'manual';
  contentMergeStrategy: 'combine_descriptions' | 'keep_longest' | 'manual_merge';
}

export interface CrossProviderSyncResult {
  conflicts_detected: number;
  auto_resolved: number;
  manual_review_required: number;
  duplicates_merged: number;
  errors: string[];
}

export class CrossProviderConflictResolver {
  private static instance: CrossProviderConflictResolver;
  private conflictService: ConflictResolutionService;

  private constructor() {
    this.conflictService = ConflictResolutionService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CrossProviderConflictResolver {
    if (!CrossProviderConflictResolver.instance) {
      CrossProviderConflictResolver.instance = new CrossProviderConflictResolver();
    }
    return CrossProviderConflictResolver.instance;
  }

  /**
   * Detect conflicts between Google and Microsoft Calendar events
   */
  async detectCrossProviderConflicts(userId: string): Promise<CrossProviderConflict[]> {
    try {
      // Get all events with external calendar IDs
      const { data: events, error } = await supabase
        .from('schedule_events')
        .select(`
          *,
          google_mapping:event_sync_mappings!local_event_id(
            calendar_integration_id,
            external_event_id,
            microsoft_change_key
          )
        `)
        .eq('user_id', userId)
        .not('external_calendar_id', 'is', null);

      if (error) throw error;

      const conflicts: CrossProviderConflict[] = [];
      const eventGroups = this.groupEventsByTimeAndTitle(events || []);

      // Detect duplicate events across providers
      for (const group of eventGroups) {
        if (group.length > 1) {
          const conflict = await this.analyzePotentialDuplicate(userId, group);
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }

      return conflicts;
    } catch (error) {
      logger.error('Error detecting cross-provider conflicts:', error);
      throw new Error('Failed to detect cross-provider conflicts');
    }
  }

  /**
   * Group events by time and title to detect duplicates
   */
  private groupEventsByTimeAndTitle(events: CrossProviderEvent[]): CrossProviderEvent[][] {
    const groups: EventGroup = {};

    for (const event of events) {
      // Create a key based on title, start time, and duration
      const startTime = new Date(event.start_time).getTime();
      const endTime = new Date(event.end_time).getTime();
      const duration = endTime - startTime;
      const title = event.title.toLowerCase().trim();
      
      // Round to nearest 15 minutes to account for small time differences
      const roundedStart = Math.round(startTime / (15 * 60 * 1000)) * (15 * 60 * 1000);
      
      const key = `${title}|${roundedStart}|${duration}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    }

    return Object.values(groups).filter(group => group.length > 1);
  }

  /**
   * Analyze a group of potential duplicate events
   */
  private async analyzePotentialDuplicate(userId: string, events: CrossProviderEvent[]): Promise<CrossProviderConflict | null> {
    try {
      // Check if events are from different providers
      const providers = new Set(events.map(e => this.getProviderFromIntegrationId(e.external_calendar_id)));
      
      if (providers.size <= 1) {
        return null; // Not a cross-provider conflict
      }

      const googleEvent = events.find(e => this.getProviderFromIntegrationId(e.external_calendar_id) === 'google');
      const microsoftEvent = events.find(e => this.getProviderFromIntegrationId(e.external_calendar_id) === 'microsoft');

      if (!googleEvent || !microsoftEvent) {
        return null;
      }

      // Analyze the type of conflict
      const conflictType = this.determineConflictType(googleEvent, microsoftEvent);
      const conflictDescription = this.generateConflictDescription(conflictType, googleEvent, microsoftEvent);

      return {
        id: `cross_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        local_event_id: googleEvent.id, // Use the first event as reference
        google_event_data: await this.getEventDetails(googleEvent, 'google'),
        microsoft_event_data: await this.getEventDetails(microsoftEvent, 'microsoft'),
        conflict_type: conflictType,
        conflict_description: conflictDescription,
        google_integration_id: googleEvent.external_calendar_id,
        microsoft_integration_id: microsoftEvent.external_calendar_id,
        resolution_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error analyzing potential duplicate:', error);
      return null;
    }
  }

  /**
   * Determine the type of conflict between two events
   */
  private determineConflictType(event1: CrossProviderEvent, event2: CrossProviderEvent): CrossProviderConflict['conflict_type'] {
    // Check for exact time match
    const time1Start = new Date(event1.start_time).getTime();
    const time1End = new Date(event1.end_time).getTime();
    const time2Start = new Date(event2.start_time).getTime();
    const time2End = new Date(event2.end_time).getTime();

    const timeDiffStart = Math.abs(time1Start - time2Start);
    const timeDiffEnd = Math.abs(time1End - time2End);

    // If times are very close (within 5 minutes), consider it a duplicate
    if (timeDiffStart <= 5 * 60 * 1000 && timeDiffEnd <= 5 * 60 * 1000) {
      // Check content similarity
      const titleSimilarity = this.calculateStringSimilarity(event1.title, event2.title);
      const descSimilarity = this.calculateStringSimilarity(
        event1.description || '', 
        event2.description || ''
      );

      if (titleSimilarity > 0.8 && descSimilarity > 0.6) {
        return 'duplicate_event';
      } else {
        return 'content_mismatch';
      }
    } else {
      return 'time_mismatch';
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate a human-readable conflict description
   */
  private generateConflictDescription(
    type: CrossProviderConflict['conflict_type'], 
    event1: CrossProviderEvent, 
    event2: CrossProviderEvent
  ): string {
    switch (type) {
      case 'duplicate_event':
        return `Similar events found in both Google Calendar and Microsoft Calendar: "${event1.title}"`;
      case 'time_mismatch':
        return `Events with same title have different times across providers: "${event1.title}"`;
      case 'content_mismatch':
        return `Events at same time have different content across providers`;
      case 'provider_priority':
        return `Conflicting events require provider priority resolution`;
      default:
        return 'Cross-provider conflict detected';
    }
  }

  /**
   * Get provider from integration ID
   */
  private getProviderFromIntegrationId(integrationId: string): 'google' | 'microsoft' | 'unknown' {
    // This would typically query the calendar_integrations table
    // For now, we'll use a simple heuristic
    return 'unknown';
  }

  /**
   * Get detailed event information
   */
  private async getEventDetails(event: CrossProviderEvent, provider: 'google' | 'microsoft'): Promise<GoogleCalendarEventData | MicrosoftCalendarEventData> {
    // This would fetch the full event details from the respective provider
    // For now, convert local event to provider format
    if (provider === 'google') {
      return {
        id: event.external_event_id,
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start_time,
          timeZone: event.timezone
        },
        end: {
          dateTime: event.end_time,
          timeZone: event.timezone
        },
        location: event.location
      } as GoogleCalendarEventData;
    } else {
      return {
        id: event.external_event_id,
        subject: event.title,
        body: event.description ? {
          contentType: 'text' as const,
          content: event.description
        } : undefined,
        start: {
          dateTime: event.start_time,
          timeZone: event.timezone
        },
        end: {
          dateTime: event.end_time,
          timeZone: event.timezone
        },
        location: event.location ? {
          displayName: event.location
        } : undefined
      } as MicrosoftCalendarEventData;
    }
  }

  /**
   * Resolve cross-provider conflicts automatically
   */
  async resolveCrossProviderConflicts(
    userId: string,
    strategy: CrossProviderResolutionStrategy
  ): Promise<CrossProviderSyncResult> {
    try {
      const conflicts = await this.detectCrossProviderConflicts(userId);
      
      const result: CrossProviderSyncResult = {
        conflicts_detected: conflicts.length,
        auto_resolved: 0,
        manual_review_required: 0,
        duplicates_merged: 0,
        errors: []
      };

      for (const conflict of conflicts) {
        try {
          const resolved = await this.resolveConflict(conflict, strategy);
          if (resolved) {
            result.auto_resolved++;
            if (conflict.conflict_type === 'duplicate_event') {
              result.duplicates_merged++;
            }
          } else {
            result.manual_review_required++;
          }
        } catch (error) {
          result.errors.push(`Failed to resolve conflict ${conflict.id}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error resolving cross-provider conflicts:', error);
      throw new Error('Failed to resolve cross-provider conflicts');
    }
  }

  /**
   * Resolve a single cross-provider conflict
   */
  private async resolveConflict(
    conflict: CrossProviderConflict,
    strategy: CrossProviderResolutionStrategy
  ): Promise<boolean> {
    switch (conflict.conflict_type) {
      case 'duplicate_event':
        return this.resolveDuplicateEvent(conflict, strategy);
      case 'time_mismatch':
        return this.resolveTimeMismatch(conflict, strategy);
      case 'content_mismatch':
        return this.resolveContentMismatch(conflict, strategy);
      default:
        return false; // Requires manual resolution
    }
  }

  /**
   * Resolve duplicate event conflicts
   */
  private async resolveDuplicateEvent(
    conflict: CrossProviderConflict,
    strategy: CrossProviderResolutionStrategy
  ): Promise<boolean> {
    try {
      switch (strategy.duplicateHandling) {
        case 'merge':
          await this.mergeDuplicateEvents(conflict);
          return true;
        case 'priority_based':
          await this.resolvePriorityBased(conflict, strategy.defaultProvider);
          return true;
        case 'separate':
          // Keep both events separate
          return true;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error resolving duplicate event:', error);
      return false;
    }
  }

  /**
   * Resolve time mismatch conflicts
   */
  private async resolveTimeMismatch(
    conflict: CrossProviderConflict,
    strategy: CrossProviderResolutionStrategy
  ): Promise<boolean> {
    try {
      switch (strategy.timeConflictResolution) {
        case 'google_wins':
          await this.updateEventFromProvider(conflict, 'google');
          return true;
        case 'microsoft_wins':
          await this.updateEventFromProvider(conflict, 'microsoft');
          return true;
        case 'newest_wins':
          await this.updateFromNewestEvent(conflict);
          return true;
        default:
          return false; // Manual resolution required
      }
    } catch (error) {
      logger.error('Error resolving time mismatch:', error);
      return false;
    }
  }

  /**
   * Resolve content mismatch conflicts
   */
  private async resolveContentMismatch(
    conflict: CrossProviderConflict,
    strategy: CrossProviderResolutionStrategy
  ): Promise<boolean> {
    try {
      switch (strategy.contentMergeStrategy) {
        case 'combine_descriptions':
          await this.combineEventDescriptions(conflict);
          return true;
        case 'keep_longest':
          await this.keepLongestDescription(conflict);
          return true;
        default:
          return false; // Manual resolution required
      }
    } catch (error) {
      logger.error('Error resolving content mismatch:', error);
      return false;
    }
  }

  /**
   * Merge duplicate events into a single event
   */
  private async mergeDuplicateEvents(conflict: CrossProviderConflict): Promise<void> {
    // Implementation would merge the two events
    // This is a complex operation that would need to:
    // 1. Combine information from both events
    // 2. Update sync mappings
    // 3. Delete redundant events
    // 4. Update external calendars
  }

  /**
   * Resolve conflict based on provider priority
   */
  private async resolvePriorityBased(
    conflict: CrossProviderConflict,
    preferredProvider: 'google' | 'microsoft' | 'manual'
  ): Promise<void> {
    if (preferredProvider === 'manual') {
      throw new Error('Manual resolution required');
    }

    await this.updateEventFromProvider(conflict, preferredProvider);
  }

  /**
   * Update event information from specified provider
   */
  private async updateEventFromProvider(
    conflict: CrossProviderConflict,
    provider: 'google' | 'microsoft'
  ): Promise<void> {
    // Implementation would update the local event with data from the specified provider
  }

  /**
   * Update event with information from the newest version
   */
  private async updateFromNewestEvent(conflict: CrossProviderConflict): Promise<void> {
    // Implementation would compare timestamps and use the newest version
  }

  /**
   * Combine descriptions from both events
   */
  private async combineEventDescriptions(conflict: CrossProviderConflict): Promise<void> {
    // Implementation would merge descriptions from both providers
  }

  /**
   * Keep the longest description
   */
  private async keepLongestDescription(conflict: CrossProviderConflict): Promise<void> {
    // Implementation would compare description lengths and keep the longer one
  }

  /**
   * Get cross-provider conflict statistics
   */
  async getCrossProviderConflictStats(userId: string): Promise<{
    total: number;
    duplicates: number;
    timeMismatches: number;
    contentMismatches: number;
    pending: number;
    resolved: number;
  }> {
    try {
      const conflicts = await this.detectCrossProviderConflicts(userId);
      
      return {
        total: conflicts.length,
        duplicates: conflicts.filter(c => c.conflict_type === 'duplicate_event').length,
        timeMismatches: conflicts.filter(c => c.conflict_type === 'time_mismatch').length,
        contentMismatches: conflicts.filter(c => c.conflict_type === 'content_mismatch').length,
        pending: conflicts.filter(c => c.resolution_status === 'pending').length,
        resolved: conflicts.filter(c => c.resolution_status === 'resolved').length
      };
    } catch (error) {
      logger.error('Error getting cross-provider conflict stats:', error);
      return {
        total: 0,
        duplicates: 0,
        timeMismatches: 0,
        contentMismatches: 0,
        pending: 0,
        resolved: 0
      };
    }
  }

  /**
   * Get recommended resolution strategy based on user preferences
   */
  getRecommendedStrategy(userId: string): CrossProviderResolutionStrategy {
    // This would typically be based on user preferences stored in the database
    return {
      defaultProvider: 'manual',
      duplicateHandling: 'merge',
      conflictStrategy: 'smart_merge',
      timeConflictResolution: 'newest_wins',
      contentMergeStrategy: 'combine_descriptions'
    };
  }
}