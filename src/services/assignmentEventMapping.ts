/**
 * Assignment Event Mapping Service
 * 
 * Enhanced service for managing the mapping between assignments and calendar events.
 * Provides sophisticated mapping capabilities, conflict resolution, and data synchronization.
 */

import { assignmentsService, subjectsService, semestersService } from './supabaseService';
import { assignmentDetectionEngine } from './assignmentDetectionEngine';
import { assignmentCalendarSyncService } from './assignmentCalendarSync';
import type { 
  Assignment, 
  EnhancedAssignment,
  CalendarEventMapping,
  AssignmentDetectionResult,
  AcademicMetadata,
  AssignmentFormData
} from '../types/assignments';

// Enhanced mapping with metadata
export interface EnhancedEventMapping extends CalendarEventMapping {
  assignment_title?: string;
  assignment_type?: string;
  subject_name?: string;
  sync_confidence?: number;
  last_conflict_resolved?: Date;
  mapping_metadata?: {
    auto_created: boolean;
    detection_method: 'keyword' | 'pattern' | 'manual' | 'ai_suggestion';
    sync_quality_score: number;
    last_validation: Date;
  };
}

// Mapping conflict types
export type MappingConflictType = 
  | 'title_mismatch'
  | 'due_date_mismatch' 
  | 'description_mismatch'
  | 'deletion_conflict'
  | 'duplicate_mapping'
  | 'orphaned_event'
  | 'orphaned_assignment';

export interface MappingConflict {
  id: string;
  type: MappingConflictType;
  assignment_id?: string;
  calendar_event_id?: string;
  assignment_data?: Partial<Assignment>;
  calendar_data?: any;
  suggested_resolution: 'merge' | 'keep_assignment' | 'keep_calendar' | 'manual_review';
  confidence: number;
  auto_resolvable: boolean;
  created_at: Date;
}

// Mapping validation result
export interface MappingValidationResult {
  is_valid: boolean;
  confidence_score: number;
  issues: Array<{
    type: 'data_mismatch' | 'stale_mapping' | 'provider_error' | 'permission_issue';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggested_fix?: string;
  }>;
  last_validated: Date;
}

// Batch mapping operation
export interface BatchMappingOperation {
  operation: 'create' | 'update' | 'delete' | 'validate' | 'resolve_conflicts';
  mappings: string[];
  options?: {
    force_sync?: boolean;
    resolve_conflicts_automatically?: boolean;
    validation_level?: 'basic' | 'thorough' | 'deep';
  };
}

export class AssignmentEventMappingService {
  private mappings: Map<string, EnhancedEventMapping> = new Map();
  private conflicts: Map<string, MappingConflict> = new Map();

  /**
   * Create a new assignment-calendar event mapping
   */
  async createMapping(
    assignmentId: string,
    calendarEventId: string,
    provider: 'google' | 'microsoft' | 'apple',
    calendarId: string,
    metadata?: {
      auto_created?: boolean;
      detection_method?: 'keyword' | 'pattern' | 'manual' | 'ai_suggestion';
      confidence?: number;
    }
  ): Promise<EnhancedEventMapping> {
    try {
      // Validate assignment exists
      const assignment = await assignmentsService.getAssignmentById(assignmentId);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Check for existing mappings to prevent duplicates
      const existingMapping = await this.getMappingByAssignment(assignmentId);
      if (existingMapping) {
        throw new Error('Assignment already has a calendar event mapping');
      }

      // Create enhanced mapping
      const mapping: EnhancedEventMapping = {
        assignment_id: assignmentId,
        external_calendar_id: calendarId,
        external_event_id: calendarEventId,
        provider,
        last_synced: new Date(),
        sync_status: 'synced',
        assignment_title: assignment.title,
        assignment_type: assignment.assignment_type || undefined,
        sync_confidence: metadata?.confidence || 0.8,
        mapping_metadata: {
          auto_created: metadata?.auto_created || false,
          detection_method: metadata?.detection_method || 'manual',
          sync_quality_score: this.calculateSyncQualityScore(assignment, metadata),
          last_validation: new Date()
        }
      };

      // Store mapping
      await this.storeMappingInDatabase(mapping);
      this.mappings.set(assignmentId, mapping);

      return mapping;

    } catch (error) {
      console.error('Error creating mapping:', error);
      throw error;
    }
  }

