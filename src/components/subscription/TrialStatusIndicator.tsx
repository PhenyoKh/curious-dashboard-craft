import React from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { Badge } from '@/components/ui/badge'
import { getTrialStatus } from './trialStatus'

export function TrialStatusIndicator({ variant = 'default', className = '' }) {
  const {
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    isTrialExpired,
    subscription,
  } = useSubscription()
  
  const status = getTrialStatus({
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    isTrialExpired,
    subscription,
  })
  
  if (status.phase === 'none') return null

  const IconComponent = status.icon

  // Choose rendering style
  if (variant === 'compact') {
    return (
      <Badge variant="secondary" className={`${status.bgColor} ${status.textColor} ${className} flex items-center gap-1`}>
        {IconComponent && <IconComponent className={`h-3 w-3 ${status.iconColor}`} />}
        <span className="text-xs">{status.title}</span>
      </Badge>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={`${className} flex items-center gap-2 p-2 rounded-lg ${status.bgColor} ${status.textColor}`}>
        {IconComponent && <IconComponent className={`h-4 w-4 ${status.iconColor}`} />}
        <div>
          <div className="text-sm font-medium">{status.title}</div>
          <div className="text-xs opacity-80">{status.subtext}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} flex items-center gap-2`}>
      {IconComponent && <IconComponent className={`h-4 w-4 ${status.iconColor}`} />}
      <span className={`text-sm font-medium ${status.textColor}`}>{status.title}</span>
    </div>
  )
}