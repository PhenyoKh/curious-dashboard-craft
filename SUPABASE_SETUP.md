# Supabase Edge Functions Setup

## Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Or using curl (Linux/macOS)
curl -sSfL https://supabase.com/install | sh

# Verify installation
supabase --version
```

## Deploy Edge Functions

```bash
# Login to Supabase (required once)
supabase login

# Link to your project
supabase link --project-ref fprsjziqubbhznavjskj

# Deploy Edge Functions
supabase functions deploy create-payfast-payment
supabase functions deploy payfast-webhook

# Set environment variables (Official PayFast Sandbox Test Credentials)
supabase secrets set PAYFAST_MERCHANT_ID=10000100
supabase secrets set PAYFAST_MERCHANT_KEY=46f0cd694581a
supabase secrets set PAYFAST_PASSPHRASE=jt7NOE43FZPn
supabase secrets set BASE_URL=http://localhost:8083
```

## Manual Dashboard Setup (Alternative)

If CLI is not available, configure via Supabase Dashboard:

1. Go to https://supabase.com/dashboard
2. Open project: fprsjziqubbhznavjskj  
3. Navigate to Project Settings → Edge Functions
4. Add environment variables (Official PayFast Sandbox Test Credentials):
   - PAYFAST_MERCHANT_ID=10000100
   - PAYFAST_MERCHANT_KEY=46f0cd694581a
   - PAYFAST_PASSPHRASE=jt7NOE43FZPn
   - BASE_URL=http://localhost:8083

## Verify Functions

Check that these functions are deployed:
- create-payfast-payment (POST /functions/v1/create-payfast-payment)
- payfast-webhook (POST /functions/v1/payfast-webhook)

## Test Function

```bash
# Test the create-payfast-payment function
curl -X POST 'https://fprsjziqubbhznavjskj.supabase.co/functions/v1/create-payfast-payment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-id",
    "userName": "Test User", 
    "userEmail": "test@example.com",
    "planId": 1,
    "planName": "Pro Plan",
    "planPrice": 99.00,
    "billingInterval": "monthly",
    "subscriptionId": "test-subscription-id"
  }'
```