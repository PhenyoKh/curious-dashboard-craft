/**
 * Security Logger for StudyFlow Security System
 * Comprehensive audit trail and security event logging
 */

import { supabase } from '@/integrations/supabase/client';
import type { FileSecurityResult, SecurityThreat } from './FileSecurityValidator';
import type { QuarantinedFile } from './QuarantineManager';

export enum SecurityEventType {
  // File Security Events
  FILE_SCAN_STARTED = 'file_scan_started',
  FILE_SCAN_COMPLETED = 'file_scan_completed',
  FILE_SCAN_FAILED = 'file_scan_failed',
  THREAT_DETECTED = 'threat_detected',
  FILE_BLOCKED = 'file_blocked',
  
  // Quarantine Events
  FILE_QUARANTINED = 'file_quarantined',
  FILE_RESTORED = 'file_restored',
  FILE_PERMANENTLY_DELETED = 'file_permanently_deleted',
  BULK_DELETE_PERFORMED = 'bulk_delete_performed',
  
  // Upload Events
  UPLOAD_STARTED = 'upload_started',
  UPLOAD_COMPLETED = 'upload_completed',
  UPLOAD_FAILED = 'upload_failed',
  UPLOAD_REJECTED = 'upload_rejected',
  
  // Security Settings Events
  SECURITY_LEVEL_CHANGED = 'security_level_changed',
  SECURITY_RULES_UPDATED = 'security_rules_updated',
  QUARANTINE_CLEANED = 'quarantine_cleaned',
  
  // User Activity Events
  SECURITY_DASHBOARD_ACCESSED = 'security_dashboard_accessed',
  QUARANTINE_LIST_VIEWED = 'quarantine_list_viewed',
  SECURITY_REPORT_GENERATED = 'security_report_generated',
  
  // System Events
  BACKGROUND_SCAN_STARTED = 'background_scan_started',
  BACKGROUND_SCAN_COMPLETED = 'background_scan_completed',
  SECURITY_ALERT_TRIGGERED = 'security_alert_triggered',
  SUSPICIOUS_ACTIVITY_DETECTED = 'suspicious_activity_detected'
}

export enum SecurityEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Security setting value types
export type SecuritySettingValue = string | number | boolean | string[] | null | undefined;

export interface SecurityEvent {
  id?: string;
  event_type: SecurityEventType;
  severity: SecurityEventSeverity;
  message: string;
  details: Record<string, SecuritySettingValue>;
  user_id: string;
  timestamp: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  file_info?: {
    filename: string;
    size: number;
    mime_type: string;
  };
  threat_info?: SecurityThreat[];
  metadata?: Record<string, SecuritySettingValue>;
}

export interface SecurityLogQuery {
  event_types?: SecurityEventType[];
  severity?: SecurityEventSeverity;
  date_from?: Date;
  date_to?: Date;
  user_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SecuritySummary {
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_severity: Record<string, number>;
  threats_detected: number;
  files_quarantined: number;
  files_blocked: number;
  recent_activity: SecurityEvent[];
  top_threats: Array<{ type: string; count: number }>;
}

export class SecurityLogger {
  private readonly LOGS_TABLE = 'security_logs';
  private sessionId: string;
  private batchLogs: SecurityEvent[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 5000; // 5 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupBatchLogging();
    this.setupPerformanceMonitoring();
  }

  /**
   * Log a security event
   */
  async logEvent(
    eventType: SecurityEventType,
    severity: SecurityEventSeverity,
    message: string,
    details: Record<string, SecuritySettingValue> = {},
    fileInfo?: { filename: string; size: number; mime_type: string },
    threatInfo?: SecurityThreat[]
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        event_type: eventType,
        severity,
        message,
        details: {
          ...details,
          browser: this.getBrowserInfo(),
          timestamp_precise: Date.now()
        },
        user_id: await this.getCurrentUserId(),
        timestamp: new Date().toISOString(),
        session_id: this.sessionId,
        user_agent: navigator.userAgent,
        ip_address: await this.getUserIpAddress(),
        file_info: fileInfo,
        threat_info: threatInfo,
        metadata: {
          url: window.location.href,
          referrer: document.referrer
        }
      };

