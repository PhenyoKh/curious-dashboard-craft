/**
 * Core subscription management hook
 * Provides comprehensive subscription state and actions using TanStack Query
 */

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { logger } from '@/utils/logger';
import {
  getSubscriptionStatus,
  createTrialSubscription,
  createPayFastPayment,
  submitPayFastPayment,
  cancelSubscription,
  getSubscriptionPlans,
  createSubscriptionForPlan,
  hasActiveSubscription,
  isTrialExpired,
  getTrialDaysRemaining,
  SubscriptionError,
  type UserSubscription,
  type SubscriptionPlan,
  type PayFastPaymentData
} from '@/lib/subscription'

// Query keys for consistent caching
const QUERY_KEYS = {
  subscription: (userId: string) => ['subscription', userId] as const,
  plans: () => ['subscription-plans'] as const
}

// Error message mapping for user-friendly notifications
const getErrorMessage = (error: unknown): string => {
  if (error instanceof SubscriptionError) {
    // Check for specific RLS (Row Level Security) violations
    if (error.message.includes('row-level security policy') || error.message.includes('violates row-level security')) {
      return 'You may already have a subscription. Please refresh the page and try again, or contact support if the issue persists.'
    }
    
    switch (error.code) {
      case 'TRIAL_CREATION_FAILED':
        return 'Unable to start your free trial. Please try again.'
      case 'STATUS_FETCH_FAILED':
        return 'Unable to load your subscription information.'
      case 'PAYMENT_CREATION_FAILED':
        return 'Unable to process payment. Please check your details and try again.'
      case 'CANCELLATION_FAILED':
        return 'Unable to cancel subscription. Please contact support.'
      case 'AUTH_ERROR':
        return 'Please sign in to manage your subscription.'
      case 'SUBSCRIPTION_CREATION_FAILED':
        // Check for duplicate subscription errors
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          return 'You already have a subscription. Redirecting to your dashboard...'
        }
        return 'Unable to create subscription. Please try again or contact support.'
      default:
        return error.message
    }
  }
  return 'An unexpected error occurred. Please try again.'
}

