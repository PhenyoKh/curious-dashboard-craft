// src/components/settings/SubscriptionTab.tsx
import React, { useState } from 'react'
import { 
  CreditCard, Calendar, AlertTriangle,
  CheckCircle, XCircle, Loader2, ExternalLink,
  RefreshCw, Crown, Zap
} from 'lucide-react'

import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans'
import { isTrialExpired } from '@/lib/subscription'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

import { getTrialStatus } from '@/components/subscription/trialStatus'

/* ------------------- Date Utilities ------------------- */
function formatSubscriptionDate(dateString: string | null | undefined, fallback: string = 'Date unavailable'): string {
  if (!dateString) {
    console.warn('🗓️ SubscriptionTab: Date string is null/undefined:', dateString)
    return fallback
  }
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.warn('🗓️ SubscriptionTab: Invalid date string:', dateString)
      return 'Invalid date'
    }
    
    // Check for epoch time (1970 dates) - common sign of null/0 conversion
    if (date.getFullYear() === 1970) {
      console.error('🚨 SubscriptionTab: 1970 date detected! Original value:', dateString)
      return '1970 date error - please contact support'
    }
    
    return date.toLocaleDateString()
  } catch (error) {
    console.error('🗓️ SubscriptionTab: Date formatting error:', error, 'for value:', dateString)
    return 'Date formatting error'
  }
}

