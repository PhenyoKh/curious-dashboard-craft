/**
 * Performance Baseline Utilities - Phase 0.1 Enhancement
 * 
 * Centralized performance baseline management for ultra-detailed monitoring
 * across all contexts. Provides consistent metrics collection, analysis, 
 * and reporting capabilities.
 * 
 * This utility establishes performance baselines and tracks deviations
 * to identify render loops, performance degradation, and optimization opportunities.
 */

import { logger } from '@/utils/logger';

// Performance tracking configuration
export const PERFORMANCE_CONFIG = {
  BURST_DETECTION_WINDOW: 100, // 100ms window for burst detection
  BURST_THRESHOLD: 5, // >5 renders in window = potential loop
  PERFORMANCE_TRACKING_WINDOW: 60000, // 1 minute sliding window
  MAX_RENDER_HISTORY: 100, // Keep last 100 render records
  BASELINE_SAMPLE_SIZE: 50, // Minimum renders to establish baseline
  PERFORMANCE_DEGRADATION_THRESHOLD: 2.0, // 2x slower than baseline
  HIGH_FREQUENCY_THRESHOLD: 10, // >10 renders per second
  
  // Context-specific thresholds
  CONTEXT_THRESHOLDS: {
    SUBSCRIPTION: {
      EXPECTED_RENDERS_PER_MINUTE: 5,
      MAX_EFFECT_EXECUTION_TIME: 50, // ms
      MAX_RENDER_TIME: 10, // ms
    },
    PAYMENT_INTENT: {
      EXPECTED_RENDERS_PER_MINUTE: 3,
      MAX_EFFECT_EXECUTION_TIME: 30, // ms
      MAX_RENDER_TIME: 8, // ms
    },
    AUTH: {
      EXPECTED_RENDERS_PER_MINUTE: 8,
      MAX_EFFECT_EXECUTION_TIME: 100, // ms
      MAX_RENDER_TIME: 15, // ms
    },
    // React.Profiler context types
    PROFILER_PAYMENTCALLBACK: {
      EXPECTED_RENDERS_PER_MINUTE: 4,
      MAX_EFFECT_EXECUTION_TIME: 100, // ms  
      MAX_RENDER_TIME: 50, // ms
    },
    PROFILER_AUTHSCREEN: {
      EXPECTED_RENDERS_PER_MINUTE: 5,
      MAX_EFFECT_EXECUTION_TIME: 80, // ms
      MAX_RENDER_TIME: 30, // ms
    },
    PROFILER_SUBSCRIPTIONCONTEXT: {
      EXPECTED_RENDERS_PER_MINUTE: 5,
      MAX_EFFECT_EXECUTION_TIME: 50, // ms
      MAX_RENDER_TIME: 10, // ms
    },
    PROFILER_PAYMENTINTENTCONTEXT: {
      EXPECTED_RENDERS_PER_MINUTE: 3,
      MAX_EFFECT_EXECUTION_TIME: 30, // ms
      MAX_RENDER_TIME: 8, // ms
    },
    PROFILER_PRICING: {
      EXPECTED_RENDERS_PER_MINUTE: 3,
      MAX_EFFECT_EXECUTION_TIME: 200, // ms - pricing can be slower due to calculations
      MAX_RENDER_TIME: 100, // ms
    }
  }
} as const;

export interface BaseRenderMetrics {
  timestamp: number;
  renderNumber: number;
  timeSinceLastRender: number;
  performanceEntry?: PerformanceEntry;
}

export interface ContextRenderMetrics extends BaseRenderMetrics {
  contextType: 'SUBSCRIPTION' | 'PAYMENT_INTENT' | 'AUTH';
  contextId: string;
  state: Record<string, any>;
}

export interface EffectExecutionMetrics {
  effectId: string;
  effectName: string;
  contextType: 'SUBSCRIPTION' | 'PAYMENT_INTENT' | 'AUTH';
  contextId: string;
  executionTime: number;
  timestamp: number;
  trigger: string;
  stackTrace?: string;
}

export interface PerformanceBaseline {
  contextType: 'SUBSCRIPTION' | 'PAYMENT_INTENT' | 'AUTH';
  contextId: string;
  averageRenderTime: number;
  renderFrequency: number; // renders per second
  burstEvents: number;
  totalRenders: number;
  windowStart: number;
  lastUpdated: number;
  
  // Enhanced metrics
  p95RenderTime: number; // 95th percentile render time
  p99RenderTime: number; // 99th percentile render time
  maxRenderTime: number;
  minRenderTime: number;
  standardDeviation: number;
  
