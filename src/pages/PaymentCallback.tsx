import React, { useEffect, useState, useRef, Profiler } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, CreditCard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import { analyzeEffectDependencies } from '@/utils/dependencyAudit';
import { createProfilerCallback } from '@/utils/profilerIntegration';
import { logger } from '@/utils/logger';

interface PaymentCallbackState {
  status: 'loading' | 'success' | 'failed' | 'cancelled' | 'error';
  message: string;
  details?: string;
  transactionId?: string;
  amount?: string;
}

// Generate unique component instance ID for tracking
const generateInstanceId = () => Math.random().toString(36).substr(2, 9);

const PaymentCallback: React.FC = () => {
  const instanceId = useRef(generateInstanceId());
  
  // PHASE 0.3: Create profiler callback for advanced render tracking
  const onRenderProfiler = createProfilerCallback('PaymentCallback');
  
  // Simplified loop protection (essential guards only)
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  
  // Essential loop detection (simplified)
  if (renderCountRef.current > 20) {
    logger.error(`🚨 EXCESSIVE RENDERS [${instanceId.current}] - ${renderCountRef.current} renders detected`);
  }
  
  // Basic component lifecycle logging
  logger.log(`💳 PAYMENT CALLBACK [${instanceId.current}] - Render #${renderCountRef.current} at:`, new Date().toISOString());
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const subscriptionContext = useSubscriptionContext();
  
  // Create stable reference to prevent infinite loops
  const refetchSubscriptionRef = useRef(subscriptionContext.refetch);
  
  // Update ref on every render to keep it current
  refetchSubscriptionRef.current = subscriptionContext.refetch;
  
  // Simplified hook logging
  logger.log(`💳 PAYMENT STATE [${instanceId.current}]:`, {
    hasUser: !!user,
    hasSearchParams: searchParams.toString().length > 0,
    contextId: subscriptionContext._contextId,
    timestamp: new Date().toISOString()
  });
  
  const [state, setState] = useState<PaymentCallbackState>({
    status: 'loading',
    message: 'Processing payment result...'
  });
  
  // Essential processing guards (simplified)
  const hasProcessed = useRef(false);
  const processingInProgress = useRef(false);
  
  
  
  
  // PHASE 0.2: Component mount/unmount lifecycle logging with dependency analysis
  useEffect(() => {
    const effectId = `PaymentCallback-mount-${instanceId.current}`;
    const effectStartTime = performance.now();
    
    logger.log(`💳 MOUNT [${instanceId.current}] - Component mounted`);
    
    // PHASE 0.2: Analyze mount effect dependencies
    const analysis = analyzeEffectDependencies(
      effectId,
      'PaymentCallback-Mount-Effect',
      'PaymentCallback',
      '/src/pages/PaymentCallback.tsx',
      [], // Empty dependency array
      performance.now() - effectStartTime
    );
    
    return () => {
      logger.log(`💳 UNMOUNT [${instanceId.current}] - Component unmounting`);
    };
  }, []); // Stable empty dependency array

  useEffect(() => {
    // Essential guard check - preserve existing safety mechanisms
    if (hasProcessed.current || processingInProgress.current) {
      logger.log(`💳 BLOCKED [${instanceId.current}] - Already processed or in progress`);
      return;
    }
    
    // Set guards immediately
    hasProcessed.current = true;
    processingInProgress.current = true;
    
    logger.log(`💳 STARTING [${instanceId.current}] - Processing payment callback`);

    const processPaymentCallback = async () => {
      try {
        // Direct URL parameter reading (no memoization needed - runs once only)
        const paymentStatus = searchParams.get('payment_status');
        const paymentId = searchParams.get('pf_payment_id') || searchParams.get('m_payment_id');
        const amount = searchParams.get('amount_gross');
        const itemName = searchParams.get('item_name');
        const signature = searchParams.get('signature');
        const error = searchParams.get('error');
        const cancelled = searchParams.get('cancelled');
        const subscriptionId = searchParams.get('subscription_id');
        const customStr2 = searchParams.get('custom_str2');

        logger.log('Payment callback params:', {
          paymentStatus,
          paymentId,
          amount,
          itemName,
          error,
          cancelled,
          subscriptionId,
          customStr2,
          hasSignature: !!signature,
          isSettingsInitiated: customStr2 === 'subscription_purchase'
        });

        // Determine if this payment was initiated from Settings
        const isFromSettings = customStr2 === 'subscription_purchase';

        // Handle subscription_id parameter (for /payment/success URLs) - ELIMINATES LOOP
        if (subscriptionId) {
          logger.log(`💳 SUBSCRIPTION SUCCESS [${instanceId.current}] - Processing subscription_id: ${subscriptionId}`);
          setState({
            status: 'success',
            message: 'Payment successful!',
            details: 'Your subscription has been activated. You now have full access to all features.',
            transactionId: subscriptionId
          });

          // Direct subscription refetch - no reactive dependencies
          try {
            await subscriptionContext.refetch();
          } catch (refetchError) {
            logger.error(`💳 REFETCH ERROR [${instanceId.current}]:`, refetchError);
          }
          
          // Show success toast
          toast.success('🎉 Payment successful! Your subscription is now active.');
          return; // Exit early - no other processing needed
        }

        // Handle different payment outcomes - ALL EXISTING LOGIC PRESERVED
        if (cancelled === 'true' || cancelled) {
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
          // Payment successful - customize message based on source
          const successMessage = isFromSettings 
            ? 'Subscription activated successfully!'
            : 'Payment successful!';
          const successDetails = isFromSettings
            ? 'Your subscription upgrade is now active. Thank you for supporting Scola!'
            : 'Your subscription has been activated. You now have full access to all features.';
          
          setState({
            status: 'success',
            message: successMessage,
            details: successDetails,
            transactionId: paymentId || 'N/A',
            amount: amount || 'N/A'
          });

          // Direct subscription refetch - no reactive dependencies
          try {
            await subscriptionContext.refetch();
          } catch (refetchError) {
            logger.error(`💳 REFETCH ERROR [${instanceId.current}]:`, refetchError);
          }
          
          // Show success toast with context-specific message
          const toastMessage = isFromSettings
            ? '🎉 Subscription upgraded! Welcome to Scola Pro.'
            : '🎉 Payment successful! Your subscription is now active.';
          toast.success(toastMessage);
          
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
          
          // Direct refetch with timeout - no reactive dependencies
          setTimeout(async () => {
            try {
              await subscriptionContext.refetch();
            } catch (refetchError) {
              logger.error(`💳 REFETCH ERROR [${instanceId.current}]:`, refetchError);
            }
            setState(prevState => ({
              ...prevState,
              status: 'success',
              message: 'Payment completed!',
              details: 'Your subscription has been activated.'
            }));
          }, 5000);
        }

      } catch (error) {
        logger.error(`💳 ERROR [${instanceId.current}] - Payment callback processing error:`, error);
        setState({
          status: 'error',
          message: 'Processing error',
          details: 'There was an error processing your payment result. Please contact support if you need assistance.'
        });
      } finally {
        // Always clear processing guard, but keep hasProcessed flag
        processingInProgress.current = false;
        logger.log(`💳 COMPLETE [${instanceId.current}] - Processing finished`);
      }
    };

    processPaymentCallback();
  }, []); // Empty dependency array - runs ONCE on mount only

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleReturnToLogin = () => {
    navigate('/auth?mode=login&payment=success');
  };

  const handleSmartRedirectAfterPayment = () => {
    // Smart routing based on authentication state
    if (user && user.email_confirmed_at) {
      // User is fully authenticated and email confirmed - go to dashboard
      logger.log('💳 PAYMENT SUCCESS - User authenticated, redirecting to dashboard');
      navigate('/');
    } else if (user) {
      // User exists but email not confirmed - they may need verification
      logger.log('💳 PAYMENT SUCCESS - User exists but email not confirmed, checking verification');
      navigate('/');
    } else {
      // No user session - redirect to login with payment success context
      logger.log('💳 PAYMENT SUCCESS - No user session, redirecting to login');
      navigate('/auth?mode=login&payment=success');
    }
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
            <Button onClick={handleSmartRedirectAfterPayment} className="bg-green-600 hover:bg-green-700">
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
    <Profiler id={`PaymentCallback-${instanceId.current}`} onRender={onRenderProfiler}>
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
    </Profiler>
  );
};

export default PaymentCallback;