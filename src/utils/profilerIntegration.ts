/**
 * React.Profiler Integration with Performance Baseline System - Phase 0.3
 * 
 * This utility provides seamless integration between React.Profiler onRender callbacks
 * and the existing performance baseline monitoring system. It captures detailed render
 * metrics and feeds them into our centralized performance tracking infrastructure.
 */

import { Profiler } from 'react';
import { recordRender, type ContextRenderMetrics } from '@/utils/performanceBaseline';
import { logger } from '@/utils/logger';

export interface ProfilerRenderMetrics {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<unknown>;
}

export interface ComponentProfilerState {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  avgRenderTime: number;
  mountTime: number | null;
  lastUpdateTime: number;
  mountToCommitDuration: number | null;
  phaseBreakdown: {
    mount: number;
    update: number;
    nestedUpdate: number;
  };
}

class ProfilerIntegrationManager {
  private static instance: ProfilerIntegrationManager;
  private componentStates = new Map<string, ComponentProfilerState>();
  private profilerReports: ProfilerRenderMetrics[] = [];
  private readonly MAX_REPORT_HISTORY = 1000;

  static getInstance(): ProfilerIntegrationManager {
    if (!ProfilerIntegrationManager.instance) {
      ProfilerIntegrationManager.instance = new ProfilerIntegrationManager();
    }
    return ProfilerIntegrationManager.instance;
  }

  /**
   * Create onRender callback for React.Profiler
   */
  createProfilerCallback(componentName: string) {
    return (
      id: string,
      phase: 'mount' | 'update' | 'nested-update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number,
      interactions: Set<unknown>
    ) => {
      try {
        const metrics: ProfilerRenderMetrics = {
          id,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
          interactions: interactions || new Set()
        };

        // Store render metrics
        this.recordRenderMetrics(componentName, metrics);
        
        // Integrate with performance baseline system
        this.integrateWithPerformanceBaseline(componentName, metrics);
        
        // Log detailed profiler data
        this.logProfilerMetrics(componentName, metrics);
      } catch (error) {
        // Prevent profiler errors from crashing the app
        logger.error(`🚨 PROFILER ERROR [${componentName}]:`, error);
        // Log minimal safe fallback data
        if (typeof console !== 'undefined' && console.warn) {
          logger.warn(`📊 PROFILER [${componentName}] - Render (error in detailed tracking)`);
        }
      }
    };
  }

  /**
   * Record render metrics for component
   */
  private recordRenderMetrics(componentName: string, metrics: ProfilerRenderMetrics): void {
    let state = this.componentStates.get(componentName);
    
    if (!state) {
      state = {
        componentName,
        renderCount: 0,
        totalRenderTime: 0,
        avgRenderTime: 0,
        mountTime: null,
        lastUpdateTime: performance.now(),
        mountToCommitDuration: null,
        phaseBreakdown: {
          mount: 0,
          update: 0,
          nestedUpdate: 0
        }
      };
      this.componentStates.set(componentName, state);
    }

    // Update state
    state.renderCount++;
    state.totalRenderTime += metrics.actualDuration;
    state.avgRenderTime = state.totalRenderTime / state.renderCount;
    state.lastUpdateTime = performance.now();

    // Track mount timing
    if (metrics.phase === 'mount' && state.mountTime === null) {
      state.mountTime = metrics.commitTime;
      state.mountToCommitDuration = metrics.commitTime - metrics.startTime;
    }

    // Update phase breakdown
    state.phaseBreakdown[metrics.phase] += metrics.actualDuration;

    // Store report (with history limit)
    this.profilerReports.push(metrics);
    if (this.profilerReports.length > this.MAX_REPORT_HISTORY) {
      this.profilerReports = this.profilerReports.slice(-this.MAX_REPORT_HISTORY + 100);
    }
  }

  /**
   * Integrate profiler data with performance baseline system
   */
  private integrateWithPerformanceBaseline(componentName: string, metrics: ProfilerRenderMetrics): void {
    // Create ContextRenderMetrics compatible with performance baseline system
    const contextMetrics: ContextRenderMetrics = {
      contextType: `PROFILER_${componentName.toUpperCase()}` as any,
      contextId: `profiler-${componentName}`,
      renderTime: metrics.actualDuration,
      renderTimestamp: metrics.commitTime,
      burstDetection: false, // We'll handle burst detection separately
      stateSnapshot: {
        phase: metrics.phase,
        baseDuration: metrics.baseDuration,
        startTime: metrics.startTime,
        interactionCount: metrics.interactions?.size || 0,
        componentName
      }
    };

    // Report render to performance baseline system
    recordRender(contextMetrics);

    // Check for performance issues specific to profiler data
    this.checkProfilerPerformanceIssues(componentName, metrics);
  }

  /**
   * Check for performance issues in profiler data
   */
  private checkProfilerPerformanceIssues(componentName: string, metrics: ProfilerRenderMetrics): void {
    const state = this.componentStates.get(componentName)!;
    
    // Slow render detection
    if (metrics.actualDuration > 50) { // >50ms is slow
      logger.performance(`🐌 SLOW RENDER DETECTED [${componentName}]`, {
        actualDuration: metrics.actualDuration,
        baseDuration: metrics.baseDuration,
        phase: metrics.phase,
        renderCount: state.renderCount
      });
    }

    // Inefficient re-render detection (actual >> base duration)
    const inefficiencyRatio = metrics.actualDuration / Math.max(metrics.baseDuration, 1);
    if (inefficiencyRatio > 3) { // Actual is 3x+ base duration
      logger.performance(`⚡ INEFFICIENT RENDER [${componentName}]`, {
        inefficiencyRatio: inefficiencyRatio.toFixed(2),
        actualDuration: metrics.actualDuration,
        baseDuration: metrics.baseDuration,
        possibleCause: 'Expensive operations in render, missing memoization'
      });
    }

    // Nested update detection
    if (metrics.phase === 'nested-update' && metrics.actualDuration > 10) {
      logger.performance(`🔄 NESTED UPDATE DETECTED [${componentName}]`, {
        actualDuration: metrics.actualDuration,
        renderCount: state.renderCount,
        warning: 'Nested updates can cause performance issues'
      });
    }

    // Mount performance analysis
    if (metrics.phase === 'mount' && state.mountToCommitDuration! > 100) {
      logger.performance(`🚀 SLOW MOUNT [${componentName}]`, {
        mountToCommitDuration: state.mountToCommitDuration,
        actualDuration: metrics.actualDuration,
        recommendation: 'Consider lazy loading or code splitting'
      });
    }
  }

