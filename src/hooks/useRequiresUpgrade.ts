/**
 * Hook to determine if user requires a subscription upgrade
 * Returns boolean for upgrade requirements and related state
 */

import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { getSubscriptionStatus, hasActiveSubscription, isTrialExpired } from '@/lib/subscription'

export const useRequiresUpgrade = () => {
  const { user } = useAuth()

  // Get subscription status
  const subscriptionQuery = useQuery({
    queryKey: ['subscription', user?.id || ''],
    queryFn: () => getSubscriptionStatus(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  })

  const subscription = subscriptionQuery.data

  // Calculate upgrade requirements
  const requiresUpgrade = (() => {
    if (!user || subscriptionQuery.isLoading) return false
    if (!subscription) return true // No subscription = needs upgrade
    
    return !hasActiveSubscription(subscription)
  })()

  // Trial-specific state
  const isOnExpiredTrial = subscription 
    ? subscription.status === 'trial' && isTrialExpired(subscription)
    : false

  const hasCancelledSubscription = subscription?.cancel_at_period_end || false

  const isPastDue = subscription?.status === 'past_due'

  // Upgrade reasons for UI messaging
  const upgradeReason = (() => {
    if (!subscription) return 'no_subscription'
    if (isOnExpiredTrial) return 'trial_expired'
    if (isPastDue) return 'payment_failed'
    if (hasCancelledSubscription) return 'cancelled'
    if (subscription.status === 'expired') return 'expired'
    return null
  })()

  // User-friendly upgrade message
  const upgradeMessage = (() => {
    switch (upgradeReason) {
      case 'no_subscription':
        return 'Start your free trial to access all features'
      case 'trial_expired':
        return 'Your free trial has ended. Upgrade to continue using premium features'
      case 'payment_failed':
        return 'Please update your payment method to continue'
      case 'cancelled':
        return 'Your subscription will end soon. Reactivate to continue access'
      case 'expired':
        return 'Your subscription has expired. Renew to regain access'
      default:
        return null
    }
  })()

  return {
    // Primary state
    requiresUpgrade,
    
    // Detailed state
    isOnExpiredTrial,
    hasCancelledSubscription,
    isPastDue,
    upgradeReason,
    upgradeMessage,
    
    // Subscription data
    subscription,
    
    // Loading state
    isLoading: subscriptionQuery.isLoading,
    error: subscriptionQuery.error,
    
    // Query controls
    refetch: subscriptionQuery.refetch
  }
}

export type UseRequiresUpgradeReturn = ReturnType<typeof useRequiresUpgrade>