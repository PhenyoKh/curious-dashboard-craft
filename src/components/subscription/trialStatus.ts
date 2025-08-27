// src/components/subscription/trialStatus.ts
import {
  CheckCircle, Clock, AlertTriangle, XCircle, Zap, type LucideIcon
} from 'lucide-react'
import type { UserSubscription } from '@/lib/subscription'

export type TrialPhase =
  | 'subscribed'
  | 'expired'
  | 'urgent'
  | 'warning'
  | 'active'
  | 'none'

export interface TrialStatusInfo {
  phase: TrialPhase
  icon: LucideIcon | null
  title: string
  subtext?: string
  badge: string
  bgColor: string
  textColor: string
  iconColor: string
  badgeColor: string
  urgency: 'low' | 'medium' | 'high'
  actionText?: string
}

export function getTrialStatus({
  hasActiveSubscription,
  isOnTrial,
  trialDaysRemaining: daysLeftRaw,
  isTrialExpired,
  subscription,
  isAdmin,
}: {
  hasActiveSubscription: boolean
  isOnTrial: boolean
  trialDaysRemaining?: number
  isTrialExpired: boolean
  subscription?: UserSubscription | null
  isAdmin?: boolean
}): TrialStatusInfo {
  const trialDaysRemaining = daysLeftRaw ?? 0

  // CRITICAL: Admin users should NEVER see trial banners - highest priority check
  if (isAdmin) {
    console.log('🔒 getTrialStatus: Admin user detected, returning admin status', { 
      isAdmin, 
      hasActiveSubscription, 
      subscription: subscription?.id 
    });
    return {
      phase: 'subscribed',
      icon: CheckCircle,
      title: 'Admin Access',
      subtext: 'Full access enabled',
      badge: 'Admin',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      iconColor: 'text-purple-600',
      badgeColor: 'bg-purple-200 text-purple-700',
      urgency: 'low',
      actionText: undefined,
    }
  }

  // Debug logging for subscription state analysis
  console.log('🔍 getTrialStatus: Processing subscription state', {
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    isTrialExpired,
    subscriptionStatus: subscription?.status,
    subscriptionId: subscription?.id,
    planId: subscription?.plan_id,
    isAdmin,
    timestamp: new Date().toISOString()
  });

  if (hasActiveSubscription && !isOnTrial) {
    return {
      phase: 'subscribed',
      icon: CheckCircle,
      title: 'Subscribed',
      subtext: subscription?.plan?.name || 'Active Plan',
      badge: 'Active',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
      badgeColor: 'bg-green-200 text-green-700',
      urgency: 'low',
      actionText: undefined,
    }
  } else if (isTrialExpired) {
    return {
      phase: 'expired',
      icon: XCircle,
      title: 'Trial Expired',
      subtext: 'Upgrade required',
      badge: 'Expired',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      iconColor: 'text-red-600',
      badgeColor: 'bg-red-100 text-red-700',
      urgency: 'high',
      actionText: 'Upgrade to Continue',
    }
  } else if (isOnTrial && trialDaysRemaining <= 2) {
    return {
      phase: 'urgent',
      icon: AlertTriangle,
      title: trialDaysRemaining === 1 ? 'Trial Ends Tomorrow' : 'Trial Ending Soon',
      subtext: `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left`,
      badge: `${trialDaysRemaining}d`,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      iconColor: 'text-orange-600',
      badgeColor: 'bg-orange-100 text-orange-700',
      urgency: 'high',
      actionText: trialDaysRemaining === 1 ? 'Upgrade Before Tomorrow' : 'Upgrade Now',
    }
  } else if (isOnTrial && trialDaysRemaining <= 4) {
    return {
      phase: 'warning',
      icon: Zap,
      title: 'Trial Active',
      subtext: `${trialDaysRemaining} days left`,
      badge: `${trialDaysRemaining}d`,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-600',
      badgeColor: 'bg-yellow-100 text-yellow-700',
      urgency: 'medium',
      actionText: 'View Plans',
    }
  } else if (isOnTrial) {
    return {
      phase: 'active',
      icon: Clock,
      title: 'Trial Active',
      subtext: `${trialDaysRemaining} days left`,
      badge: `${trialDaysRemaining}d`,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600',
      badgeColor: 'bg-blue-100 text-blue-700',
      urgency: 'low',
      actionText: 'View Upgrade Options',
    }
  }

  // Handle "no subscription" state - users without subscription/trial
  if (!subscription || (!hasActiveSubscription && !isOnTrial && !isTrialExpired)) {
    console.log('🔍 TrialStatus: No subscription state detected', {
      hasSubscription: !!subscription,
      hasActiveSubscription,
      isOnTrial,
      isTrialExpired
    });
    return {
      phase: 'none',
      icon: null,
      title: 'Account Status',
      subtext: 'No Active Subscription',
      badge: 'Free',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      iconColor: 'text-gray-600',
      badgeColor: 'bg-gray-200 text-gray-700',
      urgency: 'low',
    }
  }

  // Default fallback - should not normally be reached
  // If we reach here, it means user has a subscription but doesn't fit other categories
  // Log this case for debugging since it shouldn't happen with improved banner logic
  console.error('🚨 TrialStatus: CRITICAL - Reached fallback case! This should NOT happen with improved banner logic', {
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    isTrialExpired,
    subscriptionStatus: subscription?.status,
    subscriptionId: subscription?.id,
    planId: subscription?.plan_id,
    isAdmin,
    adminValue: isAdmin,
    adminType: typeof isAdmin,
    subscriptionObject: subscription,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack
  });

  // EMERGENCY FAILSAFE: If user has plan_id, treat as subscribed to avoid "Unknown" message
  if (subscription?.plan_id) {
    console.log('🆘 TrialStatus: EMERGENCY FAILSAFE - User has plan_id, treating as subscribed', {
      planId: subscription.plan_id,
      status: subscription.status
    });
    return {
      phase: 'subscribed',
      icon: CheckCircle,
      title: 'Subscribed',
      subtext: 'Active Plan',
      badge: 'Active',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
      badgeColor: 'bg-green-200 text-green-700',
      urgency: 'low',
      actionText: undefined,
    }
  }
  
  return {
    phase: 'none',
    icon: null,
    title: 'Account Status',
    subtext: 'Contact support if you see this message',
    badge: 'Unknown',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    iconColor: 'text-gray-600',
    badgeColor: 'bg-gray-200 text-gray-700',
    urgency: 'low',
  }
}