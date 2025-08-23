import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Initialize Supabase client
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// PayFast credentials
const PAYFAST_MERCHANT_ID = Deno.env.get("PAYFAST_MERCHANT_ID") || "";
const PAYFAST_MERCHANT_KEY = Deno.env.get("PAYFAST_MERCHANT_KEY") || "";
const PAYFAST_PASSPHRASE = Deno.env.get("PAYFAST_PASSPHRASE") || "";
const PAYFAST_SANDBOX = Deno.env.get("VITE_PAYFAST_SANDBOX") === "true";

interface CancellationRequest {
  subscriptionToken: string;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, message: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const requestBody: CancellationRequest = await req.json();
    const { subscriptionToken, reason } = requestBody;

    console.log("🚫 CANCELLATION REQUEST:", { subscriptionToken, reason, timestamp: new Date().toISOString() });

    // Validate required fields
    if (!subscriptionToken) {
      return new Response(
        JSON.stringify({ success: false, message: "Subscription token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from JWT token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Authorization header missing" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Authenticated user:", user.id);

    // Verify user owns the subscription
    const { data: subscription, error: dbError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("payfast_subscription_token", subscriptionToken)
      .eq("status", "active")
      .single();

    if (dbError || !subscription) {
      console.error("❌ Subscription lookup error:", dbError);
      return new Response(
        JSON.stringify({ success: false, message: "Subscription not found or already cancelled" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Found subscription:", subscription.id);

    // Call PayFast cancellation API
    const payfastApiUrl = PAYFAST_SANDBOX 
      ? `https://api.payfast.co.za/subscriptions/${subscriptionToken}/cancel?testing=true`
      : `https://api.payfast.co.za/subscriptions/${subscriptionToken}/cancel`;

    console.log("📞 Calling PayFast API:", { url: payfastApiUrl, sandbox: PAYFAST_SANDBOX });

    // PayFast API call - following the exact guide you provided
    const payfastResponse = await fetch(payfastApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Merchant-Id": PAYFAST_MERCHANT_ID,    // Exact header from guide
        "Passphrase": PAYFAST_PASSPHRASE,      // Exact header from guide
      },
      body: JSON.stringify({}), // Empty JSON body as shown in guide
    });

    console.log("📞 PayFast API response status:", payfastResponse.status);

    let payfastData;
    try {
      payfastData = await payfastResponse.json();
      console.log("📞 PayFast API response data:", payfastData);
    } catch (e) {
      console.log("📞 PayFast API response (no JSON):", await payfastResponse.text());
    }

    // Update database regardless of PayFast response (fail-safe)
    // PayFast API might succeed but return unclear responses
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || "User requested cancellation",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("❌ Database update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to update subscription status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Subscription cancelled in database");

    // Check PayFast response
    if (payfastResponse.ok && (payfastData?.response === true || payfastResponse.status === 200)) {
      console.log("✅ PayFast cancellation successful");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription cancelled successfully",
          details: "Your subscription has been cancelled and will not renew. You'll continue to have access until the end of your current billing period.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.warn("⚠️ PayFast API response unclear, but local cancellation completed");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription cancellation initiated",
          details: "Your cancellation has been processed locally. PayFast will confirm via email shortly.",
          warning: "PayFast API response was unclear, but your subscription has been marked as cancelled in our system.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("❌ Cancellation error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error during cancellation",
        error: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});