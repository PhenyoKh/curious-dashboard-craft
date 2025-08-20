/**
 * Centralized Subscription Context - Enhanced with Ultra-Detailed Monitoring
 * 
 * This context provides a single useSubscription hook instance to the entire app,
 * eliminating multiple simultaneous subscription queries and preventing resource exhaustion.
 * 
 * PHASE 0 ENHANCEMENTS:
 * - Comprehensive render tracking with timing analysis
 * - Burst detection for potential render loops (>5 renders in <100ms)
 * - Performance baseline metrics and sliding window analysis
 * - Detailed execution logging for debugging
 * 
 * IMPORTANT: This replaces all direct useSubscription() calls throughout the app.
 */

import React, { createContext, useContext, useRef, Profiler } from 'react';
import { useSubscription, type UseSubscriptionReturn } from '@/hooks/useSubscription';
import { logger } from '@/utils/logger';
import { 
  recordRender, 
  recordEffectExecution, 
  type ContextRenderMetrics, 
  type EffectExecutionMetrics 
} from '@/utils/performanceBaseline';
import { createProfilerCallback } from '@/utils/profilerIntegration';

// Phase 0: Enhanced monitoring configuration
const BURST_DETECTION_WINDOW = 100; // 100ms window for burst detection
const BURST_THRESHOLD = 5; // >5 renders in window = potential loop
const PERFORMANCE_TRACKING_WINDOW = 60000; // 1 minute sliding window
const MAX_RENDER_HISTORY = 100; // Keep last 100 render records

interface RenderMetrics {
  timestamp: number;
  renderNumber: number;
  timeSinceLastRender: number;
  subscriptionState: {
    hasSubscription: boolean;
    status: string | undefined;
    isLoading: boolean;
    isUpgrading: boolean;
    plansCount: number;
  };
  performanceEntry?: PerformanceEntry;
}

interface PerformanceBaseline {
  averageRenderTime: number;
  renderFrequency: number;
  burstEvents: number;
  totalRenders: number;
  windowStart: number;
}

interface SubscriptionContextType extends UseSubscriptionReturn {
  // Add context-specific metadata
  _contextId: string;
  _renderCount: number;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  // Generate unique context instance ID for debugging
  const contextId = useRef(Math.random().toString(36).substr(2, 9));
  
  // PHASE 0.3: Create profiler callback for advanced render tracking
  const onRenderProfiler = createProfilerCallback('SubscriptionContext');
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const renderHistory = useRef<RenderMetrics[]>([]);
  const performanceBaseline = useRef<PerformanceBaseline>({
    averageRenderTime: 0,
    renderFrequency: 0,
    burstEvents: 0,
    totalRenders: 0,
    windowStart: Date.now()
  });

  // Single useSubscription call for entire app
  const subscriptionData = useSubscription();

  // PHASE 0: Ultra-detailed render tracking and burst detection
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTime.current;
  renderCount.current++;

  // Create detailed render metrics
  const currentRenderMetrics: RenderMetrics = {
    timestamp: currentTime,
    renderNumber: renderCount.current,
    timeSinceLastRender,
    subscriptionState: {
      hasSubscription: !!subscriptionData.subscription,
      status: subscriptionData.subscription?.status,
      isLoading: subscriptionData.isLoading,
      isUpgrading: subscriptionData.isUpgrading,
      plansCount: subscriptionData.plans?.length || 0
    },
    performanceEntry: performance.getEntriesByType('measure').slice(-1)[0]
  };

  // Add to render history (maintain sliding window)
  renderHistory.current.push(currentRenderMetrics);
  if (renderHistory.current.length > MAX_RENDER_HISTORY) {
    renderHistory.current.shift();
  }

  // BURST DETECTION: Check for potential render loops
  const recentRenders = renderHistory.current.filter(
    render => currentTime - render.timestamp <= BURST_DETECTION_WINDOW
  );

  const isBurstDetected = recentRenders.length >= BURST_THRESHOLD;
  if (isBurstDetected) {
    performanceBaseline.current.burstEvents++;
    console.error(`🚨 BURST DETECTED [${contextId.current}] - ${recentRenders.length} renders in ${BURST_DETECTION_WINDOW}ms:`, {
      renderNumbers: recentRenders.map(r => r.renderNumber),
      timestamps: recentRenders.map(r => new Date(r.timestamp).toISOString()),
      timings: recentRenders.map(r => r.timeSinceLastRender),
      subscriptionStates: recentRenders.map(r => r.subscriptionState),
      burstEventCount: performanceBaseline.current.burstEvents,
      stackTrace: new Error().stack
    });
  }