  /**
   * Update an existing mapping
   */
  async updateMapping(
    assignmentId: string,
    updates: Partial<EnhancedEventMapping>
  ): Promise<EnhancedEventMapping> {
    const existingMapping = await this.getMappingByAssignment(assignmentId);
    if (!existingMapping) {
      throw new Error('Mapping not found');
    }

    const updatedMapping: EnhancedEventMapping = {
      ...existingMapping,
      ...updates,
      last_synced: new Date(),
      mapping_metadata: {
        ...existingMapping.mapping_metadata,
        ...updates.mapping_metadata,
        last_validation: new Date()
      }
    };

    await this.storeMappingInDatabase(updatedMapping);
    this.mappings.set(assignmentId, updatedMapping);

    return updatedMapping;
  }

  /**
   * Delete a mapping
   */
  async deleteMapping(assignmentId: string): Promise<void> {
    const mapping = await this.getMappingByAssignment(assignmentId);
    if (!mapping) {
      return; // Already deleted
    }

    // Delete from database
    await this.deleteMappingFromDatabase(assignmentId);
    
    // Remove from cache
    this.mappings.delete(assignmentId);
  }

  /**
   * Get mapping by assignment ID
   */
  async getMappingByAssignment(assignmentId: string): Promise<EnhancedEventMapping | null> {
    // Check cache first
    if (this.mappings.has(assignmentId)) {
      return this.mappings.get(assignmentId)!;
    }

    // Load from database
    const mapping = await this.loadMappingFromDatabase(assignmentId);
    if (mapping) {
      this.mappings.set(assignmentId, mapping);
    }

    return mapping;
  }

  /**
   * Get mapping by calendar event ID
   */
  async getMappingByCalendarEvent(
    calendarEventId: string,
    provider: 'google' | 'microsoft' | 'apple'
  ): Promise<EnhancedEventMapping | null> {
    // Load all mappings and find match
    const allMappings = await this.getAllMappings();
    return allMappings.find(mapping => 
      mapping.external_event_id === calendarEventId && 
      mapping.provider === provider
    ) || null;
  }

  /**
   * Get all mappings for a user
   */
  async getAllMappings(userId?: string): Promise<EnhancedEventMapping[]> {
    return await this.loadAllMappingsFromDatabase(userId);
  }

  /**
   * Validate a mapping to ensure data consistency
   */
  async validateMapping(assignmentId: string): Promise<MappingValidationResult> {
    const mapping = await this.getMappingByAssignment(assignmentId);
    if (!mapping) {
      return {
        is_valid: false,
        confidence_score: 0,
        issues: [{ 
          type: 'stale_mapping', 
          severity: 'high', 
          description: 'Mapping not found' 
        }],
        last_validated: new Date()
      };
    }

    const issues: MappingValidationResult['issues'] = [];
    let confidenceScore = 1.0;

    try {
      // Validate assignment still exists
      const assignment = await assignmentsService.getAssignmentById(assignmentId);
      if (!assignment) {
        issues.push({
          type: 'stale_mapping',
          severity: 'high',
          description: 'Assignment no longer exists',
          suggested_fix: 'Delete mapping'
        });
        confidenceScore -= 0.5;
      } else {
        // Check for data consistency
        if (mapping.assignment_title !== assignment.title) {
          issues.push({
            type: 'data_mismatch',
            severity: 'medium',
            description: 'Assignment title has changed',
            suggested_fix: 'Update mapping metadata'
          });
          confidenceScore -= 0.2;
        }

        if (mapping.assignment_type !== assignment.assignment_type) {
          issues.push({
            type: 'data_mismatch',
            severity: 'low',
            description: 'Assignment type has changed',
            suggested_fix: 'Update mapping metadata'
          });
          confidenceScore -= 0.1;
        }
      }

      // Validate calendar event still exists (would require API call)
      // This is a placeholder for actual calendar API validation
      const eventExists = await this.validateCalendarEvent(mapping);
      if (!eventExists) {
        issues.push({
          type: 'stale_mapping',
          severity: 'high',
          description: 'Calendar event no longer exists',
          suggested_fix: 'Delete mapping or recreate event'
        });
        confidenceScore -= 0.4;
      }

      // Check mapping age
      const daysSinceSync = (Date.now() - mapping.last_synced.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSync > 7) {
        issues.push({
          type: 'stale_mapping',
          severity: 'low',
          description: 'Mapping hasn\'t been synced recently',
          suggested_fix: 'Trigger sync'
        });
        confidenceScore -= 0.1;
      }

    } catch (error) {
      issues.push({
        type: 'provider_error',
        severity: 'medium',
        description: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggested_fix: 'Retry validation later'
      });
      confidenceScore -= 0.3;
    }

    // Update mapping validation timestamp
    await this.updateMapping(assignmentId, {
      mapping_metadata: {
        ...mapping.mapping_metadata,
        last_validation: new Date()
      }
    });

    return {
      is_valid: issues.length === 0 || issues.every(issue => issue.severity === 'low'),
      confidence_score: Math.max(0, confidenceScore),
      issues,
      last_validated: new Date()
    };
  }