  // Effect execution metrics
  averageEffectExecutionTime: number;
  maxEffectExecutionTime: number;
  totalEffectExecutions: number;
  
  // Health indicators
  isHealthy: boolean;
  healthScore: number; // 0-100
  issues: string[];
  recommendations: string[];
}

export interface GlobalPerformanceReport {
  timestamp: number;
  reportId: string;
  totalContexts: number;
  healthyContexts: number;
  contexts: PerformanceBaseline[];
  globalIssues: string[];
  globalRecommendations: string[];
  overallHealthScore: number;
  
  // Cross-context analysis
  crossContextBursts: number;
  concurrentRenderEvents: number;
  resourceContention: boolean;
}

// Global performance tracking state
class PerformanceBaselineManager {
  private static instance: PerformanceBaselineManager;
  private contextBaselines: Map<string, PerformanceBaseline> = new Map();
  private renderHistory: Map<string, ContextRenderMetrics[]> = new Map();
  private effectHistory: Map<string, EffectExecutionMetrics[]> = new Map();
  private globalStartTime: number = Date.now();
  
  static getInstance(): PerformanceBaselineManager {
    if (!PerformanceBaselineManager.instance) {
      PerformanceBaselineManager.instance = new PerformanceBaselineManager();
    }
    return PerformanceBaselineManager.instance;
  }

  /**
   * Record a render event and update performance baseline
   */
  recordRender(metrics: ContextRenderMetrics): PerformanceBaseline {
    const contextKey = `${metrics.contextType}-${metrics.contextId}`;
    
    // Initialize render history if needed
    if (!this.renderHistory.has(contextKey)) {
      this.renderHistory.set(contextKey, []);
    }
    
    const history = this.renderHistory.get(contextKey)!;
    history.push(metrics);
    
    // Maintain sliding window
    if (history.length > PERFORMANCE_CONFIG.MAX_RENDER_HISTORY) {
      history.shift();
    }
    
    // Update or create baseline
    return this.updateBaseline(contextKey, metrics.contextType, metrics.contextId);
  }

  /**
   * Record an effect execution and update metrics
   */
  recordEffectExecution(metrics: EffectExecutionMetrics): void {
    const contextKey = `${metrics.contextType}-${metrics.contextId}`;
    
    if (!this.effectHistory.has(contextKey)) {
      this.effectHistory.set(contextKey, []);
    }
    
    const history = this.effectHistory.get(contextKey)!;
    history.push(metrics);
    
    // Maintain sliding window
    if (history.length > PERFORMANCE_CONFIG.MAX_RENDER_HISTORY) {
      history.shift();
    }
    
    // Update baseline with effect metrics
    this.updateBaseline(contextKey, metrics.contextType, metrics.contextId);
  }

  /**
   * Update performance baseline for a context
   */
  private updateBaseline(
    contextKey: string, 
    contextType: 'SUBSCRIPTION' | 'PAYMENT_INTENT' | 'AUTH',
    contextId: string
  ): PerformanceBaseline {
    const currentTime = Date.now();
    const renderHistory = this.renderHistory.get(contextKey) || [];
    const effectHistory = this.effectHistory.get(contextKey) || [];
    
    // Get current baseline or create new one
    let baseline = this.contextBaselines.get(contextKey);
    if (!baseline) {
      baseline = this.createInitialBaseline(contextType, contextId);
      this.contextBaselines.set(contextKey, baseline);
    }
    
    // Only update if we have enough data or it's been a full window
    const windowElapsed = currentTime - baseline.windowStart >= PERFORMANCE_CONFIG.PERFORMANCE_TRACKING_WINDOW;
    const hasEnoughData = renderHistory.length >= PERFORMANCE_CONFIG.BASELINE_SAMPLE_SIZE;
    
    if (windowElapsed || hasEnoughData) {
      baseline = this.calculateBaseline(contextType, contextId, renderHistory, effectHistory);
      this.contextBaselines.set(contextKey, baseline);
      
      // Log updated baseline
      this.logBaselineUpdate(baseline);
    }
    
    return baseline;
  }

  /**
   * Create initial baseline for a new context
   */
  private createInitialBaseline(
    contextType: 'SUBSCRIPTION' | 'PAYMENT_INTENT' | 'AUTH',
    contextId: string
  ): PerformanceBaseline {
    return {
      contextType,
      contextId,
      averageRenderTime: 0,
      renderFrequency: 0,
      burstEvents: 0,
      totalRenders: 0,
      windowStart: Date.now(),
      lastUpdated: Date.now(),
      p95RenderTime: 0,
      p99RenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: 0,
      standardDeviation: 0,
      averageEffectExecutionTime: 0,
      maxEffectExecutionTime: 0,
      totalEffectExecutions: 0,
      isHealthy: true,
      healthScore: 100,
      issues: [],
      recommendations: []
    };
  }