  /**
   * Log detailed profiler metrics
   */
  private logProfilerMetrics(componentName: string, metrics: ProfilerRenderMetrics): void {
    const state = this.componentStates.get(componentName)!;
    
    logger.performance(`📊 PROFILER [${componentName}] - Render #${state.renderCount}`, {
      phase: metrics.phase,
      actualDuration: `${metrics.actualDuration.toFixed(2)}ms`,
      baseDuration: `${metrics.baseDuration.toFixed(2)}ms`,
      efficiency: `${((metrics.baseDuration / metrics.actualDuration) * 100).toFixed(1)}%`,
      avgRenderTime: `${state.avgRenderTime.toFixed(2)}ms`,
      totalRenders: state.renderCount,
      interactions: metrics.interactions?.size || 0,
      timestamp: new Date(metrics.commitTime).toISOString()
    });
  }

  /**
   * Get component profiler state
   */
  getComponentState(componentName: string): ComponentProfilerState | undefined {
    return this.componentStates.get(componentName);
  }

  /**
   * Get all component states
   */
  getAllComponentStates(): Map<string, ComponentProfilerState> {
    return new Map(this.componentStates);
  }

  /**
   * Generate profiler performance report
   */
  generateProfilerReport(): {
    totalComponents: number;
    totalRenders: number;
    avgRenderTime: number;
    slowestComponent: string | null;
    fastestComponent: string | null;
    componentBreakdown: Array<{
      name: string;
      renders: number;
      avgTime: number;
      totalTime: number;
      efficiency: number;
    }>;
    recentMetrics: ProfilerRenderMetrics[];
  } {
    const components = Array.from(this.componentStates.values());
    const totalRenders = components.reduce((sum, c) => sum + c.renderCount, 0);
    const totalRenderTime = components.reduce((sum, c) => sum + c.totalRenderTime, 0);
    
    let slowestComponent: string | null = null;
    let fastestComponent: string | null = null;
    let maxAvgTime = 0;
    let minAvgTime = Infinity;

    const componentBreakdown = components.map(comp => {
      if (comp.avgRenderTime > maxAvgTime) {
        maxAvgTime = comp.avgRenderTime;
        slowestComponent = comp.componentName;
      }
      if (comp.avgRenderTime < minAvgTime && comp.renderCount > 0) {
        minAvgTime = comp.avgRenderTime;
        fastestComponent = comp.componentName;
      }

      // Calculate efficiency (base duration vs actual duration)
      const recentMetrics = this.profilerReports
        .filter(r => r.id.includes(comp.componentName.toLowerCase()))
        .slice(-10); // Last 10 renders
      
      const avgEfficiency = recentMetrics.length > 0 ? 
        recentMetrics.reduce((sum, m) => sum + (m.baseDuration / m.actualDuration), 0) / recentMetrics.length * 100 : 100;

      return {
        name: comp.componentName,
        renders: comp.renderCount,
        avgTime: Math.round(comp.avgRenderTime * 100) / 100,
        totalTime: Math.round(comp.totalRenderTime * 100) / 100,
        efficiency: Math.round(avgEfficiency)
      };
    });

    return {
      totalComponents: components.length,
      totalRenders,
      avgRenderTime: totalRenderTime / Math.max(totalRenders, 1),
      slowestComponent,
      fastestComponent,
      componentBreakdown: componentBreakdown.sort((a, b) => b.avgTime - a.avgTime),
      recentMetrics: this.profilerReports.slice(-50) // Last 50 renders
    };
  }

  /**
   * Clear profiler data for component
   */
  clearComponentData(componentName: string): void {
    this.componentStates.delete(componentName);
    this.profilerReports = this.profilerReports.filter(r => !r.id.includes(componentName.toLowerCase()));
  }

  /**
   * Clear all profiler data
   */
  clearAllData(): void {
    this.componentStates.clear();
    this.profilerReports = [];
  }
}

// Export singleton instance
export const profilerIntegration = ProfilerIntegrationManager.getInstance();

// Convenience function to create profiler callback
export const createProfilerCallback = (componentName: string) => {
  return profilerIntegration.createProfilerCallback(componentName);
};

// Auto-generate profiler reports every 2 minutes (aligned with performance baseline)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const components = profilerIntegration.getAllComponentStates();
    if (components.size > 0) {
      const report = profilerIntegration.generateProfilerReport();
      
      logger.performance('📊 PROFILER SYSTEM REPORT', {
        totalComponents: report.totalComponents,
        totalRenders: report.totalRenders,
        avgRenderTime: `${report.avgRenderTime.toFixed(2)}ms`,
        slowestComponent: report.slowestComponent,
        fastestComponent: report.fastestComponent,
        topComponents: report.componentBreakdown.slice(0, 3)
      });
    }
  }, 120000); // 2 minutes
}

export type { ProfilerRenderMetrics, ComponentProfilerState };