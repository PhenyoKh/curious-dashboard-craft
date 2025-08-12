import React from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { getTrialStatus } from './trialStatus'

export function CompactTrialBanner({ className = '', onClick }) {
  const navigate = useNavigate()
  const { isOnTrial, trialDaysRemaining, isTrialExpired, hasActiveSubscription, subscription } = useSubscription()

  const status = getTrialStatus({
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    isTrialExpired,
    subscription,
  })
  
  if (status.phase === 'none') return null

  const IconComponent = status.icon

  return (
    <Button
      variant="ghost"
      onClick={onClick || (() => navigate('/pricing'))}
      className={`
        ${className}
        ${status.bgColor} ${status.textColor} border justify-start p-3 h-auto w-full
      `}
    >
      <div className="flex items-center gap-2 w-full">
        {IconComponent && <IconComponent className={`h-4 w-4 ${status.iconColor}`} />}
        <div className="flex-1 text-left">
          <div className="text-xs font-medium">{status.title}</div>
          <div className="text-xs opacity-80">{status.subtext}</div>
        </div>
        <Badge variant="secondary" className={`text-xs ${status.badgeColor}`}>
          {status.badge}
        </Badge>
      </div>
    </Button>
  )
}