/* ------------------- Plan Selector ------------------- */
function PlanSelector({ currentPlanId, currentPlanPrice, currentPlanFeatures = [], onPlanSelect, isUpgrading }) {
  const { data: plans = [], isLoading } = useSubscriptionPlans()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading plans...</span>
      </div>
    )
  }

  if (!isLoading && plans.length === 0) {
    return <p className="text-sm text-muted-foreground">No subscription plans available.</p>
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlanId
          const isAnnual = plan.billing_interval === 'annual'
          const monthlyEquivalent = isAnnual ? (plan.price / 12).toFixed(0) : plan.price

          // Type labels, button, chip logic
          let planTypeLabel = ''
          let buttonVariant: 'default' | 'secondary' | 'outline' = 'default'
          let buttonClass = ''
          let chipColor = 'bg-gray-200 text-gray-800'

          if (!isCurrentPlan) {
            if (plan.price > currentPlanPrice) {
              planTypeLabel = 'Upgrade'
              buttonClass = 'bg-green-600 hover:bg-green-700 text-white'
              chipColor = 'bg-green-100 text-green-700'
            } else if (plan.price < currentPlanPrice) {
              planTypeLabel = 'Downgrade'
              buttonVariant = 'secondary'
              buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white'
              chipColor = 'bg-blue-100 text-blue-700'
            } else {
              planTypeLabel = 'Change Plan'
              buttonVariant = 'secondary'
              chipColor = 'bg-gray-100 text-gray-800'
            }
          }

          // Dynamic tooltip based on feature differences
          let tooltipText = ''
          if (!isCurrentPlan && currentPlanFeatures.length && plan.features?.length) {
            const gains = plan.features.filter(f => !currentPlanFeatures.includes(f))
            const losses = currentPlanFeatures.filter(f => !plan.features.includes(f))

            if (planTypeLabel === 'Upgrade') {
              tooltipText = gains.length
                ? `You'll gain: ${gains.join(', ')}`
                : 'Upgrade to a higher tier plan.'
            } else if (planTypeLabel === 'Downgrade') {
              tooltipText = losses.length
                ? `You'll lose: ${losses.join(', ')}`
                : 'Downgrade to a lower tier plan.'
            } else {
              tooltipText = `Gains: ${gains.length ? gains.join(', ') : 'None'}; Losses: ${losses.length ? losses.join(', ') : 'None'}`
            }
          } else if (!isCurrentPlan) {
            tooltipText = planTypeLabel === 'Upgrade'
              ? 'Move to a higher tier with more features or resources.'
              : planTypeLabel === 'Downgrade'
                ? 'Switch to a lower tier to reduce your cost.'
                : 'Switch to another plan with similar pricing.'
          }

          return (
            <Card key={`plan-${plan.id}`} className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
              {isAnnual && (
                <Badge className="absolute -top-2 left-4 bg-green-600">Save 20%</Badge>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {isAnnual ? <Crown className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  {plan.name}
                  {!isCurrentPlan && planTypeLabel && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className={`${chipColor} text-xs font-medium px-2 py-0.5 rounded-full cursor-help`}>
                          {planTypeLabel}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-snug">{tooltipText}</TooltipContent>
                    </Tooltip>
                  )}
                  {isCurrentPlan && <Badge variant="outline" className="ml-auto">Current</Badge>}
                </CardTitle>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    R{plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.billing_interval}
                    </span>
                  </div>
                  {isAnnual && (
                    <div className="text-sm text-muted-foreground">
                      R{monthlyEquivalent}/month billed annually
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 mb-4">
                  {(plan.features?.length ? plan.features : [
                    'Full access to all features',
                    'Priority support',
                    'Unlimited usage'
                  ]).map((feature) => (
                    <li key={`feature-${feature.replace(/\s+/g, '-').toLowerCase()}`} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => onPlanSelect(plan.id)}
                      disabled={isCurrentPlan || isUpgrading}
                      variant={isCurrentPlan ? "outline" : buttonVariant}
                      className={`${!isCurrentPlan ? buttonClass : ''} w-full`}
                    >
                      {isUpgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isCurrentPlan ? 'Current Plan' : `${planTypeLabel} to This Plan`}
                    </Button>
                  </TooltipTrigger>
                  {!isCurrentPlan && <TooltipContent className="max-w-xs text-xs leading-snug">{tooltipText}</TooltipContent>}
                </Tooltip>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

/* ------------------- Cancellation Dialog ------------------- */
function CancellationDialog({ onConfirm, isLoading }) {
  const [reason, setReason] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleConfirm = async () => {
    const success = await onConfirm(reason || undefined)
    if (success) {
      setIsOpen(false)
      setReason('')
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
          Cancel Subscription
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Cancel Subscription
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to cancel your subscription? You&apos;ll continue to have access until the end of your current billing period.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for cancellation (optional):</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Help us improve by telling us why you're cancelling..."
                className="w-full p-2 border rounded-md text-sm resize-none"
                rows={3}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Cancellation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* ------------------- Subscription Tab ------------------- */
export function SubscriptionTab() {
  const {
    subscription, hasActiveSubscription, isOnTrial,
    trialDaysRemaining, upgradeToPlan,
    cancelSubscription, isUpgrading, isCancelling, refetch
  } = useSubscriptionContext()

  const [isRefreshing, setIsRefreshing] = useState(false)

  // Compute trial expired status from our existing helper
  const trialExpired = subscription ? isTrialExpired(subscription) : false

  const statusInfo = getTrialStatus({
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    isTrialExpired: trialExpired,
    subscription,
  })

  const handlePlanUpgrade = async (planId) => {
    try {
      await upgradeToPlan(planId)
      toast.success('Redirecting to secure payment...')
    } catch {
      toast.error('Failed to start upgrade process')
    }
  }

  const handleCancellation = async (reason) => {
    try {
      await cancelSubscription(reason)
      return true
    } catch {
      toast.error('Failed to cancel subscription')
      return false
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      toast.success('Subscription information updated')
    } catch {
      toast.error('Failed to refresh subscription data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleUpgradePlan = () => {
    if (!subscription) {
      toast.error('No active subscription found.')
      return
    }

    // Show available plans for upgrade
    toast.info(
      'Select a plan below to upgrade your subscription. You will be redirected to PayFast for secure payment processing.',
      {
        duration: 4000
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Subscription</h2>
          <p className="text-sm text-muted-foreground">Manage your subscription and billing preferences</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Current Status Card */}
      <Card className={`${statusInfo.bgColor} border`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {statusInfo.icon && <statusInfo.icon className={`h-5 w-5 ${statusInfo.iconColor}`} />}
            {statusInfo.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Plan</label>
                <p className="text-sm font-semibold">{subscription.plan?.name || 'Free Trial'}</p>
              </div>
              {subscription.plan && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Price</label>
                  <p className="text-sm font-semibold">
                    R{subscription.plan.price}/{subscription.plan.billing_interval}
                  </p>
                </div>
              )}
              {isOnTrial && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Trial Status</label>
                  <p className="text-sm font-semibold">
                    {trialExpired ? 'Expired' : `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining`}
                  </p>
                </div>
              )}
              {subscription.current_period_end && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {isOnTrial ? 'Trial Ends' : 'Next Billing'}
                  </label>
                  <p className="text-sm font-semibold">{formatSubscriptionDate(subscription.current_period_end)}</p>
                </div>
              )}
            </div>
          )}

          {/* Trial Warning */}
          {isOnTrial && trialDaysRemaining <= 3 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {trialExpired
                  ? 'Your trial has expired. Upgrade to continue accessing all features.'
                  : `Your trial expires in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}. Upgrade now to avoid interruption.`}
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation Notice */}
          {subscription?.cancel_at_period_end && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  {subscription.cancelled_at && (
                    <p>
                      <strong>Cancelled on:</strong> {formatSubscriptionDate(subscription.cancelled_at, 'Recently cancelled')}
                    </p>
                  )}
                  <p>
                    <strong>Access until:</strong> {formatSubscriptionDate(subscription.current_period_end, 'end of billing period')}
                  </p>
                  <p className="text-sm">
                    You can reactivate your subscription anytime before your access expires.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Plans Section */}
      {(isOnTrial || trialExpired || hasActiveSubscription) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Available Plans</h3>
            {!hasActiveSubscription && (
              <Button size="sm" className="flex items-center gap-1">
                <ExternalLink className="h-4 w-4" /> View Full Pricing
              </Button>
            )}
          </div>
          <PlanSelector
            currentPlanId={subscription?.plan_id}
            currentPlanPrice={subscription?.plan?.price || 0}
            currentPlanFeatures={subscription?.plan?.features || []}
            onPlanSelect={handlePlanUpgrade}
            isUpgrading={isUpgrading}
          />
        </div>
      )}

      {/* No Subscription State */}
      {!subscription && !isOnTrial && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Active Subscription</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Start a free trial or subscribe to access all features and keep your data synchronized.
            </p>
            <div className="flex gap-2">
              <Button>Start Free Trial</Button>
              <Button variant="outline">View Plans</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Section */}
      {hasActiveSubscription && !subscription?.cancel_at_period_end && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Subscription Actions</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <CancellationDialog onConfirm={handleCancellation} isLoading={isCancelling} />
              <Button variant="outline" className="flex items-center gap-2"
                onClick={handleUpgradePlan}>
                <Calendar className="h-4 w-4" /> Upgrade Plan
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cancellation takes effect at the end of your current billing period. You can reactivate anytime before then.
            </p>
          </div>
        </>
      )}

      {/* Billing Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing Information</CardTitle>
          <CardDescription>Your billing is securely processed by PayFast. We don't store your card details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Payment Processing</span>
            </div>
            <Badge variant="secondary">PayFast Secure</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            All payments are processed securely through PayFast's PCI DSS Level 1 compliant platform. Your payment information is encrypted and never stored on our servers.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}