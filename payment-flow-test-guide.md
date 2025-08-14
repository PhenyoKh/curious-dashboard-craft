# 🧪 Complete Payment Flow Testing Guide

## **Current Server Status**
✅ Development Server: http://localhost:8084  
✅ PayFast Integration: Configured (sandbox mode)  
✅ Database: All subscription tables ready  

## **🔍 Step-by-Step Testing Process**

### **Phase 1: User Authentication & Trial Creation**

1. **Open Browser** (incognito mode recommended)
   - Navigate to: http://localhost:8084/pricing
   - Expected: See pricing page with Monthly (R70) and Annual (R672) plans

2. **Test Unauthenticated Flow** (What you experienced)
   - Click "Get Started" on Pro plan
   - Expected: "Please sign in to subscribe" toast + redirect to /auth
   - ✅ **This is correct behavior** - authentication required first

3. **Complete Sign Up Process**
   - Click "Sign Up" on auth page
   - Enter: Email, password, confirm password
   - Expected: Account creation + automatic trial start
   - Look for: "Welcome! Your 7-day free trial has started." toast

4. **Verify Trial Creation**
   - After signup, check dashboard for trial banner
   - Expected: Blue trial banner showing "X days left"
   - Location: Top of dashboard page

### **Phase 2: Payment Flow Testing**

5. **Test Authenticated Payment Flow**
   - Go back to: http://localhost:8084/pricing  
   - Click "Get Started" on Pro plan
   - Expected: "Redirecting to secure payment..." toast (2 seconds)
   - Expected: Automatic form submission to PayFast

6. **PayFast Payment Page**
   - Expected: Redirect to `https://sandbox.payfast.co.za/eng/process`
   - Form should contain:
     - Amount: R70.00 (monthly) or R672.00 (annual)
     - Item: "Monthly Plan" or "Annual Plan"
     - Email: Your email address
     - Unique Payment ID (PF_xxxxx_xxxxx format)

7. **Payment Completion Testing**
   - **Success Path**: Complete payment on PayFast
     - Expected: Redirect to `/payment-callback?payment_status=COMPLETE`
     - Expected: Green success message + "Continue to Dashboard" button
   
   - **Cancel Path**: Click "Cancel" on PayFast
     - Expected: Redirect to `/payment-callback?cancelled=true`
     - Expected: Cancel message + "Return to Pricing" button
   
   - **Failure Path**: Use invalid card details
     - Expected: Redirect to `/payment-callback?payment_status=FAILED`
     - Expected: Error message + "Try Again" button

### **Phase 3: Subscription Management**

8. **Verify Subscription Activation**
   - After successful payment, go to Settings → Subscription tab
   - Expected: "Current Plan" showing active subscription
   - Expected: Plan details, billing cycle, cancellation options

9. **Test Subscription Features**
   - Try plan upgrade/downgrade
   - Test cancellation dialog
   - Verify billing information display

## **🐛 Troubleshooting Common Issues**

### **Issue: Not Reaching PayFast**
- **Cause**: Not authenticated (your case)
- **Solution**: Sign up/sign in first, then try payment

### **Issue: "Failed to generate PayFast payment" Error**
- **Cause**: Missing user data or plan not found
- **Solution**: Check browser console for detailed error

### **Issue: PayFast Shows "Merchant Error"**
- **Cause**: Invalid signature or merchant configuration
- **Solution**: PayFast sandbox credentials may need updating

### **Issue: Payment Callback Not Working**
- **Cause**: PayFast return URL misconfigured
- **Expected Return URL**: http://localhost:8084/payment-callback

## **🔧 Debug Tools**

### **Browser Console Commands** (Open DevTools → Console)

```javascript
// Check current user authentication
console.log('User:', window.localStorage.getItem('supabase.auth.token'))

// Check subscription state
fetch('/api/subscription-status')
  .then(r => r.json())
  .then(console.log)

// Test PayFast form generation
console.log('Testing PayFast integration...')
```

### **Network Tab Monitoring**
Watch for these requests during payment flow:
1. `POST /functions/v1/create-payfast-payment` → Should return 200 with payment data
2. Form submission to `payfast.co.za` → Should redirect to PayFast
3. Return to `/payment-callback` → Should process payment result

## **✅ Success Indicators**

### **Trial Creation Success**
- [ ] "Welcome! Your 7-day free trial has started." toast
- [ ] Trial banner appears on dashboard
- [ ] Trial countdown shows correct days remaining

### **Payment Flow Success**
- [ ] "Redirecting to secure payment..." toast appears
- [ ] Automatic redirect to PayFast sandbox
- [ ] PayFast form shows correct amount and details
- [ ] Payment completion redirects to callback page

### **Subscription Activation Success**
- [ ] Payment callback shows success message
- [ ] Dashboard trial banner updates to subscription status
- [ ] Settings → Subscription shows active plan

## **📝 Next Steps After Testing**

1. **If Payment Flow Works**: Ready for production with `VITE_PAYFAST_SANDBOX=false`
2. **If Issues Found**: Check browser console and network tab for errors
3. **For Production**: Test with real PayFast merchant account

---

**💡 Pro Tip**: The authentication requirement is intentional for security and data integrity. This is standard practice for subscription systems to ensure proper user tracking and payment attribution.