  /**
   * Detect and resolve mapping conflicts
   */
  async detectMappingConflicts(userId?: string): Promise<MappingConflict[]> {
    const mappings = await this.getAllMappings(userId);
    const conflicts: MappingConflict[] = [];

    // Check for duplicate mappings
    const eventIds = new Map<string, string[]>();
    mappings.forEach(mapping => {
      const key = `${mapping.provider}:${mapping.external_event_id}`;
      if (!eventIds.has(key)) {
        eventIds.set(key, []);
      }
      eventIds.get(key)!.push(mapping.assignment_id);
    });

    // Find duplicates
    eventIds.forEach((assignmentIds, eventKey) => {
      if (assignmentIds.length > 1) {
        conflicts.push({
          id: `conflict_${Date.now()}_${Math.random()}`,
          type: 'duplicate_mapping',
          calendar_event_id: eventKey.split(':')[1],
          suggested_resolution: 'manual_review',
          confidence: 0.9,
          auto_resolvable: false,
          created_at: new Date()
        });
      }
    });

    // Store conflicts for later resolution
    conflicts.forEach(conflict => {
      this.conflicts.set(conflict.id, conflict);
    });

    return conflicts;
  }

  /**
   * Resolve a mapping conflict
   */
  async resolveMappingConflict(
    conflictId: string,
    resolution: 'merge' | 'keep_assignment' | 'keep_calendar' | 'delete_mapping'
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }

