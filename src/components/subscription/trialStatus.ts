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
}: {
  hasActiveSubscription: boolean
  isOnTrial: boolean
  trialDaysRemaining?: number
  isTrialExpired: boolean
  subscription?: UserSubscription | null
}): TrialStatusInfo {
  const trialDaysRemaining = daysLeftRaw ?? 0

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
  // Default fallback
  return {
    phase: 'none',
    icon: null,
    title: '',
    badge: '',
    bgColor: '',
    textColor: '',
    iconColor: '',
    badgeColor: '',
    urgency: 'low',
  }
}