// src/lib/subscription.ts
import { supabase } from '@/integrations/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { logger } from '@/utils/logger';

// -------------------
// TypeScript Interfaces
// -------------------
export interface SubscriptionPlan {
  id: number
  name: string
  price: number
  billing_interval: 'monthly' | 'annual' | 'lifetime'
  trial_days: number
  features: string[]
  is_active: boolean
  plan_type?: 'lifetime' | 'subscription'
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
  plan_type?: 'lifetime' | 'subscription'
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
  logger.log('🔥 PAYFAST DEBUG - createPayFastPayment called with:', {
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
    logger.log('🔥 PAYFAST DEBUG - Session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userId: session?.user?.id
    });

    if (!session) throw new SubscriptionError('User not authenticated', 'AUTH_ERROR')

    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payfast-payment`
    logger.log('🔥 PAYFAST DEBUG - Edge function URL:', edgeFunctionUrl);
    logger.log('🔥 PAYFAST DEBUG - Environment VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);

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

    logger.log('🔥 PAYFAST DEBUG - Request payload:', requestPayload);

    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };

    logger.log('🔥 PAYFAST DEBUG - Request headers:', {
      'Content-Type': requestHeaders['Content-Type'],
      'Authorization': `Bearer ${session.access_token.substring(0, 20)}...` // Truncated for security
    });

    logger.log('🔥 PAYFAST DEBUG - Making fetch request...');
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestPayload)
    })

    logger.log('🔥 PAYFAST DEBUG - Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      logger.log('🔥 PAYFAST DEBUG - Response not OK, attempting to parse error...');
      
      let errorData;
      try {
        const errorText = await response.text();
        logger.log('🔥 PAYFAST DEBUG - Raw error response text:', errorText);
        
        try {
          errorData = JSON.parse(errorText);
          logger.log('🔥 PAYFAST DEBUG - Parsed error data:', errorData);
        } catch (parseError) {
          logger.log('🔥 PAYFAST DEBUG - Could not parse error as JSON:', parseError);
          errorData = { error: errorText };
        }
      } catch (textError) {
        logger.log('🔥 PAYFAST DEBUG - Could not read error response text:', textError);
        errorData = {};
      }

      throw new SubscriptionError(
        `Payment creation failed: ${errorData.error || response.statusText}`,
        'PAYMENT_CREATION_FAILED'
      )
    }

    logger.log('🔥 PAYFAST DEBUG - Parsing successful response...');
    const responseData = await response.json()
    logger.log('🔥 PAYFAST DEBUG - PayFast payment data received:', {
      hasSignature: !!responseData.signature,
      hasMerchantId: !!responseData.merchant_id,
      hasPaymentId: !!responseData.m_payment_id,
      hasAmount: !!responseData.amount,
      keysReceived: Object.keys(responseData)
    });
    
    return responseData
  } catch (err) {
    logger.log('🔥 PAYFAST DEBUG - Error in createPayFastPayment:', {
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
    // First, get the subscription with PayFast token
    const { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select(`*, plan:subscription_plans(*)`)
      .eq('id', subscriptionId)
      .single()

    if (fetchError) throw new SubscriptionError(`Failed to fetch subscription: ${fetchError.message}`, 'SUBSCRIPTION_FETCH_FAILED')
    if (!subscription) throw new SubscriptionError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND')

    const payfastToken = subscription.payfast_subscription_token
    if (!payfastToken) {
      throw new SubscriptionError('No PayFast subscription token found - cannot cancel with PayFast', 'MISSING_PAYFAST_TOKEN')
    }

    // Call our Edge Function to cancel with PayFast
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new SubscriptionError('User not authenticated', 'USER_NOT_AUTHENTICATED')

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/payfast-cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'apikey': supabase.supabaseKey,
      },
      body: JSON.stringify({
        subscriptionToken: payfastToken,
        reason: reason || 'User requested cancellation'
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new SubscriptionError(
        `PayFast cancellation failed: ${result.message || 'Unknown error'}`, 
        'PAYFAST_CANCELLATION_FAILED'
      )
    }

    // The Edge Function already updates the database, so we need to refetch the updated data
    const { data: updatedSubscription, error: refetchError } = await supabase
      .from('user_subscriptions')
      .select(`*, plan:subscription_plans(*)`)
      .eq('id', subscriptionId)
      .single()

    if (refetchError) throw new SubscriptionError(`Failed to fetch updated subscription: ${refetchError.message}`, 'REFETCH_FAILED')

    // Log the cancellation event
    await supabase.from('subscription_events').insert({
      subscription_id: subscriptionId,
      user_id: subscription.user_id,
      event_type: 'subscription_cancelled',
      event_data: { 
        reason: reason || 'User requested cancellation',
        payfast_token: payfastToken,
        cancelled_via: 'edge_function'
      }
    })

    return updatedSubscription as UserSubscription
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
  
  // Use proper UTC date handling to avoid timezone issues
  const now = new Date()
  const trialEnd = new Date(subscription.trial_end_date)
  
  // Calculate difference in milliseconds
  const diffMs = trialEnd.getTime() - now.getTime()
  
  // Convert to days and ensure we give users the full benefit
  // Use Math.floor + 1 to count the current day if trial hasn't ended
  const daysDiff = diffMs / (1000 * 60 * 60 * 24)
  
  // If trial ends today but hasn't ended yet, user should see "1 day remaining"
  // If trial ended, user should see 0
  return Math.max(0, Math.floor(daysDiff) + (daysDiff > 0 ? 1 : 0))
}

export function hasActiveSubscription(subscription: UserSubscription | null): boolean {
  if (!subscription) return false
  if (!['trial', 'active'].includes(subscription.status)) return false
  
  // Handle lifetime plans
  const planType = subscription.plan_type || subscription.plan?.plan_type
  if (planType === 'lifetime') {
    return subscription.status === 'active'
  }
  
  // Handle trial and recurring plans  
  return !isTrialExpired(subscription) &&
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
 * Simplified PayFast payment submission using values exactly as received from Edge Function
 * @param userName - User's name
 * @param userEmail - User's email address  
 * @param userId - User ID
 * @param subscriptionId - Subscription ID
 * @param planPrice - Plan price
 * @param planName - Plan name
 * @param planId - Plan ID
 */
export async function submitPayFastPayment(
  userName: string,
  userEmail: string, 
  userId: string,
  subscriptionId: string,
  planPrice: number,
  planName: string,
  planId: number
): Promise<void> {
  try {
    logger.log('🔥 PAYFAST SIMPLIFIED - Starting payment flow with:', {
      userName, userEmail, userId, subscriptionId, planPrice, planName, planId
    });

    // Call Edge Function with required user and plan details
    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payfast-payment`;
    logger.log('🔥 PAYFAST SIMPLIFIED - Edge Function URL:', edgeFunctionUrl);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new SubscriptionError('User not authenticated', 'AUTH_ERROR');
    }

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        userName,       // string
        userEmail,      // string, validated email
        userId,         // string
        subscriptionId, // string
        planPrice,      // number
        planName,       // string
        planId          // number
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('🔥 PAYFAST SIMPLIFIED - Edge Function error:', errorText);
      throw new SubscriptionError(`Edge function error: ${response.statusText}`, 'PAYMENT_CREATION_FAILED');
    }

    const paymentData = await response.json();
    logger.log('🔥 PAYFAST SIMPLIFIED - Payment data received:', paymentData);

    // Create form targeting PayFast
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = import.meta.env.VITE_PAYFAST_SANDBOX === 'true' 
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';
    form.style.display = 'none';

    logger.log('🔥 PAYFAST SIMPLIFIED - Form action URL:', form.action);

    // 🔑 CRITICAL FIX: Use PayFast field ordering (same as Edge Function)
    const PAYFAST_FIELD_ORDER = [
      'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
      'name_first', 'name_last', 'email_address', 'cell_number',
      'm_payment_id', 'amount', 'item_name', 'item_description',
      'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
      'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
      'email_confirmation', 'confirmation_address', 'payment_method',
      'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles',
      'signature' // signature field goes last
    ];

    // Add fields in PayFast order (same as Edge Function signature generation)
    const orderedFields = PAYFAST_FIELD_ORDER.filter(key => Object.prototype.hasOwnProperty.call(paymentData, key));
    
    logger.log('🔥 PAYFAST SIMPLIFIED - Field ordering:', {
      expectedOrder: PAYFAST_FIELD_ORDER.slice(0, 10), // First 10 fields
      actualFields: orderedFields,
      allPaymentDataKeys: Object.keys(paymentData).sort()
    });

    orderedFields.forEach(key => {
      const value = paymentData[key];
      if (value !== null && value !== undefined) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value.toString();  // Use as-is — do NOT decode or encode!
        form.appendChild(input);
        
        logger.log(`🔥 FIELD ORDER: ${key} = "${value}"`);
      }
    });

    document.body.appendChild(form);

    // Debug: log the data just before submission in exact submission order
    const formDataLog: Record<string, string> = {};
    const formElements = Array.from(form.elements as HTMLCollectionOf<HTMLInputElement>);
    formElements.forEach(el => {
      formDataLog[el.name] = el.value;
    });
    
    logger.log('🔍 PAYFAST SIMPLIFIED - Form data before submission (in submission order):');
    formElements.forEach(el => {
      logger.log(`  ${el.name}: "${el.value}"`);
    });
    
    logger.log('🔍 PAYFAST SIMPLIFIED - Form data summary:', formDataLog);
    logger.log('🔍 PAYFAST SIMPLIFIED - Signature:', formDataLog.signature);
    logger.log('🔍 PAYFAST SIMPLIFIED - Field order matches PayFast requirements: ✅');
    
    // 🔍 CRITICAL DEBUG: What will browser actually send to PayFast?
    const simulatedFormData = new FormData(form);
    const browserWillSend: Record<string, string> = {};
    for (const [key, value] of simulatedFormData.entries()) {
      browserWillSend[key] = value.toString();
    }
    
    logger.log('🔍 BROWSER SIMULATION - What browser will actually send to PayFast:');
    Object.entries(browserWillSend).forEach(([key, value]) => {
      logger.log(`  ${key}: "${value}"`);
    });
    
    // 🔍 Compare Edge Function raw vs what browser sends
    logger.log('🔍 COMPARISON - Edge Function vs Browser submission:');
    Object.keys(formDataLog).forEach(key => {
      if (key !== 'signature') {
        const edgeValue = formDataLog[key];
        const browserValue = browserWillSend[key];
        const matches = edgeValue === browserValue;
        logger.log(`  ${key}: Edge="${edgeValue}" | Browser="${browserValue}" | Match=${matches ? '✅' : '❌'}`);
      }
    });

    // 🔍 MANUAL SIGNATURE VERIFICATION - Calculate what PayFast should receive
    const PAYFAST_FIELD_ORDER_FOR_SIGNATURE = [
      'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
      'name_first', 'name_last', 'email_address', 'cell_number',
      'm_payment_id', 'amount', 'item_name', 'item_description',
      'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
      'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
      'email_confirmation', 'confirmation_address', 'payment_method',
      'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles'
      // NOTE: signature field is NOT included in signature calculation
    ];
    
    // Build the signature string that PayFast will calculate from browser submission
    const payFastWillCalculate = PAYFAST_FIELD_ORDER_FOR_SIGNATURE
      .filter(key => browserWillSend[key])
      .map(key => {
        const value = browserWillSend[key];
        // PayFast uses PHP urlencode equivalent
        const encoded = encodeURIComponent(value)
          .replace(/%20/g, '+')
          .replace(/!/g, '%21')
          .replace(/'/g, '%27')
          .replace(/\(/g, '%28')
          .replace(/\)/g, '%29')
          .replace(/\*/g, '%2A')
          .replace(/~/g, '%7E');
        return `${key}=${encoded}`;
      })
      .join('&');
    
    logger.log('🔍 SIGNATURE VERIFICATION - PayFast will calculate signature from:', payFastWillCalculate);
    logger.log('🔍 SIGNATURE VERIFICATION - Edge Function calculated signature:', formDataLog.signature);
    logger.log('🔍 SIGNATURE VERIFICATION - PayFast signature string length:', payFastWillCalculate.length);

    // 🔍 COMPREHENSIVE DEBUG SUMMARY - SECURITY FIX: Use logger instead of console
    logger.log('🔍 PAYFAST DEBUG SUMMARY - Debug data saved to localStorage');
    logger.log('📋 EDGE FUNCTION DATA:', formDataLog);
    logger.log('📋 BROWSER WILL SEND:', browserWillSend);
    
    // Field comparison using logger
    const fieldComparisons: Record<string, { matches: boolean; edge?: string; browser?: string }> = {};
    Object.keys(formDataLog).forEach(key => {
      if (key !== 'signature') {
        const edgeValue = formDataLog[key];
        const browserValue = browserWillSend[key];
        const matches = edgeValue === browserValue;
        fieldComparisons[key] = { matches };
        if (!matches) {
          fieldComparisons[key] = { matches, edge: edgeValue, browser: browserValue };
          logger.warn(`PayFast field mismatch for ${key}:`, { edge: edgeValue, browser: browserValue });
        }
      }
    });
    
    logger.log('📋 FIELD COMPARISONS:', fieldComparisons);
    logger.log('📋 SIGNATURE VERIFICATION:', {
      edgeSignature: formDataLog.signature,
      signatureStringPreview: payFastWillCalculate.substring(0, 100) + '...',
      signatureStringLength: payFastWillCalculate.length
    });
    
    logger.log('🚨 SUBMITTING TO PAYFAST IN 10 SECONDS - Debug data available in localStorage');

    // 💾 SAVE DEBUG DATA TO LOCALSTORAGE FOR LATER ACCESS
    const debugData = {
      timestamp: new Date().toISOString(),
      edgeFunctionData: formDataLog,
      browserWillSend: browserWillSend,
      payFastSignatureString: payFastWillCalculate,
      edgeSignature: formDataLog.signature,
      fieldComparisons: {}
    };

    // Add field comparisons
    Object.keys(formDataLog).forEach(key => {
      if (key !== 'signature') {
        const edgeValue = formDataLog[key];
        const browserValue = browserWillSend[key];
        debugData.fieldComparisons[key] = {
          edge: edgeValue,
          browser: browserValue,
          matches: edgeValue === browserValue
        };
      }
    });

    localStorage.setItem('payfast_debug', JSON.stringify(debugData, null, 2));
    console.log('💾 Debug data saved to localStorage');

    // 🔧 SUBMISSION TIMING CONTROL
    const isDebugMode = import.meta.env.DEV; // Use development mode for debug timing
    const submissionDelay = isDebugMode ? 10000 : 100; // 10s debug / 0.1s production
    
    setTimeout(() => {
      logger.log('🚀 PAYFAST SIMPLIFIED - Submitting form to PayFast NOW...');
      try {
        form.submit();
      } catch (submitError) {
        logger.error('🚨 Form submission error:', submitError);
        throw new SubscriptionError(`Form submission failed: ${submitError}`, 'PAYMENT_SUBMISSION_FAILED');
      }
      
      // Clean up form AFTER submission
      setTimeout(() => {
        if (document.body.contains(form)) {
          document.body.removeChild(form);
          logger.log('🔥 PAYFAST SIMPLIFIED - Form cleaned up after submission');
        }
      }, 2000); // Clean up 2 seconds after submission
    }, submissionDelay);

  } catch (error) {
    logger.error('🚨 PAYFAST SIMPLIFIED - Payment submission failed:', error);
    if (error instanceof SubscriptionError) throw error;
    throw new SubscriptionError(`Failed to submit PayFast payment: ${error}`, 'PAYMENT_SUBMISSION_FAILED');
  }
}