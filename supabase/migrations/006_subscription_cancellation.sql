-- Migration: Add subscription cancellation tracking
-- File: 006_subscription_cancellation.sql

BEGIN;

-- Add cancellation tracking columns to user_subscriptions table
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL;

-- Add index for cancelled subscriptions lookup
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancelled 
ON public.user_subscriptions(user_id, status, cancelled_at) 
WHERE status = 'cancelled';

-- Add index for active subscription lookup (performance optimization)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active_token
ON public.user_subscriptions(user_id, payfast_subscription_token)
WHERE status = 'active';

-- Add comments for documentation
COMMENT ON COLUMN public.user_subscriptions.cancelled_at IS 'Timestamp when subscription was cancelled';
COMMENT ON COLUMN public.user_subscriptions.cancellation_reason IS 'Reason provided for subscription cancellation';

-- Create function to handle subscription cancellation
CREATE OR REPLACE FUNCTION public.cancel_user_subscription(
  p_user_id UUID,
  p_subscription_token TEXT,
  p_reason TEXT DEFAULT 'User requested cancellation'
) RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Find and update the subscription
  UPDATE public.user_subscriptions 
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason,
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND payfast_subscription_token = p_subscription_token
    AND status = 'active'
  RETURNING id INTO v_subscription_id;
  
  -- Return success if a subscription was updated
  RETURN v_subscription_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_user_subscription(UUID, TEXT, TEXT) TO authenticated;

-- Add RLS policy for cancellation operations
CREATE POLICY "Users can cancel their own subscriptions" ON public.user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

COMMIT;