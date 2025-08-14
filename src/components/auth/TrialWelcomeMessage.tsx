// src/components/auth/TrialWelcomeMessage.tsx
import React, { useState } from 'react'
import { CheckCircle, X, Sparkles, Calendar, Zap } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface TrialWelcomeMessageProps {
  /** Whether to show the welcome message */
  visible?: boolean
  /** Callback when message is dismissed */
  onDismiss?: () => void
  /** Auto dismiss after duration (ms) */
  autoDismiss?: number
  /** Custom welcome message */
  customMessage?: string
}

export function TrialWelcomeMessage({
  visible = true,
  onDismiss,
  autoDismiss = 10000, // 10 seconds
  customMessage
}: TrialWelcomeMessageProps) {
  const [isVisible, setIsVisible] = useState(visible)
  const { trialDaysRemaining, isOnTrial } = useSubscription()

  const handleDismiss = React.useCallback(() => {
    setIsVisible(false)
    onDismiss?.()
  }, [onDismiss])

  // Auto dismiss
  React.useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, autoDismiss)
      return () => clearTimeout(timer)
    }
  }, [autoDismiss, isVisible, handleDismiss])

  if (!isVisible || !isOnTrial) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-right duration-500">
      <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-blue-50 shadow-lg">
        <CardContent className="p-6 relative">
          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Welcome Content */}
          <div className="pr-8">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Sparkles className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Welcome to Scola!</h3>
            </div>

            {/* Message */}
            <p className="text-gray-700 text-sm mb-4">
              {customMessage || "Your 7-day free trial has started automatically. Explore all features without any limitations!"}
            </p>

            {/* Trial Info */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1 text-sm text-blue-700">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{trialDaysRemaining} days remaining</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-green-700">
                <Zap className="h-4 w-4" />
                <span>Full access</span>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Create unlimited notes and subjects</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Advanced search and organization</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Seamless events management</span>
              </div>
            </div>

            {/* Call to Action */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                No payment required during trial
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                Get Started
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}