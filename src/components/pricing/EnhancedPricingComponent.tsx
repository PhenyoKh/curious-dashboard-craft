import React, { useState, useEffect } from 'react'
import { Check, Loader2, AlertTriangle, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { logger } from '@/utils/logger';

type LoadingState = {
  trial: boolean
  planId: string | number | null
  errors: {
    trial?: string | null
    [planId: string]: string | null
  }
  fading: {
    trial?: boolean
    [planId: string]: boolean
  }
}

export function EnhancedPricingComponent() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isAnnual, setIsAnnual] = useState(true)

  // DEBUG: Log component state
  logger.log('🎯 PAYMENT DEBUG - PricingComponent state:', {
    hasUser: !!user,
    userEmail: user?.email,
    isAnnual,
    timestamp: new Date().toISOString()
  });

  const [loadingState, setLoadingState] = useState<LoadingState>({
    trial: false,
    planId: null,
    errors: {},
    fading: {}
  })

  const {
    subscription,
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    plans,
    startTrial,
    upgradeToPlan,
    isLoading
  } = useSubscription()

  // DEBUG: Log subscription state
  logger.log('🎯 PAYMENT DEBUG - Subscription state:', {
    hasSubscription: !!subscription,
    subscriptionStatus: subscription?.status,
    subscriptionPlanId: subscription?.plan_id,
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    plansLoaded: plans.length,
    plansData: plans.map(p => ({ id: p.id, name: p.name, interval: p.billing_interval })),
    isLoading
  });

  // Fade out then remove errors after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    Object.entries(loadingState.errors).forEach(([key, message]) => {
      if (message && !loadingState.fading[key]) {
        // Start fade-out at 5s
        const fadeTimer = setTimeout(() => {
          setLoadingState(s => ({
            ...s,
            fading: { ...s.fading, [key]: true }
          }))
        }, 5000)
        // Remove completely after fade animation finishes
        const removeTimer = setTimeout(() => {
          setLoadingState(s => ({
            ...s,
            errors: { ...s.errors, [key]: null },
            fading: { ...s.fading, [key]: false }
          }))
        }, 5300) // fade duration 300ms
        timers.push(fadeTimer, removeTimer)
      }
    })
    return () => timers.forEach(clearTimeout)
  }, [loadingState.errors, loadingState.fading])

  // ===== Plan Fallbacks =====
  const monthlyPlan =
    plans.find(p => p.billing_interval === 'monthly') || { id: 'fallback-monthly', price: 70 }
  const annualPlan =
    plans.find(p => p.billing_interval === 'annual') || { id: 'fallback-annual', price: 672 }

  // DEBUG: Log plan selection
  logger.log('🎯 PAYMENT DEBUG - Plan selection:', {
    monthlyPlan: { id: monthlyPlan.id, price: monthlyPlan.price, isFallback: typeof monthlyPlan.id === 'string' },
    annualPlan: { id: annualPlan.id, price: annualPlan.price, isFallback: typeof annualPlan.id === 'string' },
    isAnnual,
    selectedPlan: isAnnual ? annualPlan : monthlyPlan
  });

  // ===== Handlers =====
  const handleStartTrial = async () => {
    if (!user) {
      toast.error('Please sign in to start your free trial')
      return
    }
    setLoadingState(s => ({ ...s, trial: true, errors: { ...s.errors, trial: null } }))
    try {
      await startTrial()
      toast.success('🎉 Your 7-day free trial has started!')
    } catch (error) {
      logger.error('Trial start failed:', error)
      setLoadingState(s => ({
        ...s,
        errors: { ...s.errors, trial: 'Could not start the trial. Please try again.' }
      }))
      toast.error('Could not start the trial')
    } finally {
      setLoadingState(s => ({ ...s, trial: false }))
    }
  }

  const handleDirectPayment = async (planId: string | number) => {
    if (!user) {
      toast.error('Please sign in to subscribe')
      return
    }
    setLoadingState(s => ({
      ...s,
      planId,
      errors: { ...s.errors, [planId]: null }
    }))
    try {
      await upgradeToPlan(planId)
      toast.loading('Redirecting to secure payment...')
    } catch (error) {
      logger.error('Direct payment failed:', error)
      setLoadingState(s => ({
        ...s,
        errors: { ...s.errors, [planId]: 'Payment process could not be started' }
      }))
      toast.error('Payment process could not be started')
    } finally {
      setLoadingState(s => ({ ...s, planId: null }))
    }
  }

  const handleUpgrade = async (planId: string | number) => {
    if (!user) {
      toast.error('Please sign in to subscribe')
      return
    }
    if (!hasActiveSubscription && !isOnTrial) {
      toast.error('Please start your free trial first or choose a plan')
      return
    }
    setLoadingState(s => ({
      ...s,
      planId,
      errors: { ...s.errors, [planId]: null }
    }))
    try {
      await upgradeToPlan(planId)
    } catch (error) {
      logger.error('Upgrade failed:', error)
      setLoadingState(s => ({
        ...s,
        errors: { ...s.errors, [planId]: 'Could not upgrade your plan' }
      }))
      toast.error('Could not upgrade your plan')
    } finally {
      setLoadingState(s => ({ ...s, planId: null }))
    }
  }

  // ===== Button Logic =====
  const getTrialButtonProps = () => {
    if (!user)
      return { text: 'Start Free Trial', disabled: false, onClick: () => toast.error('Please sign in first') }
    if (loadingState.trial)
      return { text: 'Starting...', disabled: true, onClick: () => {} }
    if (isOnTrial)
      return { text: `Active Trial (${trialDaysRemaining} days left)`, disabled: true, onClick: () => {} }
    if (hasActiveSubscription)
      return { text: 'Already Subscribed', disabled: true, onClick: () => {} }
    return { text: 'Start Free Trial', disabled: false, onClick: handleStartTrial }
  }

  const getPaidPlanButtonProps = (planId: string | number) => {
    if (!user) {
      const authUrl = `/auth?intent=plan&planId=${planId}`;
      logger.log('🎯 PAYMENT DEBUG - Pricing component navigating to:', authUrl);
      return { text: 'Get Started', disabled: false, onClick: () => navigate(authUrl) }
    }

    if (loadingState.planId === planId)
      return { text: 'Processing...', disabled: true, onClick: () => {} }

    if (subscription?.plan_id === planId)
      return { text: 'Current Plan', disabled: true, onClick: () => {} }

    if (!hasActiveSubscription && !isOnTrial) {
      return { text: 'Get Started', disabled: false, onClick: () => handleDirectPayment(planId) }
    }
    if (isOnTrial) {
      return { text: 'Upgrade Now', disabled: false, onClick: () => handleUpgrade(planId) }
    }
    return { text: 'Switch Plan', disabled: false, onClick: () => handleUpgrade(planId) }
  }

  const trialButtonProps = getTrialButtonProps()
  const monthlyButtonProps = getPaidPlanButtonProps(monthlyPlan.id)
  const proPlanId = isAnnual ? annualPlan.id : monthlyPlan.id
  const proButtonProps = getPaidPlanButtonProps(proPlanId)

  // DEBUG: Log all button states
  logger.log('🎯 PAYMENT DEBUG - Button states:', {
    trialButton: { text: trialButtonProps.text, disabled: trialButtonProps.disabled },
    monthlyButton: { text: monthlyButtonProps.text, disabled: monthlyButtonProps.disabled },
    proButton: { 
      text: proButtonProps.text, 
      disabled: proButtonProps.disabled,
      planId: proPlanId,
      isAnnual
    },
    allButtonsCalculated: true
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  const InlineError = ({ id, message }: { id: string | number; message?: string | null }) =>
    message ? (
      <div
        className={`mt-2 flex items-center text-red-600 text-xs transition-opacity duration-300 ${
          loadingState.fading[id] ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <AlertTriangle size={12} className="mr-1" />
        {message}
      </div>
    ) : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* DEBUG: Authentication State Panel */}
      {user && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">🚨 DEBUG: Already authenticated</p>
              <p className="text-xs text-yellow-600">User: {user.email} | This may affect button behavior</p>
            </div>
            <Button
              onClick={async () => {
                logger.log('🎯 PAYMENT DEBUG - Signing out to test clean flow');
                await signOut();
                toast.success('Signed out - try payment flow again');
              }}
              variant="outline"
              size="sm"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out for Clean Test
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explore everything Scola has to offer—then stick around to keep your notes, events, and subjects effortlessly organised
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <span className={`text-sm ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Annual</span>
        {isAnnual && <span className="text-sm text-green-600 font-medium">✓ Save 20%</span>}
      </div>

      {/* Cards */}
      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">

        {/* Trial Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium text-slate-800">Trial</h3>
            <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">Personal</span>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-semibold text-slate-800">Free</span>
            <span className="text-slate-500"> (7 day free trial)</span>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Enjoy access to every feature. Perfect for exploring all that Scola offers
          </p>
          
          <ul className="space-y-3 mb-8">
            <li className="flex text-sm text-slate-700 items-center">
              <Check className="w-5 h-5 mr-2 text-emerald-500" />
              Create notes, subjects and events
            </li>
            <li className="flex text-sm text-slate-700 items-center">
              <Check className="w-5 h-5 mr-2 text-emerald-500" />
              Search and advanced organisation tools
            </li>
            <li className="flex text-sm text-slate-700 items-center">
              <Check className="w-5 h-5 mr-2 text-emerald-500" />
              Seamless events management
            </li>
          </ul>
          
          <Button
            onClick={() => {
              logger.log('🎯 PAYMENT DEBUG - Trial button clicked:', { 
                text: trialButtonProps.text, 
                disabled: trialButtonProps.disabled 
              });
              trialButtonProps.onClick();
            }}
            disabled={trialButtonProps.disabled}
            className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            variant="outline"
          >
            {loadingState.trial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {trialButtonProps.text}
          </Button>
          <InlineError id="trial" message={loadingState.errors.trial} />
        </div>

        {/* Monthly Card */}
        {!isAnnual && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-slate-800">Monthly</h3>
              <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">Professional</span>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-semibold text-slate-800">R{monthlyPlan.price || 70}</span>
              <span className="text-slate-500">/month</span>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Perfect for professionals who prefer monthly billing
            </p>
            
            <ul className="space-y-3 mb-8">
              <li className="flex text-sm text-slate-700 items-center">
                <Check className="w-5 h-5 mr-2 text-emerald-500" />
                Unlimited subjects, notes and events
              </li>
              <li className="flex text-sm text-slate-700 items-center">
                <Check className="w-5 h-5 mr-2 text-emerald-500" />
                Search and advanced organisation
              </li>
              <li className="flex text-sm text-slate-700 items-center">
                <Check className="w-5 h-5 mr-2 text-emerald-500" />
                Seamless events management
              </li>
            </ul>
            
            <Button
              onClick={() => {
                logger.log('🎯 PAYMENT DEBUG - Monthly button clicked:', { 
                  text: monthlyButtonProps.text, 
                  disabled: monthlyButtonProps.disabled,
                  planId: monthlyPlan.id
                });
                monthlyButtonProps.onClick();
              }}
              disabled={monthlyButtonProps.disabled}
              className="w-full"
              variant="outline"
            >
              {loadingState.planId === monthlyPlan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {monthlyButtonProps.text}
            </Button>
            <InlineError id={monthlyPlan.id} message={loadingState.errors[monthlyPlan.id]} />
          </div>
        )}

        {/* Pro Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 shadow-lg text-white relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-white text-xl">Pro</h3>
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">Popular</span>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-semibold text-white">
              {isAnnual ? `R${annualPlan.price || 672}` : `R${monthlyPlan.price || 70}`}
            </span>
            <span className="text-white/70">
              {isAnnual ? ' billed annually (total for the year)' : '/month'}
            </span>
          </div>
          <p className="text-sm text-white/70 mb-6">
            Ideal for professionals who need more flexibility and features.
          </p>
          
          <ul className="space-y-3 mb-8">
            <li className="flex text-sm text-white items-center">
              <Check className="w-5 h-5 mr-2 text-white" />
              Unlimited subjects, notes and events
            </li>
            <li className="flex text-sm text-white items-center">
              <Check className="w-5 h-5 mr-2 text-white" />
              Search and advanced organisation
            </li>
            <li className="flex text-sm text-white items-center">
              <Check className="w-5 h-5 mr-2 text-white" />
              Seamless events management
            </li>
          </ul>
          
          <Button
            onClick={() => {
              logger.log('🎯 PAYMENT DEBUG - PRO BUTTON CLICKED! 🚀', { 
                text: proButtonProps.text, 
                disabled: proButtonProps.disabled,
                planId: proPlanId,
                isAnnual,
                hasUser: !!user,
                userEmail: user?.email,
                subscription: subscription?.status,
                buttonAction: 'About to call onClick handler'
              });
              proButtonProps.onClick();
            }}
            disabled={proButtonProps.disabled}
            className="w-full bg-white text-blue-600 hover:bg-blue-50"
          >
            {loadingState.planId === proPlanId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {proButtonProps.text}
          </Button>
          <InlineError id={proPlanId} message={loadingState.errors[proPlanId]} />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-12">
        <p className="text-muted-foreground text-sm max-w-3xl mx-auto">
          Every plan comes with secure checkout, private note storage restricted to your account, 
          and a knowledgeable support team to help you stay organised.
        </p>
      </div>
    </div>
  )
}