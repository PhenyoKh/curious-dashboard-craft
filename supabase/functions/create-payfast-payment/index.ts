// supabase/functions/create-payfast-payment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Working MD5 implementation (same as client-side test)
function md5(inputString: string): string {
  const hc = "0123456789abcdef";
  function rh(n: number): string {
    let j, s = "";
    for (j = 0; j <= 3; j++) s += hc.charAt((n >> (j * 8 + 4)) & 0x0F) + hc.charAt((n >> (j * 8)) & 0x0F);
    return s;
  }
  function ad(x: number, y: number): number {
    const l = (x & 0xFFFF) + (y & 0xFFFF);
    const m = (x >> 16) + (y >> 16) + (l >> 16);
    return (m << 16) | (l & 0xFFFF);
  }
  function rl(n: number, c: number): number { return (n << c) | (n >>> (32 - c)); }
  function cm(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return ad(rl(ad(ad(a, q), ad(x, t)), s), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cm((b & c) | ((~b) & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cm((b & d) | (c & (~d)), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cm(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cm(c ^ (b | (~d)), a, b, x, s, t);
  }
  function sb(x: string): number[] {
    const nblk = ((x.length + 8) >> 6) + 1;
    const blks = new Array(nblk * 16);
    for (let i = 0; i < nblk * 16; i++) blks[i] = 0;
    for (let i = 0; i < x.length; i++) blks[i >> 2] |= x.charCodeAt(i) << ((i % 4) * 8);
    blks[x.length >> 2] |= 0x80 << ((x.length % 4) * 8);
    blks[nblk * 16 - 2] = x.length * 8;
    return blks;
  }
  
  const x = sb(inputString);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  
  for (let i = 0; i < x.length; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;
    
    a = ff(a, b, c, d, x[i + 0], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    
    a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    
    a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i + 0], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
    
    a = ii(a, b, c, d, x[i + 0], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
    
    a = ad(a, olda); b = ad(b, oldb); c = ad(c, oldc); d = ad(d, oldd);
  }
  return rh(a) + rh(b) + rh(c) + rh(d);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('🔥 CORS DEBUG - OPTIONS preflight request received');
    console.log('🔥 CORS DEBUG - Returning headers:', corsHeaders);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const PAYFAST_CONFIG = {
      merchant_id: Deno.env.get('PAYFAST_MERCHANT_ID') || Deno.env.get('PAYFAST_MERCHANT_ID_TEST'),
      merchant_key: Deno.env.get('PAYFAST_MERCHANT_KEY') || Deno.env.get('PAYFAST_MERCHANT_KEY_TEST'),
      passphrase: Deno.env.get('PAYFAST_PASSPHRASE') || Deno.env.get('PAYFAST_PASSPHRASE_TEST') || ''
    };

    // Debug logging for environment variables
    console.log('🔥 PAYFAST EDGE DEBUG - Environment variables status:', {
      merchant_id: PAYFAST_CONFIG.merchant_id ? `${PAYFAST_CONFIG.merchant_id} (length: ${PAYFAST_CONFIG.merchant_id.length})` : 'NOT SET',
      merchant_key: PAYFAST_CONFIG.merchant_key ? `${PAYFAST_CONFIG.merchant_key.substring(0, 5)}... (length: ${PAYFAST_CONFIG.merchant_key.length})` : 'NOT SET',
      passphrase: PAYFAST_CONFIG.passphrase ? `${PAYFAST_CONFIG.passphrase.substring(0, 5)}... (length: ${PAYFAST_CONFIG.passphrase.length})` : 'NOT SET'
    });

    if (!PAYFAST_CONFIG.merchant_id || !PAYFAST_CONFIG.merchant_key) {
      console.error('🔥 PAYFAST EDGE DEBUG - Missing required PayFast credentials!');
      return new Response(JSON.stringify({
        error: 'PayFast credentials not configured. Please set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY environment variables.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const paymentId = `PF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseUrl = Deno.env.get('BASE_URL') || 'https://www.scola.co.za';
    
    // Debug BASE_URL environment variable
    console.log('🔥 BASE_URL DEBUG:', {
      baseUrl,
      envValue: Deno.env.get('BASE_URL'),
      usingFallback: !Deno.env.get('BASE_URL')
    });

    const paymentData = {
      merchant_id: PAYFAST_CONFIG.merchant_id,
      merchant_key: PAYFAST_CONFIG.merchant_key,
      return_url: `${baseUrl}/payment/success?subscription_id=${body.subscriptionId}`,
      cancel_url: `${baseUrl}/payment/cancelled?subscription_id=${body.subscriptionId}`,
      notify_url: 'https://fprsjziqubbhznavjskj.supabase.co/functions/v1/payfast-webhook',
      name_first: body.userName.split(' ')[0] || 'Customer',
      email_address: body.userEmail,
      m_payment_id: paymentId,
      amount: Number(body.planPrice).toFixed(2),
      item_name: body.planName,
      item_description: body.planName,
      custom_str1: body.userId,
      custom_str2: body.subscriptionId,
      custom_str3: body.planId.toString()
    };

    // Generate signature using same method as webhook validation
    // INCLUDE merchant_key in signature generation (PayFast 2025 requirement - documentation is outdated)
    const { signature: _, ...signatureParams } = paymentData;
    
    // PayFast-specific field order (not alphabetical!)
    const PAYFAST_FIELD_ORDER = [
      'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
      'name_first', 'name_last', 'email_address', 'cell_number',
      'm_payment_id', 'amount', 'item_name', 'item_description',
      'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
      'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
      'email_confirmation', 'confirmation_address', 'payment_method',
      'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles'
    ];

    // Filter out empty/blank fields and sort by PayFast order
    const filteredParams = {};
    Object.keys(signatureParams).forEach(key => {
      const value = signatureParams[key];
      if (value !== null && value !== undefined && value.toString().trim() !== '') {
        filteredParams[key] = value.toString().trim();
      }
    });

    // Sort fields according to PayFast's specific order
    const orderedKeys = PAYFAST_FIELD_ORDER.filter(key => filteredParams.hasOwnProperty(key));
    
    // Complete PHP urlencode() equivalent for PayFast compatibility
    function phpUrlencode(str: string): string {
      // PHP urlencode differs from JavaScript encodeURIComponent in several ways:
      // 1. Spaces: %20 → +
      // 2. Special chars: ! → %21, ' → %27, ( → %28, ) → %29, * → %2A, ~ → %7E
      let encoded = encodeURIComponent(str);
      
      return encoded
        .replace(/%20/g, '+')           // Spaces: %20 → +
        .replace(/!/g, '%21')           // ! → %21
        .replace(/'/g, '%27')           // ' → %27  
        .replace(/\(/g, '%28')          // ( → %28
        .replace(/\)/g, '%29')          // ) → %29
        .replace(/\*/g, '%2A')          // * → %2A
        .replace(/~/g, '%7E');          // ~ → %7E
    }

    // Build signature string with PHP urlencode equivalent
    const signatureString = orderedKeys
      .map(key => `${key}=${phpUrlencode(filteredParams[key])}`)
      .join('&');

    // APPEND passphrase at the end (PayFast requirement - not included in sorted params)
    const signatureWithPassphrase = PAYFAST_CONFIG.passphrase 
      ? `${signatureString}&passphrase=${PAYFAST_CONFIG.passphrase}`
      : signatureString;

    // Debug signature generation with FULL string logging
    console.log('🔥 PAYFAST EDGE DEBUG - Signature generation:', {
      paymentDataKeys: Object.keys(paymentData).sort(),
      signatureParamsKeys: Object.keys(signatureParams).sort(),
      merchantKeyExcluded: !Object.keys(signatureParams).includes('merchant_key'),
      hasPassphrase: !!PAYFAST_CONFIG.passphrase
    });

    // CRITICAL: Log the FULL signature strings for debugging
    console.log('🔥 SIGNATURE STRING DEBUG:');
    console.log('PayFast-compatible signature string:', signatureWithPassphrase);
    console.log('String length:', signatureWithPassphrase.length);
    console.log('String bytes:', Array.from(signatureWithPassphrase).map(c => c.charCodeAt(0)));
    
    // Log each parameter individually with complete PHP urlencode for comparison
    console.log('🔥 PARAMETER DEBUG (Complete PHP urlencode-compatible encoding):');
    orderedKeys.forEach(key => {
      const value = filteredParams[key];
      const jsEncoded = encodeURIComponent(value);
      const phpEncoded = phpUrlencode(value);
      const hasSpecialChars = /[!'()*~]/.test(value);
      
      console.log(`${key}: "${value}"`);
      console.log(`  JavaScript encodeURIComponent: "${jsEncoded}"`);
      console.log(`  PHP urlencode equivalent: "${phpEncoded}"`);
      console.log(`  Contains special chars (!,',),(,),*,~): ${hasSpecialChars}`);
      console.log(`  Encoding differs: ${jsEncoded !== phpEncoded}`);
      console.log('  ---');
    });

    // Generate MD5 hash using same implementation as working client-side test
    const signature = md5(signatureWithPassphrase);

    console.log('🔥 PAYFAST EDGE DEBUG - Generated signature:', signature);

    // UPDATED: Include merchant_key in client response (PayFast requires it in form submission)
    console.log('🔥 PAYFAST EDGE DEBUG - Client data keys (merchant_key included):', Object.keys(paymentData).sort());

    return new Response(JSON.stringify({
      ...paymentData,
      signature
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    console.error('PayFast payment creation error:', err);
    return new Response(JSON.stringify({
      error: 'Failed to generate PayFast payment'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});