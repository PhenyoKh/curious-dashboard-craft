/**
 * Calendar Integration Monitoring Utilities
 * Provides comprehensive monitoring, error tracking, and health checks
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CalendarSyncMetrics {
  provider: 'google' | 'microsoft';
  operation: 'sync' | 'auth' | 'webhook' | 'conflict_resolution';
  success: boolean;
  duration: number;
  timestamp: Date;
  userId?: string;
  integrationId?: string;
  errorMessage?: string;
  errorCode?: string;
  eventsProcessed?: number;
  conflictsDetected?: number;
  apiCallsUsed?: number;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  timestamp: Date;
  details?: Record<string, unknown>;
  error?: string;
}

export interface ErrorContext {
  userId?: string;
  integrationId?: string;
  provider?: 'google' | 'microsoft';
  operation?: string;
  requestId?: string;
  additionalData?: Record<string, unknown>;
}

class CalendarMonitoring {
  private static instance: CalendarMonitoring;
  private metricsBuffer: CalendarSyncMetrics[] = [];
  private isProduction = import.meta.env.NODE_ENV === 'production';
  private enabledMetrics = import.meta.env.VITE_ENABLE_METRICS !== 'false';
  
  private constructor() {
    // Flush metrics buffer every 30 seconds
    if (this.enabledMetrics) {
      setInterval(() => this.flushMetricsBuffer(), 30000);
    }
  }

  static getInstance(): CalendarMonitoring {
    if (!CalendarMonitoring.instance) {
      CalendarMonitoring.instance = new CalendarMonitoring();
    }
    return CalendarMonitoring.instance;
  }

  /**
   * Track calendar operation metrics
   */
  trackCalendarOperation(metrics: CalendarSyncMetrics): void {
    if (!this.enabledMetrics) return;

    try {
      // Add to buffer for batch processing
      this.metricsBuffer.push({
        ...metrics,
        timestamp: new Date()
      });

      // Log to console in development
      if (!this.isProduction) {
        logger.log(`[Calendar Metrics] ${metrics.provider}.${metrics.operation}:`, {
          success: metrics.success,
          duration: `${metrics.duration}ms`,
          eventsProcessed: metrics.eventsProcessed,
          conflictsDetected: metrics.conflictsDetected
        });
      }

      // Send to external monitoring if configured
      this.sendToExternalMonitoring(metrics);

    } catch (error) {
      logger.error('Failed to track calendar metrics:', error);
    }
  }

  /**
   * Track authentication metrics
   */
  trackAuthMetrics(provider: 'google' | 'microsoft', success: boolean, duration: number, error?: string): void {
    this.trackCalendarOperation({
      provider,
      operation: 'auth',
      success,
      duration,
      timestamp: new Date(),
      errorMessage: error
    });
  }

  /**
   * Track sync operation metrics
   */
  trackSyncMetrics(
    provider: 'google' | 'microsoft',
    success: boolean,
    duration: number,
    eventsProcessed: number = 0,
    conflictsDetected: number = 0,
    error?: string
  ): void {
    this.trackCalendarOperation({
      provider,
      operation: 'sync',
      success,
      duration,
      eventsProcessed,
      conflictsDetected,
      timestamp: new Date(),
      errorMessage: error
    });
  }

  /**
   * Track webhook metrics
   */
  trackWebhookMetrics(provider: 'google' | 'microsoft', success: boolean, duration: number, error?: string): void {
    this.trackCalendarOperation({
      provider,
      operation: 'webhook',
      success,
      duration,
      timestamp: new Date(),
      errorMessage: error
    });
  }

  /**
   * Log calendar integration errors with context
   */
  logCalendarError(error: Error, context: ErrorContext = {}): void {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      provider: context.provider,
      operation: context.operation,
      userId: context.userId,
      integrationId: context.integrationId,
      requestId: context.requestId || this.generateRequestId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData: context.additionalData
    };

    // Log to console
    logger.error('[Calendar Error]', errorData);

    // Send to external error tracking
    this.sendToErrorTracking(error, errorData);

    // Store critical errors in database
    if (this.isCriticalError(error)) {
      this.storeCriticalError(errorData);
    }
  }

  /**
   * Perform health check for calendar services
   */
  async performHealthCheck(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};

    // Check database connectivity
    results.database = await this.checkDatabaseHealth();

    // Check Google Calendar API health
    results.google_calendar = await this.checkGoogleCalendarHealth();

    // Check Microsoft Graph API health
    results.microsoft_graph = await this.checkMicrosoftGraphHealth();

    // Check webhook endpoints
    results.webhooks = await this.checkWebhookHealth();

    return results;
  }

  /**
   * Get calendar integration statistics
   */
  async getIntegrationStats(userId?: string): Promise<{
    totalIntegrations: number;
    activeIntegrations: number;
    syncErrors: number;
    lastSyncTime?: Date;
    syncSuccessRate: number;
    averageSyncDuration: number;
  }> {
    try {
      let query = supabase
        .from('calendar_integrations')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: integrations, error } = await query;

      if (error) throw error;

      const totalIntegrations = integrations?.length || 0;
      const activeIntegrations = integrations?.filter(i => i.sync_enabled).length || 0;
      const syncErrors = integrations?.filter(i => i.sync_status === 'error').length || 0;

      // Get recent sync history for success rate calculation
      const { data: syncHistory } = await supabase
        .from('sync_history')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      const successfulSyncs = syncHistory?.filter(s => s.status === 'success').length || 0;
      const totalSyncs = syncHistory?.length || 0;
      const syncSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;

      const averageSyncDuration = syncHistory && syncHistory.length > 0
        ? syncHistory.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / syncHistory.length
        : 0;

      const lastSyncTime = integrations && integrations.length > 0
        ? new Date(Math.max(...integrations.map(i => new Date(i.last_sync_at || 0).getTime())))
        : undefined;

      return {
        totalIntegrations,
        activeIntegrations,
        syncErrors,
        lastSyncTime,
        syncSuccessRate,
        averageSyncDuration
      };

    } catch (error) {
      logger.error('Failed to get integration stats:', error);
      return {
        totalIntegrations: 0,
        activeIntegrations: 0,
        syncErrors: 0,
        syncSuccessRate: 0,
        averageSyncDuration: 0
      };
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    timeRange: string;
    totalOperations: number;
    successRate: number;
    averageResponseTime: number;
    errorBreakdown: Record<string, number>;
    performanceTrends: Array<{ timestamp: Date; successRate: number; avgDuration: number }>;
  }> {
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - timeRangeMs[timeRange]);

    try {
      const { data: syncHistory } = await supabase
        .from('sync_history')
        .select('*')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: true });

      const operations = syncHistory || [];
      const totalOperations = operations.length;
      const successfulOperations = operations.filter(op => op.status === 'success').length;
      const successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 100;

      const averageResponseTime = operations.length > 0
        ? operations.reduce((sum, op) => sum + (op.duration_ms || 0), 0) / operations.length
        : 0;

      // Error breakdown
      const errorBreakdown: Record<string, number> = {};
      operations
        .filter(op => op.status === 'error')
        .forEach(op => {
          const errorType = op.error_message?.split(':')[0] || 'Unknown';
          errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
        });

      // Performance trends (hourly buckets)
      const performanceTrends: Array<{ timestamp: Date; successRate: number; avgDuration: number }> = [];
      const bucketSize = timeRangeMs[timeRange] / 24; // 24 data points

      for (let i = 0; i < 24; i++) {
        const bucketStart = new Date(startTime.getTime() + i * bucketSize);
        const bucketEnd = new Date(bucketStart.getTime() + bucketSize);

        const bucketOps = operations.filter(op =>
          new Date(op.created_at) >= bucketStart && new Date(op.created_at) < bucketEnd
        );

        const bucketSuccessRate = bucketOps.length > 0
          ? (bucketOps.filter(op => op.status === 'success').length / bucketOps.length) * 100
          : 100;

        const bucketAvgDuration = bucketOps.length > 0
          ? bucketOps.reduce((sum, op) => sum + (op.duration_ms || 0), 0) / bucketOps.length
          : 0;

        performanceTrends.push({
          timestamp: bucketStart,
          successRate: bucketSuccessRate,
          avgDuration: bucketAvgDuration
        });
      }

      return {
        timeRange,
        totalOperations,
        successRate,
        averageResponseTime,
        errorBreakdown,
        performanceTrends
      };

    } catch (error) {
      logger.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];

      // Store metrics in database
      await this.storeMetrics(metrics);

    } catch (error) {
      logger.error('Failed to flush metrics buffer:', error);
    }
  }

  private async storeMetrics(metrics: CalendarSyncMetrics[]): Promise<void> {
    try {
      const syncHistoryEntries = metrics.map(metric => ({
        provider: metric.provider,
        operation_type: metric.operation,
        status: metric.success ? 'success' : 'error',
        duration_ms: metric.duration,
        events_processed: metric.eventsProcessed || 0,
        conflicts_detected: metric.conflictsDetected || 0,
        error_message: metric.errorMessage,
        user_id: metric.userId,
        integration_id: metric.integrationId,
        created_at: metric.timestamp.toISOString()
      }));

      await supabase
        .from('sync_history')
        .insert(syncHistoryEntries);

    } catch (error) {
      logger.error('Failed to store metrics:', error);
    }
  }

  private sendToExternalMonitoring(metrics: CalendarSyncMetrics): void {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'calendar_operation', {
        event_category: 'calendar',
        event_label: `${metrics.provider}_${metrics.operation}`,
        value: metrics.success ? 1 : 0,
        custom_parameter_1: metrics.duration
      });
    }

    // Custom monitoring endpoint
    const monitoringEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
    if (monitoringEndpoint) {
      fetch(monitoringEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      }).catch(error => logger.warn('Failed to send metrics to external monitoring:', error));
    }
  }

  private sendToErrorTracking(error: Error, errorData: Record<string, unknown>): void {
    // Sentry integration
    if (window.Sentry) {
      window.Sentry.withScope((scope) => {
        scope.setTag('component', 'calendar-integration');
        scope.setTag('provider', errorData.provider);
        scope.setContext('calendar_error', errorData);
        window.Sentry.captureException(error);
      });
    }

    // Custom error tracking endpoint
    const errorTrackingEndpoint = import.meta.env.VITE_ERROR_TRACKING_ENDPOINT;
    if (errorTrackingEndpoint) {
      fetch(errorTrackingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message, ...errorData })
      }).catch(console.warn);
    }
  }

  private async storeCriticalError(errorData: Record<string, unknown>): Promise<void> {
    try {
      await supabase
        .from('error_logs')
        .insert({
          error_type: 'critical',
          error_message: errorData.message,
          error_stack: errorData.stack,
          provider: errorData.provider,
          user_id: errorData.userId,
          integration_id: errorData.integrationId,
          context: errorData,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to store critical error:', error);
    }
  }

  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      'authentication failed',
      'token expired',
      'quota exceeded',
      'permission denied',
      'network error'
    ];

    return criticalPatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern)
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      return {
        service: 'database',
        status: error ? 'unhealthy' : 'healthy',
        responseTime,
        timestamp: new Date(),
        error: error?.message
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkGoogleCalendarHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple health check by testing the Google Calendar API discovery document
      const response = await fetch('https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest');
      const responseTime = Date.now() - startTime;

      return {
        service: 'google_calendar',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: { status: response.status }
      };
    } catch (error) {
      return {
        service: 'google_calendar',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkMicrosoftGraphHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple health check by testing Microsoft Graph metadata
      const response = await fetch('https://graph.microsoft.com/v1.0/$metadata');
      const responseTime = Date.now() - startTime;

      return {
        service: 'microsoft_graph',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: { status: response.status }
      };
    } catch (error) {
      return {
        service: 'microsoft_graph',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkWebhookHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const appUrl = import.meta.env.VITE_APP_URL;
    
    if (!appUrl) {
      return {
        service: 'webhooks',
        status: 'unhealthy',
        responseTime: 0,
        timestamp: new Date(),
        error: 'No app URL configured'
      };
    }

    try {
      // Test webhook endpoints
      const googleWebhook = `${appUrl}/api/webhooks/google-calendar`;
      const response = await fetch(googleWebhook, { method: 'HEAD' });
      const responseTime = Date.now() - startTime;

      return {
        service: 'webhooks',
        status: response.status < 500 ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: { status: response.status }
      };
    } catch (error) {
      return {
        service: 'webhooks',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const calendarMonitoring = CalendarMonitoring.getInstance();

// Convenience functions
export const trackCalendarSync = (
  provider: 'google' | 'microsoft',
  success: boolean,
  duration: number,
  eventsProcessed?: number,
  conflictsDetected?: number,
  error?: string
) => calendarMonitoring.trackSyncMetrics(provider, success, duration, eventsProcessed, conflictsDetected, error);

export const trackCalendarAuth = (
  provider: 'google' | 'microsoft',
  success: boolean,
  duration: number,
  error?: string
) => calendarMonitoring.trackAuthMetrics(provider, success, duration, error);

export const trackCalendarWebhook = (
  provider: 'google' | 'microsoft',
  success: boolean,
  duration: number,
  error?: string
) => calendarMonitoring.trackWebhookMetrics(provider, success, duration, error);

export const logCalendarError = (error: Error, context?: ErrorContext) =>
  calendarMonitoring.logCalendarError(error, context);

export const performCalendarHealthCheck = () => calendarMonitoring.performHealthCheck();

export const getCalendarStats = (userId?: string) => calendarMonitoring.getIntegrationStats(userId);

export const generateCalendarReport = (timeRange?: 'hour' | 'day' | 'week') =>
  calendarMonitoring.generatePerformanceReport(timeRange);