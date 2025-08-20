/**
 * Centralized Payment Intent Context - Enhanced with Ultra-Detailed Monitoring
 * 
 * This context provides centralized payment intent state management,
 * preventing loss of payment context during redirects and auth flows.
 * 
 * PHASE 0 ENHANCEMENTS:
 * - Comprehensive render tracking with timing analysis
 * - Burst detection for potential render loops (>5 renders in <100ms)
 * - Performance baseline metrics and sliding window analysis
 * - Detailed execution logging for debugging
 * 
 * Coordinates payment intent across AuthScreen, AuthCallback, and Pricing components.
 */

import React, { createContext, useContext, useState, useEffect, useRef, Profiler } from 'react';
import { useLocation } from 'react-router-dom';
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
  paymentIntentState: {
    hasIntent: boolean;
    intent: string | null;
    planId: string | null;
    source: string | null;
    isValid: boolean;
  };
  locationSearch: string;
  performanceEntry?: PerformanceEntry;
}

interface PerformanceBaseline {
  averageRenderTime: number;
  renderFrequency: number;
  burstEvents: number;
  totalRenders: number;
  windowStart: number;
}

interface PaymentIntent {
  intent: string | null;
  planId: string | null;
  source: 'url' | 'storage' | 'manual' | null;
  timestamp: number;
}

interface PaymentIntentContextType {
  // Current payment intent state
  paymentIntent: PaymentIntent;
  
  // Intent management
  setPaymentIntent: (intent: string | null, planId: string | null, source?: 'manual') => void;
  clearPaymentIntent: () => void;
  hasPaymentIntent: () => boolean;
  
  // Utility methods
  isValidPaymentIntent: () => boolean;
  getPaymentIntentUrl: (baseUrl: string) => string;
  
  // Context metadata (enhanced with monitoring)
  _contextId: string;
  _renderCount: number;
}

const PaymentIntentContext = createContext<PaymentIntentContextType | null>(null);

// Storage configuration
const PAYMENT_INTENT_STORAGE_KEY = 'scola_payment_intent';
const PAYMENT_INTENT_EXPIRY_MINUTES = 30; // Payment intent expires after 30 minutes

// Storage utilities
const savePaymentIntentToStorage = (intent: PaymentIntent) => {
  try {
    const expiryTime = Date.now() + (PAYMENT_INTENT_EXPIRY_MINUTES * 60 * 1000);
    const storageData = {
      ...intent,
      expiresAt: expiryTime
    };
    localStorage.setItem(PAYMENT_INTENT_STORAGE_KEY, JSON.stringify(storageData));
    
    logger.subscription('Payment intent saved to storage', {
      intent: intent.intent,
      planId: intent.planId,
      source: intent.source,
      expiresAt: new Date(expiryTime).toISOString()
    });
  } catch (error) {
    logger.error('Failed to save payment intent to storage:', error);
  }
};

const loadPaymentIntentFromStorage = (): PaymentIntent | null => {
  try {
    const stored = localStorage.getItem(PAYMENT_INTENT_STORAGE_KEY);
    if (!stored) return null;

    const storageData = JSON.parse(stored);
    
    // Check if payment intent has expired
    if (Date.now() > storageData.expiresAt) {
      localStorage.removeItem(PAYMENT_INTENT_STORAGE_KEY);
      logger.subscription('Expired payment intent removed from storage');
      return null;
    }

    const intent: PaymentIntent = {
      intent: storageData.intent,
      planId: storageData.planId,
      source: 'storage',
      timestamp: storageData.timestamp
    };

    logger.subscription('Payment intent restored from storage', {
      intent: intent.intent,
      planId: intent.planId,
      age: Math.round((Date.now() - intent.timestamp) / 1000 / 60) + ' minutes'
    });
    
    return intent;
  } catch (error) {
    logger.error('Failed to load payment intent from storage:', error);
    localStorage.removeItem(PAYMENT_INTENT_STORAGE_KEY);
    return null;
  }
};

const clearPaymentIntentFromStorage = () => {
  try {
    localStorage.removeItem(PAYMENT_INTENT_STORAGE_KEY);
    logger.subscription('Payment intent cleared from storage');
  } catch (error) {
    logger.error('Failed to clear payment intent from storage:', error);
  }
};

interface PaymentIntentProviderProps {
  children: React.ReactNode;
}