      // Add to batch for efficient logging
      this.batchLogs.push(event);

      // For critical events, log immediately
      if (severity === SecurityEventSeverity.CRITICAL) {
        await this.flushBatchLogs();
      }

      // Console logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Security Log] ${severity.toUpperCase()}: ${message}`, event);
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log file scan started
   */
  async logFileScanStarted(filename: string, fileSize: number, mimeType: string): Promise<void> {
    await this.logEvent(
      SecurityEventType.FILE_SCAN_STARTED,
      SecurityEventSeverity.INFO,
      `Security scan started for file: ${filename}`,
      { scan_start_time: Date.now() },
      { filename, size: fileSize, mime_type: mimeType }
    );
  }

  /**
   * Log file scan completed
   */
  async logFileScanCompleted(
    filename: string,
    securityResult: FileSecurityResult
  ): Promise<void> {
    const severity = securityResult.threats.length > 0 
      ? SecurityEventSeverity.WARNING 
      : SecurityEventSeverity.INFO;

    const message = securityResult.isSecure
      ? `File scan completed - secure: ${filename}`
      : `File scan completed - ${securityResult.threats.length} threats detected: ${filename}`;

    await this.logEvent(
      SecurityEventType.FILE_SCAN_COMPLETED,
      severity,
      message,
      {
        scan_duration: securityResult.metadata.scanDuration,
        threats_count: securityResult.threats.length,
        quarantine_recommended: securityResult.quarantineRecommended,
        allow_upload: securityResult.allowUpload
      },
      {
        filename: securityResult.metadata.fileName,
        size: securityResult.metadata.fileSize,
        mime_type: securityResult.metadata.mimeType
      },
      securityResult.threats
    );
  }

  /**
   * Log threat detection
   */
  async logThreatDetected(
    filename: string,
    threat: SecurityThreat,
    fileInfo: { size: number; mime_type: string }
  ): Promise<void> {
    const severity = threat.severity === 'critical' 
      ? SecurityEventSeverity.CRITICAL
      : threat.severity === 'high'
      ? SecurityEventSeverity.ERROR
      : SecurityEventSeverity.WARNING;

    await this.logEvent(
      SecurityEventType.THREAT_DETECTED,
      severity,
      `Security threat detected in ${filename}: ${threat.description}`,
      {
        threat_type: threat.type,
        threat_severity: threat.severity,
        recommendation: threat.recommendation,
        threat_details: threat.details
      },
      { filename, size: fileInfo.size, mime_type: fileInfo.mime_type },
      [threat]
    );
  }

  /**
   * Log file quarantine
   */
  async logFileQuarantined(quarantinedFile: QuarantinedFile): Promise<void> {
    await this.logEvent(
      SecurityEventType.FILE_QUARANTINED,
      SecurityEventSeverity.WARNING,
      `File quarantined: ${quarantinedFile.original_filename}`,
      {
        quarantine_id: quarantinedFile.id,
        quarantine_reason: quarantinedFile.quarantine_reason,
        can_restore: quarantinedFile.can_restore,
        auto_delete_at: quarantinedFile.auto_delete_at,
        threats_count: quarantinedFile.threats.length
      },
      {
        filename: quarantinedFile.original_filename,
        size: quarantinedFile.file_size,
        mime_type: quarantinedFile.mime_type
      },
      quarantinedFile.threats
    );
  }

  /**
   * Log file restoration
   */
  async logFileRestored(
    quarantineId: string,
    originalFilename: string,
    success: boolean,
    message: string
  ): Promise<void> {
    await this.logEvent(
      SecurityEventType.FILE_RESTORED,
      success ? SecurityEventSeverity.INFO : SecurityEventSeverity.ERROR,
      success 
        ? `File restored from quarantine: ${originalFilename}`
        : `File restoration failed: ${originalFilename} - ${message}`,
      {
        quarantine_id: quarantineId,
        restoration_success: success,
        restoration_message: message
      }
    );
  }

