import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';

interface PayNowButtonProps {
  className?: string;
  disabled?: boolean;
}

export const PayNowButton: React.FC<PayNowButtonProps> = ({ 
  className = "", 
  disabled = false 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    // If user is not authenticated, redirect to signup first
    if (!user) {
      e.preventDefault();
      navigate('/auth?intent=subscription');
      return;
    }
  };

  // If user is not authenticated, show signup redirect button
  if (!user) {
    return (
      <Button
        onClick={() => navigate('/auth?intent=subscription')}
        disabled={disabled}
        className={`w-full bg-white hover:bg-white/90 text-indigo-600 font-medium py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center ${className}`}
      >
        {disabled ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Sign Up & Subscribe - R250/year
          </>
        )}
      </Button>
    );
  }

  // Payment form (for authenticated users only)
  return (
    <form 
      name="PayFastPayNowForm" 
      action="https://www.payfast.co.za/eng/process" 
      method="post"
      className="w-full"
      onSubmit={handleSubmit}
    >
      {/* PayFast required fields */}
      <input required type="hidden" name="cmd" value="_paynow" />
      <input required type="hidden" name="receiver" pattern="[0-9]" value="14995632" />
      <input type="hidden" name="return_url" value="https://www.scola.co.za/auth?mode=login&payment=success" />
      <input type="hidden" name="cancel_url" value="https://www.scola.co.za/payment/cancelled" />
      <input type="hidden" name="notify_url" value="https://fprsjziqubbhznavjskj.supabase.co/functions/v1/payfast-webhook-subscription" />
      <input required type="hidden" name="amount" value="250" />
      <input required type="hidden" name="item_name" maxLength={255} value="Scola Pro - Annual Access" />
      <input type="hidden" name="item_description" maxLength={255} value="Annual access to Scola study management platform." />
      
      {/* PayFast Subscription Fields */}
      <input required type="hidden" name="subscription_type" pattern="1" value="1" />
      <input type="hidden" name="recurring_amount" value="250" />
      <input required type="hidden" name="cycles" pattern="[0-9]" value="0" />
      <input required type="hidden" name="frequency" pattern="[0-9]" value="6" />
      
      {/* Authenticated user details */}
      <input type="hidden" name="custom_str1" value={user.id} />
      <input type="hidden" name="custom_str2" value="subscription_purchase" />

      {/* Payment button for authenticated users */}
      <Button
        type="submit"
        disabled={disabled}
        className={`w-full bg-white hover:bg-white/90 text-indigo-600 font-medium py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center ${className}`}
      >
        {disabled ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Subscribe - R250/year
          </>
        )}
      </Button>
    </form>
  );
};