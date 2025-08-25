import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { PRICING_CONFIG, getPricingConfig, generatePayFastFields } from '@/config/pricing';

interface PayNowButtonProps {
  className?: string;
  disabled?: boolean;
  isAnnual?: boolean; // Default to annual billing
}

export const PayNowButton: React.FC<PayNowButtonProps> = ({ 
  className = "", 
  disabled = false,
  isAnnual = true // Default to annual billing
}) => {
  const pricingConfig = getPricingConfig(isAnnual);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    // If user is not authenticated, redirect to signup first
    if (!user) {
      e.preventDefault();
      const billing = isAnnual ? 'annual' : 'monthly';
      navigate(`/auth?intent=subscription&billing=${billing}`);
      return;
    }
  };

  // If user is not authenticated, show signup redirect button
  if (!user) {
    const billing = isAnnual ? 'annual' : 'monthly';
    return (
      <Button
        onClick={() => navigate(`/auth?intent=subscription&billing=${billing}`)}
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
            Sign Up & Subscribe - {pricingConfig.FORMATTED_DISPLAY}
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
      {/* PayFast fields generated from centralized config */}
      {Object.entries(generatePayFastFields(user.id, isAnnual, 'subscription_purchase')).map(([key, value]) => (
        <input
          key={key}
          required={['cmd', 'receiver', 'amount', 'subscription_type', 'cycles', 'frequency'].includes(key)}
          type="hidden"
          name={key}
          value={value}
          pattern={['receiver', 'cycles', 'frequency'].includes(key) ? '[0-9]' : undefined}
          maxLength={['item_name', 'item_description'].includes(key) ? 255 : undefined}
        />
      ))}

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
            Subscribe - {pricingConfig.FORMATTED_DISPLAY}
          </>
        )}
      </Button>
    </form>
  );
};