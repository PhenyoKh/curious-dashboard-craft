/**
 * Lightweight hook for fetching subscription plans only
 * Useful when you only need plan data without full subscription state
 */

import { useQuery } from '@tanstack/react-query'
import { getSubscriptionPlans, type SubscriptionPlan } from '@/lib/subscription'

// Query key for consistent caching (matches main hook)
const PLANS_QUERY_KEY = ['subscription-plans'] as const

export const useSubscriptionPlans = () => {
  const plansQuery = useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: getSubscriptionPlans,
    staleTime: 1000 * 60 * 15, // 15 minutes (plans change rarely)
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2
  })

  // Helper functions to get specific plan types
  const getMonthlyPlan = (): SubscriptionPlan | undefined =>
    plansQuery.data?.find(plan => plan.billing_interval === 'monthly')

  const getAnnualPlan = (): SubscriptionPlan | undefined =>
    plansQuery.data?.find(plan => plan.billing_interval === 'annual')

  const getPlanById = (planId: number): SubscriptionPlan | undefined =>
    plansQuery.data?.find(plan => plan.id === planId)

  return {
    // Data
    plans: plansQuery.data || [],
    monthlyPlan: getMonthlyPlan(),
    annualPlan: getAnnualPlan(),
    
    // State
    isLoading: plansQuery.isLoading,
    error: plansQuery.error,
    isSuccess: plansQuery.isSuccess,
    
    // Helpers
    getPlanById,
    
    // Query controls
    refetch: plansQuery.refetch
  }
}

export type UseSubscriptionPlansReturn = ReturnType<typeof useSubscriptionPlans>