  /**
   * Calculate comprehensive performance baseline
   */
  private calculateBaseline(
    contextType: 'SUBSCRIPTION' | 'PAYMENT_INTENT' | 'AUTH',
    contextId: string,
    renderHistory: ContextRenderMetrics[],
    effectHistory: EffectExecutionMetrics[]
  ): PerformanceBaseline {
    const currentTime = Date.now();
    const windowStart = Math.max(
      currentTime - PERFORMANCE_CONFIG.PERFORMANCE_TRACKING_WINDOW,
      this.globalStartTime
    );
    
    // Filter data to current window
    const windowRenders = renderHistory.filter(r => r.timestamp >= windowStart);
    const windowEffects = effectHistory.filter(e => e.timestamp >= windowStart);
    
    // Calculate render metrics
    const renderTimes = windowRenders.map(r => r.timeSinceLastRender).filter(t => t > 0);
    const totalRenderTime = renderTimes.reduce((sum, time) => sum + time, 0);
    const averageRenderTime = renderTimes.length > 0 ? totalRenderTime / renderTimes.length : 0;
    
    // Calculate percentiles
    const sortedRenderTimes = [...renderTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedRenderTimes.length * 0.95);
    const p99Index = Math.floor(sortedRenderTimes.length * 0.99);
    
    // Calculate standard deviation
    const variance = renderTimes.length > 0 
      ? renderTimes.reduce((sum, time) => sum + Math.pow(time - averageRenderTime, 2), 0) / renderTimes.length
      : 0;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate effect metrics
    const effectTimes = windowEffects.map(e => e.executionTime);
    const averageEffectExecutionTime = effectTimes.length > 0 
      ? effectTimes.reduce((sum, time) => sum + time, 0) / effectTimes.length 
      : 0;
    
    // Calculate burst events
    const burstEvents = this.calculateBurstEvents(windowRenders);
    
    // Calculate render frequency (renders per second)
    const windowDurationSeconds = (currentTime - windowStart) / 1000;
    const renderFrequency = windowDurationSeconds > 0 ? windowRenders.length / windowDurationSeconds : 0;
    
    // Create baseline
    const baseline: PerformanceBaseline = {
      contextType,
      contextId,
      averageRenderTime,
      renderFrequency,
      burstEvents,
      totalRenders: renderHistory.length,
      windowStart,
      lastUpdated: currentTime,
      p95RenderTime: sortedRenderTimes[p95Index] || 0,
      p99RenderTime: sortedRenderTimes[p99Index] || 0,
      maxRenderTime: Math.max(...renderTimes, 0),
      minRenderTime: Math.min(...renderTimes, 0),
      standardDeviation,
      averageEffectExecutionTime,
      maxEffectExecutionTime: Math.max(...effectTimes, 0),
      totalEffectExecutions: effectHistory.length,
      isHealthy: true,
      healthScore: 100,
      issues: [],
      recommendations: []
    };
    
    // Analyze health and generate recommendations
    this.analyzeContextHealth(baseline);
    
    return baseline;
  }

  /**
   * Calculate burst events in render history
   */
  private calculateBurstEvents(renders: ContextRenderMetrics[]): number {
    let burstCount = 0;
    const currentTime = Date.now();
    
    for (let i = 0; i < renders.length; i++) {
      const render = renders[i];
      const burstWindow = renders.filter(
        r => Math.abs(r.timestamp - render.timestamp) <= PERFORMANCE_CONFIG.BURST_DETECTION_WINDOW
      );
      
      if (burstWindow.length >= PERFORMANCE_CONFIG.BURST_THRESHOLD) {
        burstCount++;
      }
    }
    
    return burstCount;
  }

