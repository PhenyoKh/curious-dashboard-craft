/*
 * ARCHIVED COMPONENT - BrokenPricing.tsx
 * 
 * Original: src/pages/Pricing.tsx
 * Archived: 2025-01-13
 * Reason: Payment flow was broken - navigated to '/auth' without payment intent parameters
 *         causing users to never reach payment after email verification
 * 
 * Issue: Lines 44-49 in handleSubscribeToPlan function missing payment intent logic
 * Fixed version: EnhancedPricingComponent.tsx (now promoted to main Pricing component)
 * 
 * DO NOT USE THIS COMPONENT - It breaks the subscription payment flow
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [annual, setAnnual] = useState(true); // Default to annual (matches the HTML initial state)
  
  const {
    subscription,
    hasActiveSubscription,
    isOnTrial,
    trialDaysRemaining,
    plans,
    startTrial,
    upgradeToPlan,
    isStartingTrial,
    isUpgrading,
    isLoading
  } = useSubscription();

  // Note: Loading states are provided by useSubscription hook (isStartingTrial, isUpgrading)

  const toggleBilling = () => {
    setAnnual(!annual);
  };

  // Handle trial start
  const handleStartTrial = () => {
    if (!user) {
      toast.error('Please sign in to start your free trial');
      navigate('/auth');
      return;
    }
    
    startTrial();
  };

  // Handle paid plan subscription
  const handleSubscribeToPlan = (billing: 'monthly' | 'annual') => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      navigate('/auth'); // ❌ BROKEN: Missing payment intent parameters!
      return;
    }

    const plan = plans.find(p => p.billing_interval === billing);
    if (!plan) {
      toast.error('Plan not found. Please try again.');
      return;
    }

    upgradeToPlan(plan.id);
  };

  // Get button props for trial plan
  const getTrialButtonProps = () => {
    if (isStartingTrial) {
      return { text: 'Starting...', disabled: true, onClick: () => {} };
    }
    if (!user) {
      return { text: 'Get Started', disabled: false, onClick: handleStartTrial };
    }
    if (isOnTrial) {
      return { text: `Active Trial (${trialDaysRemaining} days left)`, disabled: true, onClick: () => {} };
    }
    if (hasActiveSubscription) {
      return { text: 'Already Subscribed', disabled: true, onClick: () => {} };
    }
    return { text: 'Start Free Trial', disabled: false, onClick: handleStartTrial };
  };

  // Get button props for pro plan
  const getProButtonProps = () => {
    const billing = annual ? 'annual' : 'monthly';
    
    if (isUpgrading) {
      return { text: 'Processing...', disabled: true, onClick: () => {} };
    }
    if (!user) {
      return { text: 'Get Started', disabled: false, onClick: () => handleSubscribeToPlan(billing) };
    }
    
    const currentPlan = plans.find(p => p.id === subscription?.plan_id);
    if (currentPlan?.billing_interval === billing) {
      return { text: 'Current Plan', disabled: true, onClick: () => {} };
    }
    
    if (isOnTrial) {
      return { text: 'Upgrade Now', disabled: false, onClick: () => handleSubscribeToPlan(billing) };
    }
    if (hasActiveSubscription) {
      return { text: 'Switch Plan', disabled: false, onClick: () => handleSubscribeToPlan(billing) };
    }
    
    return { text: 'Get Started', disabled: false, onClick: () => handleSubscribeToPlan(billing) };
  };

  const trialButton = getTrialButtonProps();
  const proButton = getProButtonProps();

  // Show loading spinner while fetching subscription data
  if (isLoading) {
    return (
      <div className="bg-white flex items-center justify-center min-h-screen p-6">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="text-slate-600">Loading subscription information...</span>
        </div>
      </div>
    );
  }

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
            onClick={toggleBilling}
            aria-label="Toggle annual billing" 
            className={`relative w-11 h-6 transition-colors duration-200 outline-none focus:ring-2 focus:ring-indigo-400 rounded-full ${
              annual ? 'bg-indigo-500' : 'bg-slate-300'
            }`}
          >
            <span 
              className={`absolute left-1 top-1 w-4 h-4 transition-transform duration-200 bg-white rounded-full shadow ${
                annual ? 'translate-x-5' : 'translate-x-0'
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
                  <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Create notes, subjects and events
                </li>
                <li className="flex text-sm text-slate-700 items-center">
                  <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Search and advanced organisation tools
                </li>
                <li className="flex text-sm text-slate-700 items-center">
                  <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Seamless events management
                </li>
              </ul>
              
              <button 
                onClick={trialButton.onClick}
                disabled={trialButton.disabled}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isStartingTrial && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {trialButton.text}
              </button>
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
                  {annual ? 'R672' : 'R70'}
                </span>
                <span className="text-white/70">
                  {annual ? 'billed annually (total for the year)' : '/month'}
                </span>
              </div>
              <p className="text-sm text-white/70 mb-6">
                Ideal for professionals who need more flexibility and features.
              </p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex text-sm text-white items-center">
                  <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Unlimited subjects, notes and events
                </li>
                <li className="flex text-sm text-white items-center">
                  <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Search and advanced organisation
                </li>
                <li className="flex text-sm text-white items-center">
                  <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Seamless events management
                </li>
              </ul>
              
              <button 
                onClick={proButton.onClick}
                disabled={proButton.disabled}
                className="w-full py-3 px-4 bg-white hover:bg-white/90 text-indigo-600 font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isUpgrading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {proButton.text}
              </button>
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