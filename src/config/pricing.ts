/**
 * Centralized Pricing Configuration
 * 
 * This file contains all pricing-related constants and configuration
 * to ensure consistency across the application and enable easy updates.
 */

export const PRICING_CONFIG = {
  // Monthly subscription pricing
  MONTHLY_SUBSCRIPTION: {
    AMOUNT: 50,
    CURRENCY: 'ZAR',
    DISPLAY_PRICE: 'R50',
    FORMATTED_DISPLAY: 'R50/month',
    PERIOD: 'month',
    BILLING_INTERVAL: 'monthly' as const
  },

  // Annual subscription pricing  
  ANNUAL_SUBSCRIPTION: {
    AMOUNT: 360,
    CURRENCY: 'ZAR',
    DISPLAY_PRICE: 'R360',
    FORMATTED_DISPLAY: 'R360/year',
    PERIOD: 'year',
    BILLING_INTERVAL: 'annual' as const
  },

  // PayFast specific configuration
  PAYFAST: {
    // Monthly PayFast configuration
    MONTHLY: {
      AMOUNT: '50',
      RECURRING_AMOUNT: '50',
      FREQUENCY: '3', // 3 = monthly billing
      ITEM_NAME: 'Scola Pro - Monthly Access',
      ITEM_DESCRIPTION: 'Monthly access to Scola study management platform.'
    },
    
    // Annual PayFast configuration
    ANNUAL: {
      AMOUNT: '360',
      RECURRING_AMOUNT: '360', 
      FREQUENCY: '6', // 6 = annual billing
      ITEM_NAME: 'Scola Pro - Annual Access',
      ITEM_DESCRIPTION: 'Annual access to Scola study management platform.'
    },
    
    // Common PayFast configuration
    COMMON: {
      SUBSCRIPTION_TYPE: '1',
      CYCLES: '0', // 0 = indefinite recurring
      RETURN_URL: 'https://www.scola.co.za/auth?mode=login&payment=success',
      CANCEL_URL: 'https://www.scola.co.za/payment/cancelled',
      NOTIFY_URL: 'https://fprsjziqubbhznavjskj.supabase.co/functions/v1/payfast-webhook-subscription',
      RECEIVER: '14995632'
    }
  },

  // Savings calculation
  SAVINGS: {
    MONTHLY_TOTAL: 50 * 12, // R600 if paid monthly for a year
    ANNUAL_TOTAL: 360,      // R360 if paid annually
    PERCENTAGE_SAVED: Math.round(((50 * 12 - 360) / (50 * 12)) * 100) // 40% savings
  }
} as const

// Helper functions for consistent pricing display
export const formatPrice = (amount: number): string => {
  return `R${amount}`
}

export const formatPriceWithPeriod = (amount: number, period: string): string => {
  return `${formatPrice(amount)}/${period}`
}

// Get pricing config by billing interval
export const getPricingConfig = (isAnnual: boolean = true) => {
  return isAnnual ? PRICING_CONFIG.ANNUAL_SUBSCRIPTION : PRICING_CONFIG.MONTHLY_SUBSCRIPTION
}

// Get PayFast config by billing interval
export const getPayFastConfig = (isAnnual: boolean = true) => {
  return isAnnual ? PRICING_CONFIG.PAYFAST.ANNUAL : PRICING_CONFIG.PAYFAST.MONTHLY
}

// PayFast form field generator with billing interval support
export const generatePayFastFields = (userId: string, isAnnual: boolean = true, customStr2: string = 'subscription_purchase') => {
  const payfastConfig = getPayFastConfig(isAnnual)
  
  return {
    cmd: '_paynow',
    receiver: PRICING_CONFIG.PAYFAST.COMMON.RECEIVER,
    return_url: PRICING_CONFIG.PAYFAST.COMMON.RETURN_URL,
    cancel_url: PRICING_CONFIG.PAYFAST.COMMON.CANCEL_URL,
    notify_url: PRICING_CONFIG.PAYFAST.COMMON.NOTIFY_URL,
    amount: payfastConfig.AMOUNT,
    item_name: payfastConfig.ITEM_NAME,
    item_description: payfastConfig.ITEM_DESCRIPTION,
    subscription_type: PRICING_CONFIG.PAYFAST.COMMON.SUBSCRIPTION_TYPE,
    recurring_amount: payfastConfig.RECURRING_AMOUNT,
    cycles: PRICING_CONFIG.PAYFAST.COMMON.CYCLES,
    frequency: payfastConfig.FREQUENCY,
    custom_str1: userId,
    custom_str2: customStr2
  }
}

// Convenience functions for specific billing intervals
export const generateMonthlyPayFastFields = (userId: string, customStr2?: string) => 
  generatePayFastFields(userId, false, customStr2)

export const generateAnnualPayFastFields = (userId: string, customStr2?: string) => 
  generatePayFastFields(userId, true, customStr2)

// Type definitions for TypeScript safety
export type PricingConfig = typeof PRICING_CONFIG
export type PayFastFields = ReturnType<typeof generatePayFastFields>
export type BillingInterval = 'monthly' | 'annual'

// Billing interval utilities
export const getBillingIntervalFromFrequency = (frequency: string): BillingInterval => {
  return frequency === '3' ? 'monthly' : 'annual'
}

export const getFrequencyFromBillingInterval = (billingInterval: BillingInterval): string => {
  return billingInterval === 'monthly' ? '3' : '6'
}