  // PERFORMANCE BASELINE: Update sliding window metrics
  const windowStart = performanceBaseline.current.windowStart;
  if (currentTime - windowStart >= PERFORMANCE_TRACKING_WINDOW) {
    // Calculate performance metrics for this window
    const windowRenders = renderHistory.current.filter(r => r.timestamp >= windowStart);
    const totalRenderTime = windowRenders.reduce((sum, r) => sum + r.timeSinceLastRender, 0);
    
    performanceBaseline.current = {
      averageRenderTime: windowRenders.length > 0 ? totalRenderTime / windowRenders.length : 0,
      renderFrequency: windowRenders.length / (PERFORMANCE_TRACKING_WINDOW / 1000), // renders per second
      burstEvents: performanceBaseline.current.burstEvents,
      totalRenders: renderCount.current,
      windowStart: currentTime
    };

    // Log performance baseline
    console.log(`📊 SUBSCRIPTION CONTEXT PERFORMANCE BASELINE [${contextId.current}]:`, {
      window: `${new Date(windowStart).toISOString()} to ${new Date(currentTime).toISOString()}`,
      averageRenderTime: `${performanceBaseline.current.averageRenderTime.toFixed(2)}ms`,
      renderFrequency: `${performanceBaseline.current.renderFrequency.toFixed(2)} renders/sec`,
      burstEvents: performanceBaseline.current.burstEvents,
      totalRenders: performanceBaseline.current.totalRenders,
      windowRenderCount: windowRenders.length
    });
  }

  // PHASE 0.1: Record render metrics to centralized performance baseline
  const contextRenderMetrics: ContextRenderMetrics = {
    ...currentRenderMetrics,
    contextType: 'SUBSCRIPTION',
    contextId: contextId.current,
    state: currentRenderMetrics.subscriptionState
  };
  
  // Update centralized performance baseline
  const updatedBaseline = recordRender(contextRenderMetrics);

  // Enhanced logging for subscription context usage
  console.log(`🔄 SUBSCRIPTION CONTEXT [${contextId.current}] - Render #${renderCount.current}:`, {
    timing: {
      timestamp: new Date(currentTime).toISOString(),
      timeSinceLastRender: `${timeSinceLastRender}ms`,
      isBurstDetected,
      recentRenderCount: recentRenders.length
    },
    subscriptionState: currentRenderMetrics.subscriptionState,
    performance: {
      local: {
        averageRenderTime: `${performanceBaseline.current.averageRenderTime.toFixed(2)}ms`,
        renderFrequency: `${performanceBaseline.current.renderFrequency.toFixed(2)}/sec`,
        totalBursts: performanceBaseline.current.burstEvents
      },
      baseline: {
        healthScore: updatedBaseline.healthScore,
        isHealthy: updatedBaseline.isHealthy,
        p95RenderTime: `${updatedBaseline.p95RenderTime.toFixed(2)}ms`,
        issues: updatedBaseline.issues.length,
        recommendations: updatedBaseline.recommendations.length
      }
    }
  });

  // Update last render time
  lastRenderTime.current = currentTime;

