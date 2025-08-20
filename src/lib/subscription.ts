// src/lib/subscription.ts
import { supabase } from '@/integrations/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

// -------------------
// TypeScript Interfaces
// -------------------
export interface SubscriptionPlan {
  id: number
  name: string
  price: number
  billing_interval: 'monthly' | 'annual'
  trial_days: number
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: number | null
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  payfast_subscription_token: string | null
  payfast_subscription_id: string | null
  trial_start_date: string
  trial_end_date: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  plan?: SubscriptionPlan
}

export interface PaymentTransaction {
  id: string
  user_id: string
  subscription_id: string | null
  payfast_payment_id: string
  payfast_transaction_id: string | null
  amount: number
  currency: string
  status: 'pending' | 'complete' | 'failed' | 'cancelled'
  payment_method: string | null
  payfast_itn_data: Record<string, unknown>
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface PayFastPaymentData {
  merchant_id: string
  merchant_key: string
  return_url: string
  cancel_url: string
  notify_url: string
  name_first: string
  email_address: string
  m_payment_id: string
  amount: string
  item_name: string
  item_description: string
  custom_str1: string
  custom_str2: string
  custom_str3: string
  signature: string
}

// -------------------
// Error Class
// -------------------
export class SubscriptionError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'SubscriptionError'
  }
}

// -------------------
// Main Subscription Functions
// -------------------

export async function createTrialSubscription(user: User): Promise<UserSubscription> {
  try {
    const { data, error } = await supabase.rpc('start_trial_subscription', {
      p_user_id: user.id,
      p_plan_id: null
    })

    if (error) throw new SubscriptionError(`Failed to create trial: ${error.message}`, 'TRIAL_CREATION_FAILED')
    if (!data || typeof data !== 'string') {
      throw new SubscriptionError('Invalid subscription ID returned', 'TRIAL_CREATION_FAILED')
    }

    const { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select(`*, plan:subscription_plans(*)`)
      .eq('id', data)
      .single()

    if (fetchError) {
      throw new SubscriptionError(`Failed to fetch trial subscription: ${fetchError.message}`, 'TRIAL_FETCH_FAILED')
    }
    return subscription as UserSubscription
  } catch (err) {
    if (err instanceof SubscriptionError) throw err
    throw new SubscriptionError(`Unexpected error creating trial: ${err}`, 'UNKNOWN_ERROR')
  }
}

export async function getSubscriptionStatus(userId: string): Promise<UserSubscription | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_subscription_status', { p_user_id: userId })
    if (error) throw new SubscriptionError(`Failed to get subscription status: ${error.message}`, 'STATUS_FETCH_FAILED')
    return Array.isArray(data) && data.length > 0 ? (data[0] as UserSubscription) : null
  } catch (err) {
    if (err instanceof SubscriptionError) throw err
    throw new SubscriptionError(`Unexpected error fetching subscription: ${err}`, 'UNKNOWN_ERROR')
  }
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) throw new SubscriptionError(`Failed to fetch plans: ${error.message}`, 'PLANS_FETCH_FAILED')
    return data as SubscriptionPlan[]
  } catch (err) {
    if (err instanceof SubscriptionError) throw err
    throw new SubscriptionError(`Unexpected error fetching plans: ${err}`, 'UNKNOWN_ERROR')
  }
}

export async function createSubscriptionForPlan(userId: string, planId: number): Promise<UserSubscription> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({ user_id: userId, plan_id: planId, status: 'trial' })
      .select(`*, plan:subscription_plans(*)`)
      .single()

    if (error) throw new SubscriptionError(`Failed to create subscription: ${error.message}`, 'SUBSCRIPTION_CREATION_FAILED')
    return data as UserSubscription
  } catch (err) {
    if (err instanceof SubscriptionError) throw err
    throw new SubscriptionError(`Unexpected error creating subscription: ${err}`, 'UNKNOWN_ERROR')
  }
}

/**
 * Requests signed payment data from Supabase Edge Function
 */