// Main subscription hook
export const useSubscription = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Hook stability logging
  const hookId = React.useRef(Math.random().toString(36).substr(2, 9));
  logger.log(`🔍 SUBSCRIPTION HOOK [${hookId.current}] - useSubscription executing:`, {
    hasUser: !!user,
    userId: user?.id,
    timestamp: new Date().toISOString()
  });

  // Subscription status query
  const subscriptionQuery = useQuery({
    queryKey: QUERY_KEYS.subscription(user?.id || ''),
    queryFn: () => getSubscriptionStatus(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof SubscriptionError && error.code === 'AUTH_ERROR') {
        return false
      }
      return failureCount < 3
    }
  })

  // Subscription plans query
  const plansQuery = useQuery({
    queryKey: QUERY_KEYS.plans(),
    queryFn: getSubscriptionPlans,
    staleTime: 1000 * 60 * 15, // 15 minutes (plans change rarely)
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2
  })

  // Start trial mutation
  const startTrialMutation = useMutation({
    mutationFn: () => createTrialSubscription(user!),
    onSuccess: (subscription) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        QUERY_KEYS.subscription(user!.id),
        subscription
      )
      toast.success('🎉 Welcome! Your 7-day free trial has started.')
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      toast.error(message)
    }
  })

  // Upgrade to plan mutation
  const upgradeMutation = useMutation({
    mutationFn: async ({ planId }: { planId: number }) => {
      logger.log('🎯 PAYMENT DEBUG - Upgrade mutation starting:', { planId, userId: user?.id });
      
      if (!user) throw new SubscriptionError('User not authenticated', 'AUTH_ERROR')
      
      logger.log('🎯 PAYMENT DEBUG - Creating subscription for plan:', planId);
      
      // Fetch plans directly to bypass any query timing issues
      logger.log('🎯 PAYMENT DEBUG - Fetching plans directly from database');
      const plans = await getSubscriptionPlans();
      
      logger.log('🎯 PAYMENT DEBUG - Direct plans fetch result:', {
        plansCount: plans?.length,
        plans: plans?.map(p => ({ id: p.id, type: typeof p.id, name: p.name }))
      });
      
      if (!plans || plans.length === 0) {
        throw new SubscriptionError('No subscription plans available. Please contact support.', 'PLANS_NOT_AVAILABLE');
      }
      
      // Create subscription for the plan
      const subscription = await createSubscriptionForPlan(user.id, planId)
      
      logger.log('🎯 PAYMENT DEBUG - Plan lookup debug:', {
        planId,
        planIdType: typeof planId,
        availablePlans: plans,
        planIds: plans?.map(p => ({ id: p.id, type: typeof p.id, name: p.name }))
      });
      
      const plan = plans?.find(p => p.id === planId)
      
      logger.log('🎯 PAYMENT DEBUG - Found plan:', { plan, availablePlans: plans?.length });
      
      if (!plan) throw new SubscriptionError('Plan not found', 'PLAN_NOT_FOUND')

      logger.log('🎯 PAYMENT DEBUG - Creating PayFast payment data');
      // Create PayFast payment
      const paymentData = await createPayFastPayment(user, plan, subscription.id)
      
      logger.log('🎯 PAYMENT DEBUG - Payment data created successfully');
      return { subscription, paymentData }
    },
    onSuccess: ({ subscription, paymentData }) => {
      logger.log('🎯 PAYMENT DEBUG - Upgrade mutation success:', { 
        subscriptionId: subscription.id, 
        paymentDataKeys: Object.keys(paymentData) 
      });
      
      // Optimistically update the cache
      queryClient.setQueryData(
        QUERY_KEYS.subscription(user!.id),
        subscription
      )
      
      logger.log('🎯 PAYMENT DEBUG - Showing redirect toast and preparing PayFast submit');
      toast.success('Redirecting to secure payment...', {
        duration: 2000
      })
      
      // Small delay to show the toast before redirect
      setTimeout(() => {
        logger.log('🎯 PAYMENT DEBUG - Submitting to PayFast now');
        submitPayFastPayment(paymentData)
      }, 1500)
    },
    onError: (error) => {
      logger.log('🎯 PAYMENT DEBUG - Upgrade mutation error:', error);
      const message = getErrorMessage(error)
      
      // Special handling for RLS violations that might indicate existing subscription
      if (error instanceof SubscriptionError && 
          (error.message.includes('row-level security policy') || 
           error.message.includes('violates row-level security'))) {
        
        logger.log('🎯 PAYMENT DEBUG - RLS violation detected, checking for existing subscription');
        
        // Refresh subscription data to check current state
        setTimeout(() => {
          logger.log('🎯 PAYMENT DEBUG - Refreshing subscription data after RLS error');
          subscriptionQuery.refetch();
        }, 1000);
        
        // Show error but suggest refresh
        toast.error(message, {
          duration: 5000,
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
      } else {
        // Standard error handling
        toast.error(message)
      }
    }
  })

  // Cancel subscription mutation  
  const cancelMutation = useMutation({
    mutationFn: ({ subscriptionId, reason }: { subscriptionId: string; reason?: string }) =>
      cancelSubscription(subscriptionId, reason),
    onSuccess: (updatedSubscription) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.subscription(user!.id),
        updatedSubscription
      )
      
      const message = updatedSubscription.cancel_at_period_end 
        ? 'Your subscription will be cancelled at the end of the current period.'
        : 'Your subscription has been cancelled.'
      
      toast.success(message)
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      toast.error(message)
    }
  })

  // Derived state
  const subscription = subscriptionQuery.data
  const plans = plansQuery.data || []
  const hasActive = hasActiveSubscription(subscription)
  const isOnTrial = subscription?.status === 'trial' && !isTrialExpired(subscription)
  const trialDaysRemaining = subscription ? getTrialDaysRemaining(subscription) : 0

  // Actions
  const startTrial = () => {
    if (!user) {
      toast.error('Please sign in to start your free trial.')
      return
    }
    startTrialMutation.mutate()
  }

  const upgradeToPlan = (planId: number, sessionUser?: { id: string; email: string }) => {
    const callId = Math.random().toString(36).substr(2, 9);
    logger.log(`🚨 UPGRADE CALL [${callId}] - upgradeToPlan invoked at:`, new Date().toISOString());
    logger.log(`🚨 UPGRADE PARAMS [${callId}]:`, {
      planId,
      hasSessionUser: !!sessionUser,
      sessionUserId: sessionUser?.id,
      sessionUserEmail: sessionUser?.email,
      mutationPending: upgradeMutation.isPending,
      mutationStatus: upgradeMutation.status,
      stackTrace: new Error().stack?.split('\n').slice(1, 5)
    });
    
    // CRITICAL: Guard against multiple simultaneous calls
    if (upgradeMutation.isPending) {
      logger.log(`🚨 BLOCKED [${callId}] - Mutation already pending, ignoring duplicate call`);
      return;
    }
    
    // CRITICAL: Check if user already has an active subscription
    if (subscription && subscription.status === 'active') {
      logger.log(`🚨 BLOCKED [${callId}] - User already has active subscription:`, subscription);
      toast.error('You already have an active subscription');
      return;
    }
    
    // Use session user if provided, otherwise fall back to hook user
    const effectiveUser = sessionUser || user;
    logger.log('🎯 PAYMENT DEBUG - Effective user state:', {
      hasUser: !!effectiveUser,
      userId: effectiveUser?.id,
      userEmail: effectiveUser?.email,
      source: sessionUser ? 'sessionUser' : 'hookUser',
      timestamp: new Date().toISOString()
    });
    
    if (!effectiveUser) {
      logger.log('🎯 PAYMENT DEBUG - No effective user available, attempting retry...');
      
      // Only retry if no session user was provided (fallback to hook user)
      if (!sessionUser) {
        setTimeout(() => {
          const retryUser = user; // Re-check user from context
          logger.log('🎯 PAYMENT DEBUG - Retry user check:', {
            hasUser: !!retryUser,
            userId: retryUser?.id,
            userEmail: retryUser?.email,
            retryTimestamp: new Date().toISOString()
          });
          
          if (retryUser) {
            logger.log('🎯 PAYMENT DEBUG - User now available on retry, proceeding with mutation...');
            upgradeMutation.mutate({ planId });
          } else {
            logger.error('🎯 PAYMENT DEBUG - User still not available after retry');
            toast.error('Please sign in and try again');
          }
        }, 300); // Short 300ms retry
      } else {
        logger.error('🎯 PAYMENT DEBUG - Session user provided but invalid');
        toast.error('Session validation failed. Please try again');
      }
      
      return;
    }
    
    // Plans will be fetched directly within the mutation for reliability
    logger.log('🎯 PAYMENT DEBUG - Pre-mutation check - Plans will be fetched directly in mutation');
    
    logger.log(`🚨 MUTATION START [${callId}] - Starting upgrade mutation with effective user`);
    upgradeMutation.mutate({ planId });
  }

  const cancelSubscriptionAction = (reason?: string) => {
    if (!subscription) {
      toast.error('No active subscription to cancel.')
      return
    }
    cancelMutation.mutate({ subscriptionId: subscription.id, reason })
  }

  return {
    // State
    subscription,
    plans,
    hasActiveSubscription: hasActive,
    isOnTrial,
    trialDaysRemaining,
    
    // Loading states
    isLoading: subscriptionQuery.isLoading || plansQuery.isLoading,
    isStartingTrial: startTrialMutation.isPending,
    isUpgrading: upgradeMutation.isPending,
    isCancelling: cancelMutation.isPending,
    
    // Error states
    error: subscriptionQuery.error || plansQuery.error,
    
    // Actions
    startTrial,
    upgradeToPlan,
    cancelSubscription: cancelSubscriptionAction,
    
    // Query controls
    refetch: () => {
      subscriptionQuery.refetch()
      plansQuery.refetch()
    }
  }
}

// Export types for consumers
export type UseSubscriptionReturn = ReturnType<typeof useSubscription>