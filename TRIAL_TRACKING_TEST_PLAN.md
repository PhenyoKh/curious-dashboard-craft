# Trial Tracking System - Test Plan & Validation

## 🎯 **Test Scenarios to Validate Fixes**

### **Test 1: Individual Trial Period Validation**
**Objective**: Ensure each user gets exactly 7 days from their signup moment

#### Test Steps:
1. **User A Signs Up Today (e.g., Monday 10:00 AM)**
   - Expected: Trial starts Monday 10:00 AM, ends Monday 10:00 AM (7 days later)
   - Expected: Shows "7 days remaining" immediately after signup

2. **User B Signs Up Tomorrow (e.g., Tuesday 2:00 PM)**  
   - Expected: Trial starts Tuesday 2:00 PM, ends Tuesday 2:00 PM (7 days later)
   - Expected: Shows "7 days remaining" immediately after signup
   - **CRITICAL**: User B should NOT get only 6 days because they signed up later

#### Database Validation:
```sql
-- Check individual trial dates
SELECT 
  user_id,
  trial_start_date,
  trial_end_date,
  EXTRACT(DAYS FROM (trial_end_date - trial_start_date)) as trial_length_days,
  created_at
FROM public.user_subscriptions 
WHERE status = 'trial'
ORDER BY created_at DESC;
```

### **Test 2: Trial Banner Display Logic**
**Objective**: Ensure banners show/hide correctly for different user types

#### Test Cases:

**2A: Trial User (Should Show Banner)**
- User: On active trial
- Expected: Banner shows with days remaining
- Expected: "Upgrade" button visible

**2B: Paid User (Should NOT Show Banner)**  
- User: Has active paid subscription
- Expected: No trial banner appears anywhere
- Expected: User sees regular dashboard without trial messaging

**2C: User with Payment Intent (Should NOT Show Banner)**
- User: Clicked "Subscribe" button and has `?intent=subscription` in URL
- Expected: No trial banner during checkout flow
- Expected: No auto-trial creation

**2D: Expired Trial User (Should Show Upgrade Banner)**
- User: Trial period ended
- Expected: Banner shows "Trial Expired - Upgrade Required"
- Expected: User cannot access pro features

### **Test 3: Date Calculation Accuracy**
**Objective**: Verify the "6 days instead of 7" issue is resolved

#### Test Steps:
1. **Immediate Check**: User signs up, check trial days remaining
   - Expected: Shows "7 days remaining"

2. **Next Day Check**: Same user checks 24 hours later
   - Expected: Shows "6 days remaining" 

3. **Final Day Check**: User checks on last day of trial
   - Expected: Shows "1 day remaining" until trial actually expires

4. **Timezone Test**: Same test from different timezones
   - Expected: Consistent 7-day period regardless of user timezone

### **Test 4: Auto-Trial vs Paid Subscription Logic**
**Objective**: Ensure auto-trial doesn't interfere with paid subscriptions

#### Test Cases:

**4A: Free Trial Path**
- User: Signs up without payment intent
- Expected: Auto-trial starts immediately
- Expected: 7-day free access begins

**4B: Paid Subscription Path**
- User: Clicks "Subscribe" from pricing page
- Expected: No auto-trial creation
- Expected: Redirects to payment flow
- Expected: No trial banner during process

**4C: Existing User**
- User: Already has subscription (trial or paid)
- Expected: No additional trial creation
- Expected: Existing subscription preserved

### **Test 5: Database Function Validation**
**Objective**: Verify new database functions work correctly

#### SQL Tests:
```sql
-- Test 1: Create trial for new user
SELECT public.start_trial_subscription('test-user-id-123'::UUID);

-- Test 2: Get subscription status
SELECT * FROM public.get_user_subscription_status('test-user-id-123'::UUID);

-- Test 3: Get accurate days remaining  
SELECT public.get_trial_days_remaining('test-user-id-123'::UUID);

-- Test 4: Verify trial dates are properly set
SELECT 
  trial_start_date,
  trial_end_date,
  EXTRACT(EPOCH FROM (trial_end_date - trial_start_date)) / (24*60*60) as days_difference
FROM public.user_subscriptions 
WHERE user_id = 'test-user-id-123'::UUID;
```

## 🔧 **Implementation Verification Checklist**

### **Pre-Deployment Checks:**
- [ ] Run `FIX_TRIAL_TRACKING_DATABASE.sql` in Supabase
- [ ] Verify all database functions created successfully
- [ ] Test with sample user accounts
- [ ] Verify TypeScript compilation passes
- [ ] Test banner display logic in development

### **Post-Deployment Validation:**
- [ ] **Test 1 PASSED**: New users get exactly 7 days
- [ ] **Test 2 PASSED**: Paid users see no trial banners
- [ ] **Test 3 PASSED**: Date calculations are accurate
- [ ] **Test 4 PASSED**: Auto-trial logic works correctly
- [ ] **Test 5 PASSED**: Database functions respond properly

### **Edge Case Testing:**
- [ ] User signs up at 11:59 PM (timezone boundary)
- [ ] User upgrades during trial period
- [ ] User cancels subscription after payment
- [ ] System handles leap year dates correctly
- [ ] Multiple browser tabs don't create duplicate trials

## 🚨 **Critical Success Criteria**

### **MUST PASS Tests:**
1. **Individual Trial Periods**: Each user gets 7 full days from their signup
2. **No Banner for Paid Users**: Paid subscribers never see trial banners
3. **Accurate Day Counts**: "Days remaining" calculation is always correct
4. **No Access After Expiry**: Expired trial users cannot access pro features

### **SHOULD PASS Tests:**
1. **Timezone Consistency**: Same trial length regardless of user location
2. **Edge Case Handling**: Proper behavior during boundary conditions
3. **Performance**: Database queries execute efficiently
4. **User Experience**: Clear messaging and smooth upgrade flows

## 📊 **Monitoring & Analytics**

### **Key Metrics to Track:**
- Average trial completion rate
- Days of trial usage before conversion
- Trial-to-paid conversion rate
- Support tickets related to trial issues

### **Red Flags to Watch For:**
- Users complaining about shortened trials
- Paid users reporting trial banners
- Database errors in trial creation
- Inconsistent trial day calculations

---

**Expected Outcome**: After implementing these fixes, users should get proper 7-day individual trials, paid users should never see trial banners, and the system should provide accurate trial tracking for all users.