export async function createPayFastPayment(
  user: User,
  plan: SubscriptionPlan,
  subscriptionId: string
): Promise<PayFastPaymentData> {
  console.log('🔥 PAYFAST DEBUG - createPayFastPayment called with:', {
    userId: user.id,
    userEmail: user.email,
    planId: plan.id,
    planName: plan.name,
    planPrice: plan.price,
    billingInterval: plan.billing_interval,
    subscriptionId
  });

  try {
    const { data: { session } } = await supabase.auth.getSession()
    console.log('🔥 PAYFAST DEBUG - Session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userId: session?.user?.id
    });

    if (!session) throw new SubscriptionError('User not authenticated', 'AUTH_ERROR')

    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payfast-payment`
    console.log('🔥 PAYFAST DEBUG - Edge function URL:', edgeFunctionUrl);
    console.log('🔥 PAYFAST DEBUG - Environment VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);

    const requestPayload = {
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
      userEmail: user.email,
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      billingInterval: plan.billing_interval,
      subscriptionId
    };

    console.log('🔥 PAYFAST DEBUG - Request payload:', requestPayload);

    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };

    console.log('🔥 PAYFAST DEBUG - Request headers:', {
      'Content-Type': requestHeaders['Content-Type'],
      'Authorization': `Bearer ${session.access_token.substring(0, 20)}...` // Truncated for security
    });

    console.log('🔥 PAYFAST DEBUG - Making fetch request...');
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestPayload)
    })

    console.log('🔥 PAYFAST DEBUG - Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      console.log('🔥 PAYFAST DEBUG - Response not OK, attempting to parse error...');
      
      let errorData;
      try {
        const errorText = await response.text();
        console.log('🔥 PAYFAST DEBUG - Raw error response text:', errorText);
        
        try {
          errorData = JSON.parse(errorText);
          console.log('🔥 PAYFAST DEBUG - Parsed error data:', errorData);
        } catch (parseError) {
          console.log('🔥 PAYFAST DEBUG - Could not parse error as JSON:', parseError);
          errorData = { error: errorText };
        }
      } catch (textError) {
        console.log('🔥 PAYFAST DEBUG - Could not read error response text:', textError);
        errorData = {};
      }

      throw new SubscriptionError(
        `Payment creation failed: ${errorData.error || response.statusText}`,
        'PAYMENT_CREATION_FAILED'
      )
    }

    console.log('🔥 PAYFAST DEBUG - Parsing successful response...');
    const responseData = await response.json()
    console.log('🔥 PAYFAST DEBUG - PayFast payment data received:', {
      hasSignature: !!responseData.signature,
      hasMerchantId: !!responseData.merchant_id,
      hasPaymentId: !!responseData.m_payment_id,
      hasAmount: !!responseData.amount,
      keysReceived: Object.keys(responseData)
    });
    
    return responseData
  } catch (err) {
    console.log('🔥 PAYFAST DEBUG - Error in createPayFastPayment:', {
      errorType: err.constructor.name,
      errorMessage: err.message,
      errorStack: err.stack
    });

    if (err instanceof SubscriptionError) throw err
    throw new SubscriptionError(`Failed to create PayFast payment: ${err}`, 'PAYMENT_CREATION_FAILED')
  }
}

export async function cancelSubscription(subscriptionId: string, reason?: string): Promise<UserSubscription> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'User requested cancellation'
      })
      .eq('id', subscriptionId)
      .select(`*, plan:subscription_plans(*)`)
      .single()

    if (error) throw new SubscriptionError(`Failed to cancel subscription: ${error.message}`, 'CANCELLATION_FAILED')

    await supabase.from('subscription_events').insert({
      subscription_id: subscriptionId,
      user_id: data.user_id,
      event_type: 'subscription_cancelled',
      event_data: { reason: reason || 'User requested cancellation' }
    })

    return data as UserSubscription
  } catch (err) {
    if (err instanceof SubscriptionError) throw err
    throw new SubscriptionError(`Unexpected error cancelling subscription: ${err}`, 'UNKNOWN_ERROR')
  }
}

// -------------------
// Helper Functions
// -------------------

export function isTrialExpired(subscription: UserSubscription): boolean {
  return subscription.status === 'trial' && !!subscription.trial_end_date &&
    new Date() > new Date(subscription.trial_end_date)
}

export function getTrialDaysRemaining(subscription: UserSubscription): number {
  if (subscription.status !== 'trial' || !subscription.trial_end_date) return 0
  const diffMs = new Date(subscription.trial_end_date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function hasActiveSubscription(subscription: UserSubscription | null): boolean {
  if (!subscription) return false
  return !isTrialExpired(subscription) &&
    ['trial', 'active'].includes(subscription.status) &&
    (!subscription.cancel_at_period_end ||
      (subscription.current_period_end && new Date() < new Date(subscription.current_period_end)))
}

export async function getPaymentHistory(userId: string): Promise<PaymentTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new SubscriptionError(`Failed to fetch payment history: ${error.message}`, 'PAYMENT_HISTORY_FAILED')
    return data as PaymentTransaction[]
  } catch (err) {
    if (err instanceof SubscriptionError) throw err
    throw new SubscriptionError(`Unexpected error fetching payment history: ${err}`, 'UNKNOWN_ERROR')
  }
}

/**
 * Redirects user to PayFast by submitting a hidden form
 */
export function submitPayFastPayment(paymentData: PayFastPaymentData): void {
  console.log('🔥 PAYFAST FORM DEBUG - Starting form submission');
  console.log('🔥 PAYFAST FORM DEBUG - Environment:', {
    VITE_PAYFAST_SANDBOX: import.meta.env.VITE_PAYFAST_SANDBOX,
    isSandbox: import.meta.env.VITE_PAYFAST_SANDBOX === 'true'
  });

  // Import our standardized signature utility
  import('../utils/payfast').then(({ validatePayFastSignature, generatePayFastSignature }) => {
    // Validate the signature we received from server
    const passphrase = 'jt7NOE43FZPn'; // Should match Edge Function passphrase
    const isSignatureValid = validatePayFastSignature(paymentData, paymentData.signature, passphrase);
    
    if (!isSignatureValid) {
      console.error('🔥 PAYFAST FORM DEBUG - SIGNATURE MISMATCH DETECTED!');
      console.error('Server provided signature does not match our calculation');
      
      // Generate our own signature as fallback
      const correctedSignature = generatePayFastSignature(paymentData, passphrase);
      console.log('🔥 PAYFAST FORM DEBUG - Using corrected signature:', correctedSignature);
      paymentData.signature = correctedSignature;
    } else {
      console.log('🔥 PAYFAST FORM DEBUG - ✅ Signature validation passed');
    }

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = import.meta.env.VITE_PAYFAST_SANDBOX === 'true' 
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process'

    console.log('🔥 PAYFAST FORM DEBUG - Form action URL:', form.action);
    console.log('🔥 PAYFAST FORM DEBUG - Payment data being submitted:', JSON.stringify(paymentData, null, 2));

    // Validate required fields
    const requiredFields = ['merchant_id', 'merchant_key', 'amount', 'item_name'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);
    if (missingFields.length > 0) {
      console.error('🔥 PAYFAST FORM DEBUG - Missing required fields:', missingFields);
    }

    // Check for suspicious values
    if (paymentData.merchant_id === 'undefined' || paymentData.merchant_id === 'null') {
      console.error('🔥 PAYFAST FORM DEBUG - Invalid merchant_id value:', paymentData.merchant_id);
    }
    if (paymentData.merchant_key === 'undefined' || paymentData.merchant_key === 'null') {
      console.error('🔥 PAYFAST FORM DEBUG - Invalid merchant_key value:', paymentData.merchant_key);
    }

    console.log('🔥 PAYFAST FORM DEBUG - Form fields to be added:');
    for (const [key, value] of Object.entries(paymentData)) {
      console.log(`  ${key}: "${value}" (length: ${value.toString().length})`);
      
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value.toString()
      form.appendChild(input)
    }

    console.log('🔥 PAYFAST FORM DEBUG - Form HTML preview:');
    document.body.appendChild(form);
    console.log(form.outerHTML);

    console.log('🔥 PAYFAST FORM DEBUG - Submitting form to PayFast...');
    form.submit()
    
    // Don't remove immediately to allow inspection
    setTimeout(() => {
      document.body.removeChild(form);
      console.log('🔥 PAYFAST FORM DEBUG - Form removed from DOM');
    }, 1000);
  }).catch(error => {
    console.error('🔥 PAYFAST FORM DEBUG - Error importing signature utility:', error);
    // Fallback to original submission without validation
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = import.meta.env.VITE_PAYFAST_SANDBOX === 'true' 
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process'

    for (const [key, value] of Object.entries(paymentData)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value.toString()
      form.appendChild(input)
    }

    document.body.appendChild(form);
    form.submit()
    
    setTimeout(() => {
      document.body.removeChild(form);
    }, 1000);
  });
}