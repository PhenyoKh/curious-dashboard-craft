// src/hooks/useAutoTrial.ts
import { useEffect, useCallback, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { toast } from 'sonner'

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
  onSuccess?: (subscription: any) => void
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
    isLoading: subscriptionLoading
  } = useSubscription()

  const [autoTrialState, setAutoTrialState] = useState({
    attempted: false,
    success: false,
    error: null as Error | null,
    isProcessing: false
  })

  // Track if we've already processed this user
  const processedUserRef = useRef<string | null>(null)

  // Reset state when user changes
  useEffect(() => {
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
    if (!enabled || !user || autoTrialState.attempted || subscriptionLoading) {
      return
    }

    // Don't create trial if user already has subscription/trial
    if (hasActiveSubscription || isOnTrial || subscription) {
      setAutoTrialState(prev => ({ ...prev, attempted: true }))
      return
    }

    setAutoTrialState(prev => ({ ...prev, isProcessing: true, attempted: true }))

    try {
      console.log('Auto-creating trial for new user:', user.id)
      const newSubscription = await startTrial()
      
      setAutoTrialState(prev => ({ 
        ...prev, 
        success: true, 
        error: null, 
        isProcessing: false 
      }))

      if (showSuccessMessage) {
        toast.success(successMessage, {
          duration: 5000,
          description: "Explore all features for free. No payment required."
        })
      }

      onSuccess?.(newSubscription)
      
    } catch (error) {
      console.error('Auto-trial creation failed:', error)
      
      setAutoTrialState(prev => ({ 
        ...prev, 
        error: error as Error, 
        isProcessing: false 
      }))

      // Don't show error toast - signup should still succeed
      // Users can manually start trial later
      onError?.(error as Error)
    }
  }, [
    enabled, 
    user, 
    hasActiveSubscription, 
    isOnTrial, 
    subscription,
    subscriptionLoading,
    autoTrialState.attempted,
    startTrial,
    showSuccessMessage,
    successMessage,
    onSuccess,
    onError
  ])

  // Trigger auto-trial creation with delay
  useEffect(() => {
    if (!user || autoTrialState.attempted || subscriptionLoading) {
      return
    }

    const timer = setTimeout(() => {
      createAutoTrial()
    }, delay)

    return () => clearTimeout(timer)
  }, [user, autoTrialState.attempted, subscriptionLoading, delay, createAutoTrial])

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