<?php
/**
 * PayFast Signature Verification Script
 * 
 * Use this script to manually verify that your Edge Function signature generation
 * matches PHP's behavior exactly.
 * 
 * Instructions:
 * 1. Replace $signatureString with the exact [FINAL] signature string from your Edge Function logs
 * 2. Run: php verify_payfast_signature.php
 * 3. Compare the MD5 output with your Edge Function signature
 */

// REPLACE THIS with your exact signature string from Edge Function logs
// Latest from logs: 839157a2d343cdb257d9690e73345965
$signatureString = "merchant_id=14995632&merchant_key=zpyqhpgclh6wb&return_url=https%3A%2F%2Fwww.scola.co.za%2Fpayment%2Fsuccess%3Fsubscription_id%3Db623470d-ae9e-4776-a24e-fc2e7e767042&cancel_url=https%3A%2F%2Fwww.scola.co.za%2Fpayment%2Fcancelled%3Fsubscription_id%3Db623470d-ae9e-4776-a24e-fc2e7e767042&notify_url=https%3A%2F%2Ffprsjziqubbhznavjskj.supabase.co%2Ffunctions%2Fv1%2Fpayfast-webhook&name_first=Phenyo&email_address=wisdom.knowlwdge%2B22augworks%40gmail.com&m_payment_id=PF_1755850869146_vh6uhgd53&amount=99.00&item_name=Pro+Plan+-+Lifetime+Access&item_description=Pro+Plan+-+Lifetime+Access&custom_str1=e1d03f00-5573-420c-ae05-f29230d5a2d8&custom_str2=b623470d-ae9e-4776-a24e-fc2e7e767042&custom_str3=1";

echo "=== PayFast Signature Verification ===\n\n";

echo "Edge Function Signature String:\n" . $signatureString . "\n\n";

// Calculate MD5 hash exactly like PayFast would
$calculatedMd5 = md5($signatureString);
echo "PHP MD5 Hash: " . $calculatedMd5 . "\n";
echo "Expected from Edge Function: 839157a2d343cdb257d9690e73345965\n\n";

// Test if they match
if ($calculatedMd5 === "839157a2d343cdb257d9690e73345965") {
    echo "✅ SUCCESS: Signatures match perfectly!\n";
} else {
    echo "❌ MISMATCH: PHP signature differs from Edge Function\n";
}

echo "\n=== Advanced Debugging ===\n\n";

// Parse the string to see individual components
parse_str($signatureString, $params);

echo "Parsed Parameters:\n";
foreach ($params as $key => $value) {
    echo "  $key = '$value'\n";
}
echo "\n";

// Test what happens if we rebuild using PHP urlencode
echo "Testing PHP urlencode rebuilding:\n";
$phpRebuilt = [];
foreach ($params as $key => $value) {
    $phpRebuilt[] = $key . '=' . urlencode($value);
}
$phpString = implode('&', $phpRebuilt);

echo "PHP rebuilt string:\n" . $phpString . "\n";
echo "PHP rebuilt MD5: " . md5($phpString) . "\n\n";

// Compare individual field encodings
echo "Field Encoding Analysis:\n";
foreach ($params as $key => $value) {
    $original = $value;
    $phpEncoded = urlencode($original);
    
    echo "$key:\n";
    echo "  Current: '$original'\n";
    echo "  PHP urlencode: '$phpEncoded'\n";
    
    if ($original !== $phpEncoded) {
        echo "  ⚠️  Encoding difference detected!\n";
    }
    echo "\n";
}

echo "=== Next Steps ===\n";
echo "1. Compare the PHP MD5 hash with your Edge Function signature\n";
echo "2. If they match, your Edge Function is correct\n";
echo "3. If they don't match, check for encoding differences\n";
echo "4. Test the client-side decoding fix to resolve double encoding\n";
?>