export const PaymentIntentProvider: React.FC<PaymentIntentProviderProps> = ({ children }) => {
  const location = useLocation();
  
  // Generate unique context instance ID for debugging
  const contextId = useRef(Math.random().toString(36).substr(2, 9));
  
  // PHASE 0.3: Create profiler callback for advanced render tracking
  const onRenderProfiler = createProfilerCallback('PaymentIntentContext');
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
  
  const [paymentIntent, setPaymentIntentState] = useState<PaymentIntent>({
    intent: null,
    planId: null,
    source: null,
    timestamp: Date.now()
  });

  // PHASE 0: Ultra-detailed render tracking and burst detection
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTime.current;
  renderCount.current++;

  // Create detailed render metrics
  const currentRenderMetrics: RenderMetrics = {
    timestamp: currentTime,
    renderNumber: renderCount.current,
    timeSinceLastRender,
    paymentIntentState: {
      hasIntent: !!(paymentIntent.intent && paymentIntent.planId),
      intent: paymentIntent.intent,
      planId: paymentIntent.planId,
      source: paymentIntent.source,
      isValid: paymentIntent.intent === 'plan' && !!paymentIntent.planId
    },
    locationSearch: location.search,
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
    logger.error(`🚨 BURST DETECTED [${contextId.current}] - ${recentRenders.length} renders in ${BURST_DETECTION_WINDOW}ms:`, {
      renderNumbers: recentRenders.map(r => r.renderNumber),
      timestamps: recentRenders.map(r => new Date(r.timestamp).toISOString()),
      timings: recentRenders.map(r => r.timeSinceLastRender),
      paymentIntentStates: recentRenders.map(r => r.paymentIntentState),
      locationSearches: recentRenders.map(r => r.locationSearch),
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
    logger.log(`📊 PAYMENT INTENT CONTEXT PERFORMANCE BASELINE [${contextId.current}]:`, {
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
    contextType: 'PAYMENT_INTENT',
    contextId: contextId.current,
    state: {
      ...currentRenderMetrics.paymentIntentState,
      locationSearch: currentRenderMetrics.locationSearch
    }
  };
  
  // Update centralized performance baseline
  const updatedBaseline = recordRender(contextRenderMetrics);

  // Enhanced logging for payment intent context usage
  logger.log(`🔄 PAYMENT INTENT CONTEXT [${contextId.current}] - Render #${renderCount.current}:`, {
    timing: {
      timestamp: new Date(currentTime).toISOString(),
      timeSinceLastRender: `${timeSinceLastRender}ms`,
      isBurstDetected,
      recentRenderCount: recentRenders.length
    },
    paymentIntentState: currentRenderMetrics.paymentIntentState,
    location: {
      search: location.search,
      pathname: location.pathname
    },
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

  // PHASE 0.1: Enhanced effect execution logging - Initialize payment intent from URL params or storage
  useEffect(() => {
    const effectStartTime = performance.now();
    const effectExecutionId = Math.random().toString(36).substr(2, 9);
    const stackTrace = new Error().stack;
    
    logger.log(`🔧 EFFECT EXECUTION START [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
      effectName: 'PaymentIntent-URL-Storage-Initialization',
      trigger: 'location.search changes',
      currentLocationSearch: location.search,
      urlParams: new URLSearchParams(location.search).toString(),
      executionStartTime: effectStartTime,
      renderNumber: renderCount.current,
      stackTrace: stackTrace?.split('\n').slice(1, 4).join('\n') || 'No stack trace',
      timestamp: new Date().toISOString()
    });

    const initializePaymentIntent = () => {
      const initStartTime = performance.now();
      
      // First, check URL parameters
      const urlParams = new URLSearchParams(location.search);
      const intentParam = urlParams.get('intent');
      const planIdParam = urlParams.get('planId');
      
      logger.log(`🔍 PAYMENT INTENT URL PARAMS ANALYSIS [${contextId.current}]:`, {
        effectId: effectExecutionId,
        locationSearch: location.search,
        intentParam,
        planIdParam,
        hasIntentParam: !!intentParam,
        hasPlanIdParam: !!planIdParam,
        willInitializeFromURL: !!(intentParam || planIdParam)
      });
      
      if (intentParam || planIdParam) {
        const newIntent: PaymentIntent = {
          intent: intentParam,
          planId: planIdParam,
          source: 'url',
          timestamp: Date.now()
        };
        
        setPaymentIntentState(newIntent);
        savePaymentIntentToStorage(newIntent);
        
        const initializationTime = performance.now() - initStartTime;
        
        logger.subscription('Payment intent initialized from URL', {
          intent: intentParam,
          planId: planIdParam,
          url: location.search,
          effectId: effectExecutionId,
          initializationTime
        });
        
        logger.log(`✅ PAYMENT INTENT INITIALIZED FROM URL [${contextId.current}]:`, {
          effectId: effectExecutionId,
          intent: intentParam,
          planId: planIdParam,
          source: 'url',
          initializationTime: performance.now() - initStartTime
        });
        
        return;
      }

      // If no URL params, try to restore from storage
      const storedIntent = loadPaymentIntentFromStorage();
      if (storedIntent) {
        setPaymentIntentState(storedIntent);
        
        logger.log(`✅ PAYMENT INTENT RESTORED FROM STORAGE [${contextId.current}]:`, {
          effectId: effectExecutionId,
          intent: storedIntent.intent,
          planId: storedIntent.planId,
          source: storedIntent.source,
          age: Date.now() - storedIntent.timestamp,
          initializationTime: performance.now() - initStartTime
        });
      } else {
        logger.log(`ℹ️ NO PAYMENT INTENT FOUND [${contextId.current}]:`, {
          effectId: effectExecutionId,
          locationSearch: location.search,
          message: 'No URL params and no stored intent',
          initializationTime: performance.now() - initStartTime
        });
      }
    };

    initializePaymentIntent();
    
    const effectExecutionTime = performance.now() - effectStartTime;
    
    // PHASE 0.1: Record effect execution to centralized performance baseline
    const effectMetrics: EffectExecutionMetrics = {
      effectId: effectExecutionId,
      effectName: 'PaymentIntent-URL-Storage-Initialization',
      contextType: 'PAYMENT_INTENT',
      contextId: contextId.current,
      executionTime: effectExecutionTime,
      timestamp: Date.now(),
      trigger: 'location.search changes',
      stackTrace: stackTrace?.split('\n').slice(1, 4).join('\n') || 'No stack trace'
    };
    
    recordEffectExecution(effectMetrics);
    
    logger.log(`🔧 EFFECT EXECUTION COMPLETE [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
      effectName: 'PaymentIntent-URL-Storage-Initialization',
      totalExecutionTime: effectExecutionTime,
      timestamp: new Date().toISOString()
    });

    // Cleanup function with detailed logging
    return () => {
      const cleanupStartTime = performance.now();
      
      logger.log(`🧹 EFFECT CLEANUP [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
        effectName: 'PaymentIntent-URL-Storage-Initialization',
        effectLifetime: cleanupStartTime - effectStartTime,
        finalLocationSearch: location.search,
        timestamp: new Date().toISOString()
      });
    };
  }, [location.search]);

  // Context methods
  const setPaymentIntent = (intent: string | null, planId: string | null, source: 'manual' = 'manual') => {
    const newIntent: PaymentIntent = {
      intent,
      planId,
      source,
      timestamp: Date.now()
    };
    
    setPaymentIntentState(newIntent);
    
    if (intent && planId) {
      savePaymentIntentToStorage(newIntent);
    } else {
      clearPaymentIntentFromStorage();
    }
    
    logger.subscription('Payment intent updated', {
      intent,
      planId,
      source,
      contextId: contextId.current
    });
  };

  const clearPaymentIntent = () => {
    const clearedIntent: PaymentIntent = {
      intent: null,
      planId: null,
      source: null,
      timestamp: Date.now()
    };
    
    setPaymentIntentState(clearedIntent);
    clearPaymentIntentFromStorage();
    
    logger.subscription('Payment intent cleared', {
      contextId: contextId.current
    });
  };

  const hasPaymentIntent = (): boolean => {
    return !!(paymentIntent.intent && paymentIntent.planId);
  };

  const isValidPaymentIntent = (): boolean => {
    return paymentIntent.intent === 'plan' && !!paymentIntent.planId;
  };

  const getPaymentIntentUrl = (baseUrl: string): string => {
    if (!hasPaymentIntent()) return baseUrl;
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}intent=${paymentIntent.intent}&planId=${paymentIntent.planId}`;
  };

  // Context value
  const contextValue: PaymentIntentContextType = {
    paymentIntent,
    setPaymentIntent,
    clearPaymentIntent,
    hasPaymentIntent,
    isValidPaymentIntent,
    getPaymentIntentUrl,
    _contextId: contextId.current,
    _renderCount: renderCount.current,
  };

  // PHASE 0.1: Enhanced effect execution logging - Payment intent state changes
  useEffect(() => {
    const effectStartTime = performance.now();
    const effectExecutionId = Math.random().toString(36).substr(2, 9);
    const stackTrace = new Error().stack;
    
    logger.log(`🔧 EFFECT EXECUTION START [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
      effectName: 'PaymentIntent-State-Change-Monitor',
      trigger: 'paymentIntent object changes',
      paymentIntentKeys: Object.keys(paymentIntent || {}),
      currentPaymentIntentState: {
        intent: paymentIntent.intent,
        planId: paymentIntent.planId,
        source: paymentIntent.source,
        timestamp: paymentIntent.timestamp,
        hasIntent: hasPaymentIntent(),
        isValid: isValidPaymentIntent()
      },
      executionStartTime: effectStartTime,
      renderNumber: renderCount.current,
      stackTrace: stackTrace?.split('\n').slice(1, 4).join('\n') || 'No stack trace',
      timestamp: new Date().toISOString()
    });
    
    // Detailed state analysis
    const effectExecutionTime = performance.now() - effectStartTime;
    
    // PHASE 0.1: Record effect execution to centralized performance baseline
    const effectMetrics: EffectExecutionMetrics = {
      effectId: effectExecutionId,
      effectName: 'PaymentIntent-State-Change-Monitor',
      contextType: 'PAYMENT_INTENT',
      contextId: contextId.current,
      executionTime: effectExecutionTime,
      timestamp: Date.now(),
      trigger: 'paymentIntent object changes',
      stackTrace: stackTrace?.split('\n').slice(1, 4).join('\n') || 'No stack trace'
    };
    
    recordEffectExecution(effectMetrics);
    
    logger.log(`🎯 PAYMENT INTENT STATE ANALYSIS [${contextId.current}]:`, {
      effectId: effectExecutionId,
      intent: paymentIntent.intent,
      planId: paymentIntent.planId,
      source: paymentIntent.source,
      hasIntent: hasPaymentIntent(),
      isValid: isValidPaymentIntent(),
      stateAge: paymentIntent.timestamp ? Date.now() - paymentIntent.timestamp : 'N/A',
      stateTimestamp: paymentIntent.timestamp ? new Date(paymentIntent.timestamp).toISOString() : 'N/A',
      executionTime: effectExecutionTime
    });

    // Cleanup function with detailed logging
    return () => {
      const cleanupStartTime = performance.now();
      
      logger.log(`🧹 EFFECT CLEANUP [${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
        effectName: 'PaymentIntent-State-Change-Monitor',
        effectLifetime: cleanupStartTime - effectStartTime,
        finalPaymentIntentState: {
          intent: paymentIntent.intent,
          planId: paymentIntent.planId,
          source: paymentIntent.source,
          hasIntent: hasPaymentIntent(),
          isValid: isValidPaymentIntent()
        },
        timestamp: new Date().toISOString()
      });
    };
  }, [paymentIntent]);

  return (
    <Profiler id={`PaymentIntentContext-${contextId.current}`} onRender={onRenderProfiler}>
      <PaymentIntentContext.Provider value={contextValue}>
        {children}
      </PaymentIntentContext.Provider>
    </Profiler>
  );
};

/**
 * Hook to consume payment intent context
 * 
 * This provides centralized payment intent management with enhanced monitoring.
 * Throws an error if used outside of PaymentIntentProvider.
 */
export const usePaymentIntentContext = (): PaymentIntentContextType => {
  const context = useContext(PaymentIntentContext);
  
  if (!context) {
    throw new Error(
      'usePaymentIntentContext must be used within a PaymentIntentProvider. ' +
      'Make sure to wrap your app with <PaymentIntentProvider>.'
    );
  }

  // Log context usage for debugging
  const callerInfo = new Error().stack?.split('\n')[2]?.trim() || 'Unknown caller';
  
  logger.log(`📡 PAYMENT INTENT CONTEXT USAGE [${context._contextId}]:`, {
    caller: callerInfo,
    hasPaymentIntent: context.hasPaymentIntent(),
    paymentIntent: {
      intent: context.paymentIntent.intent,
      planId: context.paymentIntent.planId,
      source: context.paymentIntent.source,
      isValid: context.isValidPaymentIntent()
    },
    renderCount: context._renderCount,
    timestamp: new Date().toISOString()
  });

  return context;
};

export default PaymentIntentProvider;