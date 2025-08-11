/**
 * Hook for premium feature access control and subscription gating
 * Provides utilities to check feature access and handle upgrade flows
 */

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSubscriptionStatus, hasActiveSubscription } from '@/lib/subscription'

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

  // Get subscription status
  const subscriptionQuery = useQuery({
    queryKey: ['subscription', user?.id || ''],
    queryFn: () => getSubscriptionStatus(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  })

  const subscription = subscriptionQuery.data

  // Calculate access levels
  const hasAccess = (() => {
    if (!user || subscriptionQuery.isLoading) return false
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
    
    // Loading state
    isLoading: subscriptionQuery.isLoading,
    error: subscriptionQuery.error,
    
    // Query controls
    refetch: subscriptionQuery.refetch
  }
}

export type UseSubscriptionGateReturn = ReturnType<typeof useSubscriptionGate>