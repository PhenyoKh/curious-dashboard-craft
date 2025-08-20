/**
 * Hook for premium feature access control and subscription gating
 * Provides utilities to check feature access and handle upgrade flows
 * 
 * REFACTORED: Now uses centralized SubscriptionContext instead of creating duplicate queries
 */

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { toast } from 'sonner'
import { hasActiveSubscription } from '@/lib/subscription'

export interface FeatureGateOptions {
  /**
   * Feature name for tracking and error messages
   */
  featureName?: string
  
  /**
   * Whether to show a toast notification when access is denied
   */
  showToast?: boolean
  
  /**
   * Custom upgrade message
   */
  upgradeMessage?: string
  
  /**
   * Callback when access is denied
   */
  onAccessDenied?: () => void
  
  /**
   * Whether this feature requires a paid plan (not trial)
   */
  requiresPaidPlan?: boolean
}

export const useSubscriptionGate = (options: FeatureGateOptions = {}) => {
  const { user } = useAuth()
  const {
    featureName = 'premium feature',
    showToast = true,
    upgradeMessage,
    onAccessDenied,
    requiresPaidPlan = false
  } = options

  // Use centralized subscription context instead of creating duplicate query
  const subscriptionContext = useSubscriptionContext()
  const subscription = subscriptionContext.subscription

  // Log context usage for debugging
  console.log(`🔒 SUBSCRIPTION GATE [${featureName}] - Using context:`, {
    contextId: subscriptionContext._contextId,
    hasSubscription: !!subscription,
    subscriptionStatus: subscription?.status,
    featureName,
    requiresPaidPlan,
    timestamp: new Date().toISOString()
  });

  // Calculate access levels using context data
  const hasAccess = (() => {
    if (!user || subscriptionContext.isLoading) return false
    if (!subscription) return false
    
    const hasActiveSub = hasActiveSubscription(subscription)
    
    // If requires paid plan, exclude trial users
    if (requiresPaidPlan) {
      return hasActiveSub && subscription.status !== 'trial'
    }
    
    return hasActiveSub
  })()

  const isOnTrial = subscription?.status === 'trial'
  const canUseDuringTrial = !requiresPaidPlan && isOnTrial

  // Feature gate function - checks access and handles denials
  const checkAccess = (): boolean => {
    if (hasAccess) return true

    // Handle access denial
    if (showToast) {
      const message = upgradeMessage || 
        (isOnTrial && requiresPaidPlan 
          ? `${featureName} requires a paid subscription`
          : `Upgrade to access ${featureName}`
        )
      
      toast.error(message, {
        action: {
          label: 'Upgrade',
          onClick: () => {
            // Could integrate with routing to go to pricing page
            // For now, just log the action
            console.log('User clicked upgrade from feature gate')
          }
        }
      })
    }

    onAccessDenied?.()
    return false
  }

  // Higher-order component wrapper for feature gating
  const withFeatureGate = <T extends object>(
    Component: React.ComponentType<T>,
    fallback?: React.ComponentType | React.ReactElement | null
  ) => {
    return (props: T) => {
      if (!checkAccess()) {
        if (fallback) {
          return typeof fallback === 'function' ? React.createElement(fallback) : fallback
        }
        return null
      }
      return React.createElement(Component, props)
    }
  }

  // Hook for conditional rendering
  const useConditionalRender = () => ({
    canRender: hasAccess,
    renderIfAllowed: (component: React.ReactElement) => hasAccess ? component : null,
    renderWithFallback: (
      component: React.ReactElement, 
      fallback: React.ReactElement
    ) => hasAccess ? component : fallback
  })

  return {
    // Access state
    hasAccess,
    isOnTrial,
    canUseDuringTrial,
    requiresUpgrade: !hasAccess,
    
    // Subscription info
    subscription,
    subscriptionStatus: subscription?.status,
    
    // Access control
    checkAccess,
    withFeatureGate,
    useConditionalRender,
    
    // Loading state (from context)
    isLoading: subscriptionContext.isLoading,
    error: subscriptionContext.error,
    
    // Query controls (from context)
    refetch: subscriptionContext.refetch
  }
}

export type UseSubscriptionGateReturn = ReturnType<typeof useSubscriptionGate>