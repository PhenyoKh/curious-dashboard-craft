// supabase/functions/payfast-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = String(value);
    });

    console.log("🔥 ITN Data Received:", data);

    const subscriptionId = data["custom_str2"];
    const userId = data["custom_str1"];
    const paymentId = data["m_payment_id"];
    const pfPaymentId = data["pf_payment_id"];
    const paymentStatus = data["payment_status"]; // "COMPLETE" expected

    if (paymentStatus !== "COMPLETE") {
      console.warn("⚠️ Payment not marked COMPLETE:", paymentStatus);
      return new Response("ignored", { headers: corsHeaders });
    }

    // ✅ Look up the plan_id to see if it's lifetime
    const { data: subRecord, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, plan_id, plan_type")
      .eq("id", subscriptionId)
      .single();

    if (subError || !subRecord) {
      console.error("❌ Subscription not found:", subscriptionId, subError);
      return new Response("subscription not found", { status: 400, headers: corsHeaders });
    }

    // If plan_type not in user_subscriptions yet, check subscription_plans table
    let planType = subRecord.plan_type;
    if (!planType || planType === "subscription") {
      const { data: planRecord, error: planError } = await supabase
        .from("subscription_plans")
        .select("plan_type")
        .eq("id", subRecord.plan_id)
        .single();

      if (planError) {
        console.error("⚠️ Plan lookup failed:", planError);
      } else {
        planType = planRecord.plan_type;
      }
    }

    // NEW: Lifetime logic
    let updateFields: any = {
      status: "active",
      updated_at: new Date().toISOString()
    };

    if (planType === "lifetime") {
      console.log("✅ Lifetime plan detected — granting permanent access");
      updateFields = {
        ...updateFields,
        plan_type: "lifetime",
        current_period_start: new Date().toISOString(),
        current_period_end: null // 🔑 null = no expiry
      };
    } else {
      console.log("➡ Subscription plan detected — applying 30-day expiry");
      updateFields = {
        ...updateFields,
        plan_type: "subscription",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    // Update subscription record
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update(updateFields)
      .eq("id", subscriptionId);

    if (updateError) {
      console.error("❌ Error updating subscription:", updateError);
      return new Response("failed", { status: 500, headers: corsHeaders });
    }

    // Log successful payment
    await supabase.from("payment_transactions").insert({
      user_id: userId,
      subscription_id: subscriptionId,
      payfast_payment_id: paymentId,
      payfast_transaction_id: pfPaymentId,
      amount: data["amount_gross"] || data["amount"],
      status: "complete",
      payfast_itn_data: data,
      processed_at: new Date().toISOString()
    });

    // Log an event
    await supabase.from("subscription_events").insert({
      subscription_id: subscriptionId,
      user_id: userId,
      event_type: "payment_succeeded",
      event_data: data
    });

    console.log("🎉 Subscription successfully activated");

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error("🚨 Webhook processing error:", err);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});