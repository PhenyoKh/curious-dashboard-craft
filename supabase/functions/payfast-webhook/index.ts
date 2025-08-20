// PayFast ITN Webhook Handler
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// PayFast server IPs for validation
const PAYFAST_IPS = [
  '197.97.145.144',
  '41.74.179.194', 
  '197.97.145.145',
  '41.74.179.195'
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('PayFast webhook received:', req.method);

  try {
    // Only accept POST requests from PayFast
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Get the client IP (for production, you'd want to validate this)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    console.log('Request from IP:', clientIP);

    // Parse form data from PayFast ITN
    const formData = await req.formData();
    const itnData: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      itnData[key] = value.toString();
    }

    console.log('ITN Data received:', itnData);

    // Validate PayFast signature
    const isValidSignature = await validatePayFastSignature(itnData);
    if (!isValidSignature) {
      console.error('Invalid PayFast signature');
      return new Response('Invalid signature', { status: 400, headers: corsHeaders });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process the ITN based on payment status
    await processPayFastITN(supabase, itnData);

    // Return 200 OK to acknowledge receipt
    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

async function validatePayFastSignature(data: Record<string, string>): Promise<boolean> {
  try {
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') ?? '';
    
    // Build parameter string (excluding signature)
    const { signature, ...params } = data;
    
    // Sort parameters and build query string
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    // Add passphrase if provided
    const stringToHash = passphrase 
      ? `${sortedParams}&passphrase=${passphrase}`
      : sortedParams;
    
    // Generate MD5 hash
    const encoder = new TextEncoder();
    const data_encoded = encoder.encode(stringToHash);
    const hash = await crypto.subtle.digest('MD5', data_encoded);
    const hashArray = Array.from(new Uint8Array(hash));
    const generatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('Generated signature:', generatedSignature);
    console.log('Received signature:', signature);
    
    return generatedSignature === signature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

async function processPayFastITN(supabase: any, itnData: Record<string, string>) {
  const {
    m_payment_id,
    pf_payment_id,
    payment_status,
    item_name,
    amount_gross,
    amount_fee,
    amount_net,
    custom_str1,
    custom_str2,
    subscription_type,
    billing_date
  } = itnData;

  console.log('Processing ITN for payment:', m_payment_id, 'Status:', payment_status);

  try {
    // First, log the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .upsert({
        payfast_payment_id: m_payment_id,
        payfast_transaction_id: pf_payment_id,
        user_id: custom_str1,
        subscription_id: custom_str2,
        amount: parseFloat(amount_gross),
        status: mapPayFastStatus(payment_status),
        payment_method: itnData.payment_method || 'unknown',
        payfast_itn_data: itnData,
        processed_at: new Date().toISOString()
      }, {
        onConflict: 'payfast_payment_id'
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction logging error:', transactionError);
      throw transactionError;
    }

    console.log('Transaction logged:', transaction.id);

    // Process based on payment status
    switch (payment_status) {
      case 'COMPLETE':
        await handleSuccessfulPayment(supabase, itnData, transaction);
        break;
      case 'FAILED':
      case 'CANCELLED':
        await handleFailedPayment(supabase, itnData, transaction);
        break;
      default:
        console.log('Unhandled payment status:', payment_status);
    }

  } catch (error) {
    console.error('ITN processing error:', error);
    throw error;
  }
}

async function handleSuccessfulPayment(supabase: any, itnData: Record<string, string>, transaction: any) {
  const { custom_str1: user_id, custom_str2: subscription_id } = itnData;

  console.log('Handling successful payment for subscription:', subscription_id);

  try {
    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found:', subscription_id);
      return;
    }

    // Calculate new period dates
    const now = new Date();
    let periodStart = now;
    let periodEnd = new Date();

    if (subscription.plan.billing_interval === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (subscription.plan.billing_interval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        payfast_subscription_token: itnData.token || null,
        payfast_subscription_id: itnData.subscription_id || null
      })
      .eq('id', subscription_id);

    if (updateError) {
      console.error('Subscription update error:', updateError);
      throw updateError;
    }

    // Log the event
    await supabase.from('subscription_events').insert({
      subscription_id,
      user_id,
      event_type: 'payment_succeeded',
      event_data: {
        amount: parseFloat(itnData.amount_gross),
        payment_id: itnData.m_payment_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString()
      }
    });

    console.log('Subscription activated successfully');
    // Here you would trigger email notifications via Loops
    // await sendSuccessEmailViaLoops(user_id, subscription)

  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

async function handleFailedPayment(supabase: any, itnData: Record<string, string>, transaction: any) {
  const { custom_str1: user_id, custom_str2: subscription_id } = itnData;

  console.log('Handling failed payment for subscription:', subscription_id);

  try {
    // Update subscription to past_due if it was active
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due'
      })
      .eq('id', subscription_id)
      .eq('status', 'active');

    if (updateError) {
      console.error('Subscription update error:', updateError);
    }

    // Log the event
    await supabase.from('subscription_events').insert({
      subscription_id,
      user_id,
      event_type: 'payment_failed',
      event_data: {
        amount: parseFloat(itnData.amount_gross),
        payment_id: itnData.m_payment_id,
        failure_reason: itnData.payment_status
      }
    });

    console.log('Failed payment logged');
    // Here you would trigger failure email notifications via Loops
    // await sendFailureEmailViaLoops(user_id, subscription)

  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

function mapPayFastStatus(payfastStatus: string): string {
  switch (payfastStatus) {
    case 'COMPLETE':
      return 'complete';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}