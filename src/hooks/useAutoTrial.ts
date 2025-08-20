// src/hooks/useAutoTrial.ts
import { useEffect, useCallback, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { analyzeEffectDependencies } from '@/utils/dependencyAudit'
import type { UserSubscription } from '@/lib/subscription'

interface UseAutoTrialOptions {
  /** Whether to automatically create trial on signup */
  enabled?: boolean
  /** Show success message when trial is created */
  showSuccessMessage?: boolean
  /** Custom success message */
  successMessage?: string
  /** Delay before creating trial (in ms) to ensure auth is settled */
  delay?: number
  /** Callback when trial creation succeeds */
  onSuccess?: (subscription: UserSubscription) => void
  /** Callback when trial creation fails */
  onError?: (error: Error) => void
}

/**
 * Hook to automatically create trials for new users
 * Integrates seamlessly with existing AuthContext signup flow
 */
export function useAutoTrial(options: UseAutoTrialOptions = {}) {
  const {
    enabled = true,
    showSuccessMessage = true,
    successMessage = "Welcome to Scola! Your 7-day free trial has started.",
    delay = 2000, // Wait 2s for auth to settle
    onSuccess,
    onError
  } = options

  const { user } = useAuth()
  const { 
    subscription, 
    hasActiveSubscription, 
    isOnTrial, 
    startTrial,
    isStartingTrial,
    isLoading: subscriptionLoading,
    _contextId
  } = useSubscriptionContext()

  // Log context usage for debugging
  logger.log(`🆓 AUTO TRIAL HOOK - Using context:`, {
    contextId: _contextId,
    hasUser: !!user,
    hasSubscription: !!subscription,
    subscriptionStatus: subscription?.status,
    hasActiveSubscription,
    isOnTrial,
    timestamp: new Date().toISOString()
  });

  const [autoTrialState, setAutoTrialState] = useState({
    attempted: false,
    success: false,
    error: null as Error | null,
    isProcessing: false
  })

  // Track if we've already processed this user
  const processedUserRef = useRef<string | null>(null)

  // PHASE 0.2: Reset state when user changes with dependency analysis
  useEffect(() => {
    const effectId = `useAutoTrial-user-reset-${Date.now()}`;
    const effectStartTime = performance.now();
    
    // PHASE 0.2: Analyze user reset effect dependencies
    const dependencies = [user?.id];
    const analysis = analyzeEffectDependencies(
      effectId,
      'useAutoTrial-User-Reset-Effect',
      'useAutoTrial',
      '/src/hooks/useAutoTrial.ts',
      dependencies,
      performance.now() - effectStartTime
    );
    
    if (user?.id !== processedUserRef.current) {
      setAutoTrialState({
        attempted: false,
        success: false,
        error: null,
        isProcessing: false
      })
      processedUserRef.current = user?.id || null
    }
  }, [user?.id])

  // Auto-create trial for new users
  const createAutoTrial = useCallback(async () => {
    const options = stableOptionsRef.current;
    const data = stableDataRef.current;
    
    if (!options.enabled || !data.user || autoTrialState.attempted || data.subscriptionLoading) {
      return
    }

    // Don't create trial if user already has subscription/trial
    if (data.hasActiveSubscription || data.isOnTrial || data.subscription) {
      setAutoTrialState(prev => ({ ...prev, attempted: true }))
      return
    }

    // Check for payment intent in URL - skip auto-trial if user is going through paid subscription flow
    const urlParams = new URLSearchParams(window.location.search)
    const paymentIntent = urlParams.get('intent')
    const planId = urlParams.get('planId')
    
    if (paymentIntent === 'plan' && planId) {
      logger.subscription('Skipping auto-trial creation - payment intent detected:', { paymentIntent, planId })
      setAutoTrialState(prev => ({ ...prev, attempted: true }))
      return
    }

    setAutoTrialState(prev => ({ ...prev, isProcessing: true, attempted: true }))

    try {
      logger.subscription('Auto-creating trial for new user:', data.user.id)
      const newSubscription = await options.startTrial()
      
      setAutoTrialState(prev => ({ 
        ...prev, 
        success: true, 
        error: null, 
        isProcessing: false 
      }))

      if (options.showSuccessMessage) {
        toast.success(options.successMessage, {
          duration: 5000,
          description: "Explore all features for free. No payment required."
        })
      }

      options.onSuccess?.(newSubscription)
      
    } catch (error) {
      logger.error('Auto-trial creation failed:', error)
      
      setAutoTrialState(prev => ({ 
        ...prev, 
        error: error as Error, 
        isProcessing: false 
      }))

      // Don't show error toast - signup should still succeed
      // Users can manually start trial later
      options.onError?.(error as Error)
    }
  }, []); // Remove massive dependency array - use stable refs instead
  
  // Stable references to prevent cascade re-renders
  const stableOptionsRef = useRef();
  const stableDataRef = useRef();
  
  // Update refs on every render (lightweight operation)
  stableOptionsRef.current = { enabled, showSuccessMessage, successMessage, onSuccess, onError, startTrial };
  stableDataRef.current = { user, hasActiveSubscription, isOnTrial, subscription, subscriptionLoading };

  // PHASE 0.2: Trigger auto-trial creation with delay and dependency analysis
  useEffect(() => {
    const effectId = `useAutoTrial-trigger-${Date.now()}`;
    const effectStartTime = performance.now();
    
    // PHASE 0.2: Analyze trigger effect dependencies
    const dependencies = [autoTrialState.attempted, delay, createAutoTrial];
    const analysis = analyzeEffectDependencies(
      effectId,
      'useAutoTrial-Trigger-Effect',
      'useAutoTrial',
      '/src/hooks/useAutoTrial.ts',
      dependencies,
      performance.now() - effectStartTime
    );
    
    const data = stableDataRef.current;
    
    if (!data.user || autoTrialState.attempted || data.subscriptionLoading) {
      return
    }

    const timer = setTimeout(() => {
      createAutoTrial()
    }, delay)

    return () => clearTimeout(timer)
  }, [autoTrialState.attempted, delay, createAutoTrial]) // Minimal stable dependencies

  // Manual retry function
  const retryAutoTrial = useCallback(() => {
    setAutoTrialState({
      attempted: false,
      success: false,
      error: null,
      isProcessing: false
    })
  }, [])

  return {
    // State
    isProcessing: autoTrialState.isProcessing || isStartingTrial,
    success: autoTrialState.success,
    error: autoTrialState.error,
    attempted: autoTrialState.attempted,
    
    // Actions
    createAutoTrial,
    retryAutoTrial,
    
    // Status helpers
    shouldShowWelcome: autoTrialState.success && isOnTrial,
    canRetry: autoTrialState.error && !autoTrialState.isProcessing
  }
}