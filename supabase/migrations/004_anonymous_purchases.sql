-- Add anonymous purchases tracking table
-- Migration: 004_anonymous_purchases.sql

-- Create anonymous_purchases table for email-based purchases
CREATE TABLE IF NOT EXISTS public.anonymous_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  payment_reference TEXT,
  amount_paid DECIMAL(10,2),
  purchase_type TEXT NOT NULL DEFAULT 'lifetime_access',
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payfast_data JSONB,
  linked_user_id UUID REFERENCES auth.users(id),
  linked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_anonymous_purchases_email 
ON public.anonymous_purchases(email);

CREATE INDEX IF NOT EXISTS idx_anonymous_purchases_payment_ref 
ON public.anonymous_purchases(payment_reference);

CREATE INDEX IF NOT EXISTS idx_anonymous_purchases_linked_user 
ON public.anonymous_purchases(linked_user_id);

-- Add RLS policies
ALTER TABLE public.anonymous_purchases ENABLE ROW LEVEL SECURITY;

-- Function to link anonymous purchase to user account
CREATE OR REPLACE FUNCTION public.link_anonymous_purchase_to_user(
  purchase_email TEXT,
  user_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
  purchase_record RECORD;
BEGIN
  -- Find unlinked purchase for this email
  SELECT * INTO purchase_record 
  FROM public.anonymous_purchases 
  WHERE email = purchase_email 
    AND linked_user_id IS NULL 
    AND purchase_type = 'lifetime_access'
  ORDER BY paid_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Link purchase to user
  UPDATE public.anonymous_purchases 
  SET linked_user_id = user_uuid, linked_at = now()
  WHERE id = purchase_record.id;
  
  -- Grant lifetime access to user
  INSERT INTO public.user_profiles (
    id, has_lifetime_access, payment_reference, paid_at
  ) VALUES (
    user_uuid, TRUE, purchase_record.payment_reference, purchase_record.paid_at
  ) ON CONFLICT (id) DO UPDATE SET
    has_lifetime_access = TRUE,
    payment_reference = EXCLUDED.payment_reference,
    paid_at = EXCLUDED.paid_at;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.link_anonymous_purchase_to_user(TEXT, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.anonymous_purchases IS 'Stores purchases made before account creation for later linking';
COMMENT ON COLUMN public.anonymous_purchases.email IS 'Email address provided during anonymous purchase';
COMMENT ON COLUMN public.anonymous_purchases.payment_reference IS 'PayFast payment ID for reference';
COMMENT ON COLUMN public.anonymous_purchases.amount_paid IS 'Amount paid in ZAR';
COMMENT ON COLUMN public.anonymous_purchases.payfast_data IS 'Full PayFast IPN data for audit purposes';
COMMENT ON COLUMN public.anonymous_purchases.linked_user_id IS 'User account this purchase was linked to';