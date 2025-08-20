import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate'
import { getTrialStatus } from './trialStatus'

interface TrialBannerProps {
  className?: string
  showUpgradeButton?: boolean
  dismissible?: boolean
  onUpgradeClick?: () => void
  onDismiss?: () => void
}

export function TrialBanner({
  className = '',
  showUpgradeButton = true,
  dismissible = true,
  onUpgradeClick,
  onDismiss
}: TrialBannerProps) {
  const navigate = useNavigate()
  const [isDismissed, setIsDismissed] = useState(false)
  const {
    subscription,
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    isTrialExpired,
  } = useSubscriptionContext()
  const { requiresUpgrade: shouldShowUpgrade } = useSubscriptionGate()

  if (isDismissed || (hasActiveSubscription && !isOnTrial)) return null
  if (!subscription && !isOnTrial && !isTrialExpired) return null

  const status = getTrialStatus({
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    isTrialExpired,
    subscription,
  })

  const IconComponent = status.icon

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <Card className={`${status.bgColor} border shadow-sm ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 p-2 rounded-lg bg-white/50">
              {IconComponent && <IconComponent className={`h-5 w-5 ${status.iconColor}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-sm ${status.textColor}`}>{status.title}</h3>
                <Badge variant="secondary" className={`${status.badgeColor} text-xs`}>
                  {status.badge}
                </Badge>
              </div>
              {status.subtext && (
                <p className={`text-sm ${status.textColor} opacity-90 leading-relaxed`}>
                  {status.subtext}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {showUpgradeButton && shouldShowUpgrade && status.actionText && (
              <Button
                onClick={onUpgradeClick || (() => navigate('/pricing'))}
                size="sm"
                className={`
                  ${status.urgency === 'high'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : status.urgency === 'medium'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                  flex items-center gap-1 shadow-sm
                `}
              >
                {status.actionText}
              </Button>
            )}
            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className={`h-8 w-8 ${status.textColor} opacity-60 hover:opacity-100 hover:bg-white/20`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}