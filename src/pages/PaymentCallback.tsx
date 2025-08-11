import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, CreditCard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

interface PaymentCallbackState {
  status: 'loading' | 'success' | 'failed' | 'cancelled' | 'error';
  message: string;
  details?: string;
  transactionId?: string;
  amount?: string;
}

const PaymentCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refetch: refetchSubscription } = useSubscription();
  
  const [state, setState] = useState<PaymentCallbackState>({
    status: 'loading',
    message: 'Processing payment result...'
  });

  useEffect(() => {
    const processPaymentCallback = async () => {
      try {
        // Get PayFast parameters from URL
        const paymentStatus = searchParams.get('payment_status');
        const paymentId = searchParams.get('pf_payment_id') || searchParams.get('m_payment_id');
        const amount = searchParams.get('amount_gross');
        const itemName = searchParams.get('item_name');
        const signature = searchParams.get('signature');
        
        // Also check for common error parameters
        const error = searchParams.get('error');
        const cancelled = searchParams.get('cancelled');

        console.log('Payment callback params:', {
          paymentStatus,
          paymentId,
          amount,
          itemName,
          error,
          cancelled,
          hasSignature: !!signature
        });

        // Handle different payment outcomes
        if (cancelled === 'true' || searchParams.has('cancel')) {
          setState({
            status: 'cancelled',
            message: 'Payment was cancelled',
            details: 'You cancelled the payment process. No charges have been made to your account.'
          });
          return;
        }

        if (error) {
          setState({
            status: 'error',
            message: 'Payment processing error',
            details: `There was an error processing your payment: ${error}`
          });
          return;
        }

        if (paymentStatus === 'COMPLETE' || paymentStatus === 'complete') {
          // Payment successful
          setState({
            status: 'success',
            message: 'Payment successful!',
            details: 'Your subscription has been activated. You now have full access to all features.',
            transactionId: paymentId || 'N/A',
            amount: amount || 'N/A'
          });

          // Refresh subscription data to reflect the new subscription
          await refetchSubscription();
          
          // Show success toast
          toast.success('🎉 Payment successful! Your subscription is now active.');
          
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'failed') {
          setState({
            status: 'failed',
            message: 'Payment failed',
            details: 'Your payment could not be processed. Please check your payment method and try again.',
            transactionId: paymentId || 'N/A'
          });
          
        } else {
          // Unknown status - treat as pending or processing
          setState({
            status: 'loading',
            message: 'Payment processing...',
            details: 'Your payment is being processed. This may take a few moments.',
            transactionId: paymentId || 'N/A'
          });
          
          // Set a timeout to refresh subscription data
          setTimeout(async () => {
            await refetchSubscription();
            setState(prevState => ({
              ...prevState,
              status: 'success',
              message: 'Payment completed!',
              details: 'Your subscription has been activated.'
            }));
          }, 5000);
        }

      } catch (error) {
        console.error('Error processing payment callback:', error);
        setState({
          status: 'error',
          message: 'Processing error',
          details: 'There was an error processing your payment result. Please contact support if you need assistance.'
        });
      }
    };

    processPaymentCallback();
  }, [searchParams, refetchSubscription]);

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleRetryPayment = () => {
    navigate('/pricing');
  };

  const handleContactSupport = () => {
    // Could open email client or support form
    window.location.href = 'mailto:support@scola.co.za?subject=Payment Issue&body=I had an issue with my payment. Transaction ID: ' + (state.transactionId || 'N/A');
  };

  const renderIcon = () => {
    switch (state.status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-600" />;
      case 'cancelled':
        return <CreditCard className="h-12 w-12 text-gray-600" />;
      default:
        return <AlertCircle className="h-12 w-12 text-gray-600" />;
    }
  };

  const renderButtons = () => {
    switch (state.status) {
      case 'success':
        return (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleReturnHome} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Continue to Dashboard
            </Button>
          </div>
        );
      
      case 'failed':
      case 'error':
        return (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRetryPayment} variant="default">
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleContactSupport} variant="outline">
              Contact Support
            </Button>
          </div>
        );
        
      case 'cancelled':
        return (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRetryPayment} variant="default">
              <CreditCard className="w-4 h-4 mr-2" />
              Return to Pricing
            </Button>
            <Button onClick={handleReturnHome} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        );
        
      case 'loading':
      default:
        return (
          <div className="flex justify-center">
            <Button onClick={handleReturnHome} variant="outline" disabled={state.status === 'loading'}>
              Return to Dashboard
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              {renderIcon()}
            </div>
            <CardTitle className="text-2xl font-semibold mb-2">
              {state.message}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Details */}
            {state.details && (
              <Alert className={`${
                state.status === 'success' 
                  ? 'border-green-200 bg-green-50' 
                  : state.status === 'failed' || state.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-blue-200 bg-blue-50'
              }`}>
                <AlertDescription className={`${
                  state.status === 'success' 
                    ? 'text-green-800' 
                    : state.status === 'failed' || state.status === 'error'
                    ? 'text-red-800'
                    : 'text-blue-800'
                }`}>
                  {state.details}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Transaction details */}
            {(state.transactionId || state.amount) && state.status !== 'loading' && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                {state.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-gray-900">{state.transactionId}</span>
                  </div>
                )}
                {state.amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-900">R{state.amount}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="pt-4">
              {renderButtons()}
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help? Contact us at{' '}
            <a 
              href="mailto:support@scola.co.za" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              support@scola.co.za
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;