  /**
   * Analyze context health and generate issues/recommendations
   */
  private analyzeContextHealth(baseline: PerformanceBaseline): void {
    const threshold = PERFORMANCE_CONFIG.CONTEXT_THRESHOLDS[baseline.contextType] || {
      EXPECTED_RENDERS_PER_MINUTE: 5,
      MAX_EFFECT_EXECUTION_TIME: 100, // ms
      MAX_RENDER_TIME: 50, // ms
    };
    const issues: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 100;
    
    // Check render frequency
    if (baseline.renderFrequency > PERFORMANCE_CONFIG.HIGH_FREQUENCY_THRESHOLD) {
      issues.push(`High render frequency: ${baseline.renderFrequency.toFixed(2)} renders/sec`);
      recommendations.push('Optimize component dependencies and memoization');
      healthScore -= 20;
    }
    
    // Check average render time
    if (baseline.averageRenderTime > threshold.MAX_RENDER_TIME) {
      issues.push(`Slow renders: ${baseline.averageRenderTime.toFixed(2)}ms avg (max: ${threshold.MAX_RENDER_TIME}ms)`);
      recommendations.push('Profile render performance and optimize expensive operations');
      healthScore -= 15;
    }
    
    // Check effect execution time
    if (baseline.averageEffectExecutionTime > threshold.MAX_EFFECT_EXECUTION_TIME) {
      issues.push(`Slow effects: ${baseline.averageEffectExecutionTime.toFixed(2)}ms avg (max: ${threshold.MAX_EFFECT_EXECUTION_TIME}ms)`);
      recommendations.push('Optimize useEffect hooks and async operations');
      healthScore -= 15;
    }
    
    // Check burst events
    if (baseline.burstEvents > 0) {
      issues.push(`Render bursts detected: ${baseline.burstEvents} events`);
      recommendations.push('Investigate potential render loops and infinite re-renders');
      healthScore -= 25;
    }
    
    // Check standard deviation (high variance indicates inconsistent performance)
    if (baseline.standardDeviation > baseline.averageRenderTime) {
      issues.push(`Inconsistent performance: σ=${baseline.standardDeviation.toFixed(2)}ms`);
      recommendations.push('Investigate performance variability sources');
      healthScore -= 10;
    }
    
    // Check P99 render time (outliers)
    if (baseline.p99RenderTime > baseline.averageRenderTime * 3) {
      issues.push(`Performance outliers: P99=${baseline.p99RenderTime.toFixed(2)}ms`);
      recommendations.push('Investigate worst-case performance scenarios');
      healthScore -= 10;
    }
    
    baseline.issues = issues;
    baseline.recommendations = recommendations;
    baseline.healthScore = Math.max(0, healthScore);
    baseline.isHealthy = healthScore >= 80;
  }

  /**
   * Log baseline update with detailed analysis
   */
  private logBaselineUpdate(baseline: PerformanceBaseline): void {
    const healthIcon = baseline.isHealthy ? '✅' : '⚠️';
    
    logger.log(`📊 PERFORMANCE BASELINE UPDATE ${healthIcon} [${baseline.contextType}-${baseline.contextId}]:`, {
      windowDuration: `${((Date.now() - baseline.windowStart) / 1000).toFixed(1)}s`,
      renderMetrics: {
        totalRenders: baseline.totalRenders,
        frequency: `${baseline.renderFrequency.toFixed(2)}/sec`,
        averageTime: `${baseline.averageRenderTime.toFixed(2)}ms`,
        p95Time: `${baseline.p95RenderTime.toFixed(2)}ms`,
        p99Time: `${baseline.p99RenderTime.toFixed(2)}ms`,
        standardDeviation: `${baseline.standardDeviation.toFixed(2)}ms`
      },
      effectMetrics: {
        totalEffects: baseline.totalEffectExecutions,
        averageTime: `${baseline.averageEffectExecutionTime.toFixed(2)}ms`,
        maxTime: `${baseline.maxEffectExecutionTime.toFixed(2)}ms`
      },
      healthScore: baseline.healthScore,
      burstEvents: baseline.burstEvents,
      issues: baseline.issues,
      recommendations: baseline.recommendations.slice(0, 2) // Show top 2 recommendations
    });
    
    // Log to structured logger
    logger.performance('Performance baseline updated', {
      contextType: baseline.contextType,
      contextId: baseline.contextId,
      healthScore: baseline.healthScore,
      isHealthy: baseline.isHealthy,
      renderFrequency: baseline.renderFrequency,
      averageRenderTime: baseline.averageRenderTime,
      burstEvents: baseline.burstEvents,
      issues: baseline.issues,
      recommendations: baseline.recommendations
    });
  }

  /**
   * Get baseline for a specific context
   */
  getBaseline(contextType: 'SUBSCRIPTION' | 'PAYMENT_INTENT' | 'AUTH', contextId: string): PerformanceBaseline | null {
    const contextKey = `${contextType}-${contextId}`;
    return this.contextBaselines.get(contextKey) || null;
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): PerformanceBaseline[] {
    return Array.from(this.contextBaselines.values());
  }