    try {
      switch (resolution) {
        case 'delete_mapping':
          if (conflict.assignment_id) {
            await this.deleteMapping(conflict.assignment_id);
          }
          break;

        case 'keep_assignment':
          // Priority given to assignment data - update calendar event
          if (conflict.assignment_id) {
            const assignment = await assignmentsService.getAssignmentById(conflict.assignment_id);
            if (assignment) {
              await assignmentCalendarSyncService.syncAssignmentToCalendar(assignment, assignment.user_id, true);
            }
          }
          break;

        case 'keep_calendar':
          // Priority given to calendar data - update assignment
          if (conflict.calendar_event_id && conflict.calendar_data) {
            await assignmentCalendarSyncService.syncCalendarEventToAssignment(
              conflict.calendar_data,
              conflict.assignment_data?.user_id || ''
            );
          }
          break;

        case 'merge':
          // Intelligent merge based on latest modification times
          if (conflict.assignment_id && conflict.calendar_event_id) {
            await this.performIntelligentMerge(conflict);
          }
          break;
      }

      // Remove resolved conflict
      this.conflicts.delete(conflictId);
      
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Batch process mappings
   */
  async batchProcessMappings(operation: BatchMappingOperation): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const mappingId of operation.mappings) {
      try {
        switch (operation.operation) {
          case 'validate':
            await this.validateMapping(mappingId);
            break;
          case 'delete':
            await this.deleteMapping(mappingId);
            break;
          case 'resolve_conflicts':
            const conflicts = await this.detectMappingConflicts();
            for (const conflict of conflicts) {
              if (operation.options?.resolve_conflicts_automatically && conflict.auto_resolvable) {
                await this.resolveMappingConflict(conflict.id, conflict.suggested_resolution);
              }
            }
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${mappingId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Get mapping statistics
   */
  async getMappingStatistics(userId?: string): Promise<{
    total_mappings: number;
    active_mappings: number;
    stale_mappings: number;
    conflicted_mappings: number;
    avg_sync_quality: number;
    providers_distribution: Record<string, number>;
    detection_methods: Record<string, number>;
  }> {
    const mappings = await this.getAllMappings(userId);
    const conflicts = await this.detectMappingConflicts(userId);

    const stats = {
      total_mappings: mappings.length,
      active_mappings: 0,
      stale_mappings: 0,
      conflicted_mappings: conflicts.length,
      avg_sync_quality: 0,
      providers_distribution: {} as Record<string, number>,
      detection_methods: {} as Record<string, number>
    };

    let totalQuality = 0;
    const now = Date.now();

    mappings.forEach(mapping => {
      // Check if stale (not synced in last 7 days)
      const daysSinceSync = (now - mapping.last_synced.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSync > 7) {
        stats.stale_mappings++;
      } else {
        stats.active_mappings++;
      }

      // Provider distribution
      stats.providers_distribution[mapping.provider] = 
        (stats.providers_distribution[mapping.provider] || 0) + 1;

      // Detection method distribution
      const method = mapping.mapping_metadata?.detection_method || 'unknown';
      stats.detection_methods[method] = (stats.detection_methods[method] || 0) + 1;

      // Quality score
      if (mapping.mapping_metadata?.sync_quality_score) {
        totalQuality += mapping.mapping_metadata.sync_quality_score;
      }
    });

    stats.avg_sync_quality = mappings.length > 0 ? totalQuality / mappings.length : 0;

    return stats;
  }

  /**
   * Calculate sync quality score for a mapping
   */
  private calculateSyncQualityScore(
    assignment: Assignment,
    metadata?: { confidence?: number; detection_method?: string }
  ): number {
    let score = 0.5; // Base score

    // Detection method factor
    switch (metadata?.detection_method) {
      case 'manual':
        score += 0.3;
        break;
      case 'ai_suggestion':
        score += 0.2;
        break;
      case 'keyword':
        score += 0.15;
        break;
      case 'pattern':
        score += 0.1;
        break;
    }

    // Confidence factor
    if (metadata?.confidence) {
      score += metadata.confidence * 0.2;
    }

    // Assignment completeness factor
    let completeness = 0;
    if (assignment.title) completeness += 0.25;
    if (assignment.description) completeness += 0.25;
    if (assignment.assignment_type) completeness += 0.25;
    if (assignment.subject_id) completeness += 0.25;
    
    score += completeness * 0.2;

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Perform intelligent merge of conflicting data
   */
  private async performIntelligentMerge(conflict: MappingConflict): Promise<void> {
    // This would implement sophisticated merge logic
    // For now, we'll use a simple latest-wins approach
    console.log('Performing intelligent merge for conflict:', conflict.id);
    
    // Implementation would compare timestamps and merge non-conflicting fields
    // This is a placeholder for the actual merge logic
  }

  /**
   * Validate that a calendar event still exists
   */
  private async validateCalendarEvent(mapping: EnhancedEventMapping): Promise<boolean> {
    try {
      // This would make an actual API call to the calendar provider
      // For now, we'll assume the event exists
      return true;
    } catch (error) {
      console.error('Error validating calendar event:', error);
      return false;
    }
  }

  /**
   * Database operations (placeholder implementations)
   */
  private async storeMappingInDatabase(mapping: EnhancedEventMapping): Promise<void> {
    // Implementation would store in Supabase
    console.log('Storing mapping:', mapping.assignment_id);
  }

  private async loadMappingFromDatabase(assignmentId: string): Promise<EnhancedEventMapping | null> {
    // Implementation would load from Supabase
    return null;
  }

  private async loadAllMappingsFromDatabase(userId?: string): Promise<EnhancedEventMapping[]> {
    // Implementation would load all mappings from Supabase
    return [];
  }

  private async deleteMappingFromDatabase(assignmentId: string): Promise<void> {
    // Implementation would delete from Supabase
    console.log('Deleting mapping:', assignmentId);
  }
}

// Export singleton instance
export const assignmentEventMappingService = new AssignmentEventMappingService();