  /**
   * Log upload rejection
   */
  async logUploadRejected(
    filename: string,
    reason: string,
    threats: SecurityThreat[],
    fileInfo: { size: number; mime_type: string }
  ): Promise<void> {
    await this.logEvent(
      SecurityEventType.UPLOAD_REJECTED,
      SecurityEventSeverity.WARNING,
      `Upload rejected: ${filename} - ${reason}`,
      {
        rejection_reason: reason,
        threats_count: threats.length
      },
      { filename, size: fileInfo.size, mime_type: fileInfo.mime_type },
      threats
    );
  }

  /**
   * Log security settings change
   */
  async logSecuritySettingsChanged(
    settingName: string,
    oldValue: SecuritySettingValue,
    newValue: SecuritySettingValue
  ): Promise<void> {
    await this.logEvent(
      SecurityEventType.SECURITY_RULES_UPDATED,
      SecurityEventSeverity.INFO,
      `Security setting changed: ${settingName}`,
      {
        setting_name: settingName,
        old_value: oldValue,
        new_value: newValue
      }
    );
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    activity: string,
    details: Record<string, SecuritySettingValue>
  ): Promise<void> {
    await this.logEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY_DETECTED,
      SecurityEventSeverity.ERROR,
      `Suspicious activity detected: ${activity}`,
      {
        activity_type: activity,
        activity_details: details,
        detection_time: Date.now()
      }
    );
  }

