import React, { useState, useEffect } from 'react'
import { Check, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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

const Pricing: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isAnnual, setIsAnnual] = useState(true)

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

  // Plan Fallbacks
  const monthlyPlan =
    plans.find(p => p.billing_interval === 'monthly') || { id: 'fallback-monthly', price: 70 }
  const annualPlan =
    plans.find(p => p.billing_interval === 'annual') || { id: 'fallback-annual', price: 672 }

  // Handlers
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
      console.error('Trial start failed:', error)
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
      console.log('🎯 PAYMENT DEBUG - Starting payment flow for plan:', planId)
      await upgradeToPlan(planId)
      toast.loading('Redirecting to secure payment...')
    } catch (error) {
      console.error('Direct payment failed:', error)
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
      console.log('🎯 PAYMENT DEBUG - Starting upgrade for plan:', planId)
      await upgradeToPlan(planId)
    } catch (error) {
      console.error('Upgrade failed:', error)
      setLoadingState(s => ({
        ...s,
        errors: { ...s.errors, [planId]: 'Could not upgrade your plan' }
      }))
      toast.error('Could not upgrade your plan')
    } finally {
      setLoadingState(s => ({ ...s, planId: null }))
    }
  }

  // Button Logic
  const getTrialButtonProps = () => {
    if (!user)
      return { text: 'Start Free Trial', disabled: false, onClick: () => navigate('/auth') }
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
      console.log('🎯 PAYMENT DEBUG - Pricing component navigating to:', authUrl);
      return { text: 'Subscribe', disabled: false, onClick: () => navigate(authUrl) }
    }

    if (loadingState.planId === planId)
      return { text: 'Processing...', disabled: true, onClick: () => {} }

    if (subscription?.plan_id === planId)
      return { text: 'Current Plan', disabled: true, onClick: () => {} }

    if (!hasActiveSubscription && !isOnTrial) {
      return { text: 'Subscribe', disabled: false, onClick: () => handleDirectPayment(planId) }
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

  if (isLoading) {
    return (
      <div className="bg-white flex items-center justify-center min-h-screen p-6">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="text-slate-600">Loading subscription information...</span>
        </div>
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
    <div 
      className="bg-white flex items-center justify-center min-h-screen p-6"
      style={{
        backgroundImage: `linear-gradient(to right,rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(0,0,0,0.04) 1px,transparent 1px)`,
        backgroundSize: '40px 40px'
      }}
    >
      <div className="w-full max-w-4xl">
        
        {/* Heading */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-800 mb-2">Choose Your Plan</h2>
          <p className="max-w-lg text-slate-500 mr-auto ml-auto">
            Explore everything Scola has to offer—then stick around to keep your notes, events, and subjects effortlessly organised
          </p>
        </div>
        
        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-10">
          <span className="text-sm text-slate-600 mr-3">Monthly</span>
          
          {/* switch */}
          <button 
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Toggle annual billing" 
            className={`relative w-11 h-6 transition-colors duration-200 outline-none focus:ring-2 focus:ring-indigo-400 rounded-full ${
              isAnnual ? 'bg-indigo-500' : 'bg-slate-300'
            }`}
          >
            <span 
              className={`absolute left-1 top-1 w-4 h-4 transition-transform duration-200 bg-white rounded-full shadow ${
                isAnnual ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          
          <span className="text-sm text-slate-600 ml-3 flex items-center">
            Annual 
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500 ml-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="ml-1 text-emerald-600 font-medium">Save 20%</span>
          </span>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Trial Plan */}
          <div className="rounded-2xl overflow-hidden shadow-lg bg-white border border-slate-200">
            <div className="p-6">
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
              
              <button 
                onClick={trialButtonProps.onClick}
                disabled={trialButtonProps.disabled}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loadingState.trial && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {trialButtonProps.text}
              </button>
              <InlineError id="trial" message={loadingState.errors.trial} />
            </div>
          </div>
          
          {/* Pro Plan */}
          <div className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-indigo-500 to-indigo-400 transform md:scale-105">
            <div className="pt-6 pr-6 pb-6 pl-6">
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
              
              <button 
                onClick={() => {
                  console.log('🎯 PAYMENT DEBUG - Pro subscription button clicked:', { 
                    text: proButtonProps.text, 
                    disabled: proButtonProps.disabled,
                    planId: proPlanId,
                    isAnnual,
                    hasUser: !!user,
                    userEmail: user?.email
                  });
                  proButtonProps.onClick();
                }}
                disabled={proButtonProps.disabled}
                className="w-full py-3 px-4 bg-white hover:bg-white/90 text-indigo-600 font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loadingState.planId === proPlanId && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {proButtonProps.text}
              </button>
              <InlineError id={proPlanId} message={loadingState.errors[proPlanId]} />
            </div>
          </div>
        </div>
        
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500">
            Every plan comes with secure checkout, private note storage restricted to your account, and a knowledgeable support team to help you stay organised.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;