  /**
   * Generate comprehensive global performance report
   */
  generateGlobalReport(): GlobalPerformanceReport {
    const baselines = this.getAllBaselines();
    const currentTime = Date.now();
    const reportId = Math.random().toString(36).substr(2, 9);
    
    const healthyContexts = baselines.filter(b => b.isHealthy).length;
    const overallHealthScore = baselines.length > 0 
      ? baselines.reduce((sum, b) => sum + b.healthScore, 0) / baselines.length 
      : 100;
    
    // Analyze cross-context issues
    const globalIssues: string[] = [];
    const globalRecommendations: string[] = [];
    
    // Check for resource contention
    const concurrentRenders = this.calculateConcurrentRenders();
    const resourceContention = concurrentRenders > 2; // More than 2 contexts rendering simultaneously
    
    if (resourceContention) {
      globalIssues.push(`Resource contention: ${concurrentRenders} concurrent render events`);
      globalRecommendations.push('Implement render scheduling and context coordination');
    }
    
    // Check for system-wide performance degradation
    const totalBursts = baselines.reduce((sum, b) => sum + b.burstEvents, 0);
    if (totalBursts > 5) {
      globalIssues.push(`System-wide render instability: ${totalBursts} total burst events`);
      globalRecommendations.push('Investigate global state management and prop drilling');
    }
    
    const report: GlobalPerformanceReport = {
      timestamp: currentTime,
      reportId,
      totalContexts: baselines.length,
      healthyContexts,
      contexts: baselines,
      globalIssues,
      globalRecommendations,
      overallHealthScore,
      crossContextBursts: totalBursts,
      concurrentRenderEvents: concurrentRenders,
      resourceContention
    };
    
    this.logGlobalReport(report);
    
    return report;
  }

  /**
   * Calculate concurrent render events across all contexts
   */
  private calculateConcurrentRenders(): number {
    const allRenders: ContextRenderMetrics[] = [];
    
    for (const history of this.renderHistory.values()) {
      allRenders.push(...history);
    }
    
    allRenders.sort((a, b) => a.timestamp - b.timestamp);
    
    let maxConcurrent = 0;
    const window = 50; // 50ms window for concurrency
    
    for (let i = 0; i < allRenders.length; i++) {
      const baseTime = allRenders[i].timestamp;
      const concurrent = allRenders.filter(
        r => Math.abs(r.timestamp - baseTime) <= window
      ).length;
      
      maxConcurrent = Math.max(maxConcurrent, concurrent);
    }
    
    return maxConcurrent;
  }

  /**
   * Log global performance report
   */
  private logGlobalReport(report: GlobalPerformanceReport): void {
    const healthIcon = report.overallHealthScore >= 80 ? '✅' : report.overallHealthScore >= 60 ? '⚠️' : '🚨';
    
    logger.log(`🌍 GLOBAL PERFORMANCE REPORT ${healthIcon} [Report ID: ${report.reportId}]:`, {
      summary: {
        totalContexts: report.totalContexts,
        healthyContexts: report.healthyContexts,
        overallHealthScore: Math.round(report.overallHealthScore),
        resourceContention: report.resourceContention
      },
      crossContextMetrics: {
        totalBursts: report.crossContextBursts,
        maxConcurrentRenders: report.concurrentRenderEvents
      },
      contextHealthScores: report.contexts.map(c => ({
        context: `${c.contextType}-${c.contextId.substr(0, 6)}`,
        score: c.healthScore,
        issues: c.issues.length
      })),
      globalIssues: report.globalIssues,
      topRecommendations: report.globalRecommendations.slice(0, 3)
    });
  }

  /**
   * Reset all performance data (for testing or cleanup)
   */
  reset(): void {
    this.contextBaselines.clear();
    this.renderHistory.clear();
    this.effectHistory.clear();
    this.globalStartTime = Date.now();
    
    logger.log('🔄 Performance baseline manager reset');
  }
}

// Export singleton instance
export const performanceManager = PerformanceBaselineManager.getInstance();

// Utility functions for easy integration
export const recordRender = (metrics: ContextRenderMetrics): PerformanceBaseline => {
  return performanceManager.recordRender(metrics);
};

export const recordEffectExecution = (metrics: EffectExecutionMetrics): void => {
  performanceManager.recordEffectExecution(metrics);
};

export const getBaseline = (
  contextType: 'SUBSCRIPTION' | 'PAYMENT_INTENT' | 'AUTH', 
  contextId: string
): PerformanceBaseline | null => {
  return performanceManager.getBaseline(contextType, contextId);
};

export const generateGlobalReport = (): GlobalPerformanceReport => {
  return performanceManager.generateGlobalReport();
};

// Auto-generate global report every 2 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const baselines = performanceManager.getAllBaselines();
    if (baselines.length > 0) {
      generateGlobalReport();
    }
  }, 120000); // 2 minutes
}