  /**
   * Query security logs
   */
  async queryLogs(query: SecurityLogQuery = {}): Promise<{
    logs: SecurityEvent[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        event_types,
        severity,
        date_from,
        date_to,
        user_id,
        search,
        limit = 50,
        offset = 0
      } = query;

      let dbQuery = supabase
        .from(this.LOGS_TABLE)
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });

      // Apply filters
      if (event_types && event_types.length > 0) {
        dbQuery = dbQuery.in('event_type', event_types);
      }

      if (severity) {
        dbQuery = dbQuery.eq('severity', severity);
      }

      if (date_from) {
        dbQuery = dbQuery.gte('timestamp', date_from.toISOString());
      }

      if (date_to) {
        dbQuery = dbQuery.lte('timestamp', date_to.toISOString());
      }

      if (user_id) {
        dbQuery = dbQuery.eq('user_id', user_id);
      } else {
        // Default to current user's logs
        dbQuery = dbQuery.eq('user_id', await this.getCurrentUserId());
      }

      if (search) {
        dbQuery = dbQuery.or(`message.ilike.%${search}%,details->>'filename'.ilike.%${search}%`);
      }

      // Apply pagination
      dbQuery = dbQuery.range(offset, offset + limit - 1);

      const { data, error, count } = await dbQuery;

      if (error) {
        throw new Error(`Failed to query security logs: ${error.message}`);
      }

      return {
        logs: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      };

    } catch (error) {
      console.error('Failed to query security logs:', error);
      throw error;
    }
  }

  /**
   * Generate security summary
   */
  async generateSecuritySummary(days: number = 30): Promise<SecuritySummary> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const { data: logs, error } = await supabase
        .from(this.LOGS_TABLE)
        .select('*')
        .eq('user_id', await this.getCurrentUserId())
        .gte('timestamp', dateFrom.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        throw new Error(`Failed to generate security summary: ${error.message}`);
      }

      const summary: SecuritySummary = {
        total_events: logs.length,
        events_by_type: {},
        events_by_severity: {},
        threats_detected: 0,
        files_quarantined: 0,
        files_blocked: 0,
        recent_activity: logs.slice(0, 10),
        top_threats: []
      };

      const threatCounts: Record<string, number> = {};

      // Analyze logs
      for (const log of logs) {
        // Count by type
        summary.events_by_type[log.event_type] = 
          (summary.events_by_type[log.event_type] || 0) + 1;

        // Count by severity
        summary.events_by_severity[log.severity] = 
          (summary.events_by_severity[log.severity] || 0) + 1;

        // Count specific events
        if (log.event_type === SecurityEventType.THREAT_DETECTED) {
          summary.threats_detected++;
        }
        if (log.event_type === SecurityEventType.FILE_QUARANTINED) {
          summary.files_quarantined++;
        }
        if (log.event_type === SecurityEventType.UPLOAD_REJECTED) {
          summary.files_blocked++;
        }

        // Count threat types
        if (log.threat_info) {
          for (const threat of log.threat_info) {
            threatCounts[threat.type] = (threatCounts[threat.type] || 0) + 1;
          }
        }
      }

      // Get top threats
      summary.top_threats = Object.entries(threatCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return summary;

    } catch (error) {
      console.error('Failed to generate security summary:', error);
      throw error;
    }
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<{
    deleted: number;
    message: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { error, count } = await supabase
        .from(this.LOGS_TABLE)
        .delete()
        .eq('user_id', await this.getCurrentUserId())
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Failed to cleanup old logs: ${error.message}`);
      }

      await this.logEvent(
        SecurityEventType.QUARANTINE_CLEANED,
        SecurityEventSeverity.INFO,
        `Old security logs cleaned up: ${count || 0} records deleted`,
        { retention_days: retentionDays, cutoff_date: cutoffDate.toISOString() }
      );

      return {
        deleted: count || 0,
        message: `Successfully deleted ${count || 0} old log entries`
      };

    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
      throw error;
    }
  }

  // Private helper methods
  private async flushBatchLogs(): Promise<void> {
    if (this.batchLogs.length === 0) return;

    const logsToFlush = [...this.batchLogs];
    this.batchLogs = [];

    try {
      const { error } = await supabase
        .from(this.LOGS_TABLE)
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to flush batch logs:', error);
        // Put logs back in batch for retry
        this.batchLogs.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Failed to flush batch logs:', error);
      // Put logs back in batch for retry
      this.batchLogs.unshift(...logsToFlush);
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  private setupBatchLogging(): void {
    // Flush logs periodically
    setInterval(() => {
      if (this.batchLogs.length > 0) {
        this.flushBatchLogs();
      }
    }, this.BATCH_DELAY);

    // Flush logs when batch is full
    const originalPush = this.batchLogs.push;
    this.batchLogs.push = (...items) => {
      const result = originalPush.apply(this.batchLogs, items);
      if (this.batchLogs.length >= this.BATCH_SIZE) {
        this.flushBatchLogs();
      }
      return result;
    };

    // Flush logs before page unload
    window.addEventListener('beforeunload', () => {
      if (this.batchLogs.length > 0) {
        navigator.sendBeacon('/api/security-logs', JSON.stringify(this.batchLogs));
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    // Monitor page performance and log security-relevant metrics
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 5000) { // Log slow operations
            this.logEvent(
              SecurityEventType.SUSPICIOUS_ACTIVITY_DETECTED,
              SecurityEventSeverity.WARNING,
              `Slow operation detected: ${entry.name}`,
              {
                operation_name: entry.name,
                duration: entry.duration,
                entry_type: entry.entryType
              }
            );
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  private async getUserIpAddress(): Promise<string> {
    try {
      // In a real app, you might want to get this from your backend
      return 'client-side';
    } catch {
      return 'unknown';
    }
  }

  private getBrowserInfo(): Record<string, SecuritySettingValue> {
    return {
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookie_enabled: navigator.cookieEnabled,
      online: navigator.onLine,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Export security logs for external analysis
   */
  async exportLogs(
    query: SecurityLogQuery = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<{ success: boolean; data?: string; message: string }> {
    try {
      const { logs } = await this.queryLogs({ ...query, limit: 10000 });

      if (format === 'csv') {
        const csv = this.convertLogsToCSV(logs);
        return {
          success: true,
          data: csv,
          message: `Exported ${logs.length} log entries as CSV`
        };
      } else {
        return {
          success: true,
          data: JSON.stringify(logs, null, 2),
          message: `Exported ${logs.length} log entries as JSON`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  private convertLogsToCSV(logs: SecurityEvent[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'timestamp', 'event_type', 'severity', 'message', 'filename', 
      'file_size', 'mime_type', 'threats_count', 'user_agent'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.event_type,
      log.severity,
      `"${log.message.replace(/"/g, '""')}"`,
      log.file_info?.filename || '',
      log.file_info?.size || '',
      log.file_info?.mime_type || '',
      log.threat_info?.length || 0,
      `"${(log.user_agent || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Singleton instance
export const securityLogger = new SecurityLogger();