  // PHASE 0.1: Enhanced effect execution logging with comprehensive tracking
  React.useEffect(() => {
    const effectStartTime = performance.now();
    const effectExecutionId = Math.random().toString(36).substr(2, 9);
    const stackTrace = new Error().stack;
    
    console.log(`🔧 EFFECT EXECUTION START [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
      effectName: 'SubscriptionContext-Mount-Status-Change',
      trigger: 'subscriptionData.subscription?.status',
      currentStatus: subscriptionData.subscription?.status,
      hasSubscription: !!subscriptionData.subscription,
      executionStartTime: effectStartTime,
      renderNumber: renderCount.current,
      stackTrace: stackTrace?.split('\n').slice(1, 4).join('\n') || 'No stack trace',
      timestamp: new Date().toISOString()
    });

    const effectExecutionTime = performance.now() - effectStartTime;
    
    // PHASE 0.1: Record effect execution to centralized performance baseline
    const effectMetrics: EffectExecutionMetrics = {
      effectId: effectExecutionId,
      effectName: 'SubscriptionContext-Mount-Status-Change',
      contextType: 'SUBSCRIPTION',
      contextId: contextId.current,
      executionTime: effectExecutionTime,
      timestamp: Date.now(),
      trigger: 'subscriptionData.subscription?.status',
      stackTrace: stackTrace?.split('\n').slice(1, 4).join('\n') || 'No stack trace'
    };
    
    recordEffectExecution(effectMetrics);

    // Track the effect execution
    logger.subscription('SubscriptionContext effect executed', {
      contextId: contextId.current,
      effectId: effectExecutionId,
      hasSubscription: !!subscriptionData.subscription,
      subscriptionStatus: subscriptionData.subscription?.status,
      renderNumber: renderCount.current,
      effectExecutionTime
    });

    // Cleanup function with detailed logging
    return () => {
      const cleanupStartTime = performance.now();
      
      console.log(`🧹 EFFECT CLEANUP [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
        effectName: 'SubscriptionContext-Mount-Status-Change',
        cleanupStartTime,
        effectLifetime: cleanupStartTime - effectStartTime,
        finalStatus: subscriptionData.subscription?.status,
        finalHasSubscription: !!subscriptionData.subscription,
        timestamp: new Date().toISOString()
      });

      logger.subscription('SubscriptionContext effect cleanup', {
        contextId: contextId.current,
        effectId: effectExecutionId,
        effectLifetime: cleanupStartTime - effectStartTime
      });
    };
  }, [subscriptionData.subscription?.status]);

  // PHASE 0.1: Additional effect for tracking subscription data changes
  React.useEffect(() => {
    const effectStartTime = performance.now();
    const effectExecutionId = Math.random().toString(36).substr(2, 9);
    
    console.log(`🔧 EFFECT EXECUTION START [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
      effectName: 'SubscriptionContext-Data-Change-Monitor',
      trigger: 'subscriptionData object changes',
      subscriptionDataKeys: Object.keys(subscriptionData || {}),
      isLoading: subscriptionData.isLoading,
      isUpgrading: subscriptionData.isUpgrading,
      plansCount: subscriptionData.plans?.length || 0,
      hasSubscription: !!subscriptionData.subscription,
      executionStartTime: effectStartTime,
      renderNumber: renderCount.current,
      timestamp: new Date().toISOString()
    });

    const effectExecutionTime = performance.now() - effectStartTime;
    
    // PHASE 0.1: Record effect execution to centralized performance baseline
    const effectMetrics: EffectExecutionMetrics = {
      effectId: effectExecutionId,
      effectName: 'SubscriptionContext-Data-Change-Monitor',
      contextType: 'SUBSCRIPTION',
      contextId: contextId.current,
      executionTime: effectExecutionTime,
      timestamp: Date.now(),
      trigger: 'subscriptionData object changes'
    };
    
    recordEffectExecution(effectMetrics);

    return () => {
      const cleanupStartTime = performance.now();
      
      console.log(`🧹 EFFECT CLEANUP [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
        effectName: 'SubscriptionContext-Data-Change-Monitor',
        effectLifetime: cleanupStartTime - effectStartTime,
        timestamp: new Date().toISOString()
      });
    };
  }, [subscriptionData]);

  const contextValue: SubscriptionContextType = {
    ...subscriptionData,
    _contextId: contextId.current,
    _renderCount: renderCount.current,
  };

  return (
    <Profiler id={`SubscriptionContext-${contextId.current}`} onRender={onRenderProfiler}>
      <SubscriptionContext.Provider value={contextValue}>
        {children}
      </SubscriptionContext.Provider>
    </Profiler>
  );
};

/**
 * Hook to consume subscription context
 * 
 * This replaces all direct useSubscription() calls throughout the app.
 * Throws an error if used outside of SubscriptionProvider.
 */
export const useSubscriptionContext = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    throw new Error(
      'useSubscriptionContext must be used within a SubscriptionProvider. ' +
      'Make sure to wrap your app with <SubscriptionProvider>.'
    );
  }

  // Log context usage for debugging
  const callerInfo = new Error().stack?.split('\n')[2]?.trim() || 'Unknown caller';
  
  console.log(`📡 SUBSCRIPTION CONTEXT USAGE [${context._contextId}]:`, {
    caller: callerInfo,
    hasSubscription: !!context.subscription,
    subscriptionStatus: context.subscription?.status,
    isLoading: context.isLoading,
    timestamp: new Date().toISOString()
  });

  return context;
};

/**
 * Higher-order component for subscription-dependent components
 * 
 * Provides subscription context to components that need it without
 * requiring manual context setup.
 */
export const withSubscriptionContext = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => {
    const subscription = useSubscriptionContext();
    
    return (
      <Component 
        {...props} 
        subscription={subscription}
      />
    );
  };

  WrappedComponent.displayName = `withSubscriptionContext(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default SubscriptionProvider;