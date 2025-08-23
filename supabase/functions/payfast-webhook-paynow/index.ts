import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Initialize Supabase client with your Env variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Complete MD5 implementation compatible with PHP's md5()
function md5(inputString: string): string {
  const hc = "0123456789abcdef";
  function rh(n: number): string {
    let s = "";
    for (let j = 0; j <= 3; j++) {
      s +=
        hc.charAt((n >> (j * 8 + 4)) & 0x0f) +
        hc.charAt((n >> (j * 8)) & 0x0f);
    }
    return s;
  }
  function ad(x: number, y: number): number {
    const l = (x & 0xffff) + (y & 0xffff);
    const m = (x >> 16) + (y >> 16) + (l >> 16);
    return (m << 16) | (l & 0xffff);
  }
  function rl(n: number, c: number): number {
    return (n << c) | (n >>> (32 - c));
  }
  function cm(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return ad(rl(ad(ad(a, q), ad(x, t)), s), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cm((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cm((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cm(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cm(c ^ (b | ~d), a, b, x, s, t);
  }
  function sb(x: string): number[] {
    const nblk = ((x.length + 8) >> 6) + 1;
    const blks = new Array(nblk * 16).fill(0);
    for (let i = 0; i < x.length; i++) {
      blks[i >> 2] |= x.charCodeAt(i) << ((i % 4) * 8);
    }
    blks[nblk * 16 - 2] = x.length * 8;
    blks[x.length >> 2] |= 0x80 << ((x.length % 4) * 8);
    return blks;
  }
  const x = sb(inputString);
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const olda = a,
      oldb = b,
      oldc = c,
      oldd = d;
    a = ff(a, b, c, d, x[i + 0], 7, -680876936);
    d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063);
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5], 4, -378558);
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = hh(d, a, b, c, x[i + 0], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = ii(a, b, c, d, x[i + 0], 6, -198630844);
    d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = ad(a, olda);
    b = ad(b, oldb);
    c = ad(c, oldc);
    d = ad(d, oldd);
  }
  return rh(a) + rh(b) + rh(c) + rh(d);
}

function phpUrlencode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/~/g, "%7E");
}

function verifySignature(ipnParams: Record<string, string>, passphrase: string): boolean {
  const params = { ...ipnParams };
  delete params["signature"]; // exclude signature itself

  const keys = Object.keys(params).sort();

  const queryString = keys
    .filter((key) => params[key] && params[key].trim() !== "")
    .map((key) => `${key}=${phpUrlencode(params[key])}`)
    .join("&");

  const signatureBase = passphrase ? `${queryString}&passphrase=${phpUrlencode(passphrase)}` : queryString;

  const calculatedSignature = md5(signatureBase);

  return calculatedSignature.toLowerCase() === (ipnParams["signature"] || "").toLowerCase();
}

serve(async (req) => {
  const corsHeadersResponse = {
    ...corsHeaders,
    "Content-Type": "text/plain",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const ipnData: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        ipnData[key] = value;
      }
    }
    console.log("🔔 PayFast IPN received:", ipnData);

    // Verify merchant ID
    const yourMerchantId = Deno.env.get("PAYFAST_MERCHANT_ID") || "";
    if (ipnData["merchant_id"] !== yourMerchantId) {
      console.warn("⚠️ Invalid merchant_id in IPN");
      return new Response("Invalid merchant", { status: 400, headers: corsHeaders });
    }

    // Verify signature for authenticity
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    if (!verifySignature(ipnData, passphrase)) {
      console.warn("⚠️ IPN signature verification failed");
      return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    }

    // Only process completed payments
    if (ipnData["payment_status"] !== "COMPLETE") {
      console.warn("⚠️ Payment status not COMPLETE, ignoring");
      return new Response("Payment not complete", { status: 200, headers: corsHeaders });
    }

    // 🔑 ADAPTED FOR LIFETIME ACCESS: Get user ID or email for tracking
    const userIdOrEmail = ipnData["custom_str1"];
    const purchaseType = ipnData["custom_str2"]; // "user_purchase" or "anonymous_purchase"
    
    if (!userIdOrEmail) {
      console.warn("⚠️ Missing user ID or email in IPN");
      return new Response("Missing user identifier", { status: 400, headers: corsHeaders });
    }

    // Parse amount paid
    const amountPaid = parseFloat(ipnData["amount_gross"] || "0");

    // 🔑 ADAPTED FOR LIFETIME ACCESS: Handle both user ID and email-based payments
    if (purchaseType === "user_purchase") {
      // Authenticated user - update by user ID
      const { error } = await supabase
        .from("user_profiles")
        .update({
          has_lifetime_access: true,
          payment_reference: ipnData["pf_payment_id"] || null,
          paid_at: new Date().toISOString(),
        })
        .eq("id", userIdOrEmail);

      if (error) {
        console.error("❌ Database update failed for authenticated user:", error);
        return new Response("DB update error", { status: 500, headers: corsHeaders });
      }

      console.log(`✅ User ${userIdOrEmail} granted lifetime access for R${amountPaid}`);
    } else {
      // Anonymous purchase - store in separate table for later account linking
      const { error } = await supabase
        .from("anonymous_purchases")
        .insert({
          email: userIdOrEmail,
          payment_reference: ipnData["pf_payment_id"] || null,
          amount_paid: amountPaid,
          purchase_type: "lifetime_access",
          paid_at: new Date().toISOString(),
          payfast_data: JSON.stringify(ipnData)
        });

      if (error) {
        console.error("❌ Anonymous purchase storage failed:", error);
        return new Response("Anonymous purchase storage error", { status: 500, headers: corsHeaders });
      }

      console.log(`✅ Anonymous purchase stored for ${userIdOrEmail} - R${amountPaid}`);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("IPN handler error:", err);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
});