import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, Mail, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { useSubscription } from '@/hooks/useSubscription';

interface AuthCallbackState {
  status: 'loading' | 'success' | 'error' | 'expired';
  message: string;
  errorDetails?: string;
}

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resendVerificationEmail, user } = useAuth();
  const { upgradeToPlan } = useSubscription();
  
  const [state, setState] = useState<AuthCallbackState>({
    status: 'loading',
    message: 'Processing authentication...'
  });
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Parse URL hash parameters
        const hashParams = new URLSearchParams(location.hash.substring(1));
        
        // Check for Supabase auth tokens
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        const type = hashParams.get('type');

        logger.auth('Auth callback params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          error, 
          errorDescription,
          type 
        });

        // Handle error cases first
        if (error) {
          if (error === 'otp_expired' || error === 'signup_disabled') {
            setState({
              status: 'expired',
              message: 'Verification link has expired',
              errorDetails: errorDescription || 'The verification link has expired or is no longer valid. Please request a new verification email.'
            });
            return;
          }
          
          if (error === 'access_denied') {
            setState({
              status: 'error',
              message: 'Access denied',
              errorDetails: errorDescription || 'Email verification was denied or cancelled.'
            });
            return;
          }

          // Handle other errors
          setState({
            status: 'error',
            message: 'Authentication failed',
            errorDetails: errorDescription || `An error occurred: ${error}`
          });
          return;
        }

        // Handle success case - tokens present
        if (accessToken && refreshToken) {
          setState({
            status: 'loading',
            message: 'Setting up your session...'
          });

          // Set the session using Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            logger.error('Session error:', sessionError);
            setState({
              status: 'error',
              message: 'Failed to establish session',
              errorDetails: sessionError.message
            });
            return;
          }

          // Success! Check for payment intent before redirecting
          setState({
            status: 'success',
            message: 'Email verified successfully! Setting up your account...'
          });

          // Check for payment intent in URL parameters
          const urlParams = new URLSearchParams(location.search);
          const paymentIntent = urlParams.get('intent');
          const planId = urlParams.get('planId');
          
          console.log('🎯 PAYMENT DEBUG - AuthCallback detected params:', {
            searchQuery: location.search,
            fullUrl: window.location.href,
            paymentIntent,
            planId,
            hasPaymentIntent: paymentIntent === 'plan' && !!planId,
            urlParams: Object.fromEntries(urlParams.entries())
          });

          // Verify session is ready before processing payment intent
          const processPaymentIntent = async () => {
            // Wait for user session to be fully established
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between checks
              attempts++;
              
              // Check if user session is ready
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user && user) {
                console.log('🎯 PAYMENT DEBUG - Session verified, processing intent:', {
                  paymentIntent,
                  planId,
                  sessionUser: session.user.id,
                  authUser: user.id,
                  attempt: attempts
                });
                break;
              }
              
              console.log('🎯 PAYMENT DEBUG - Waiting for session to be ready, attempt:', attempts);
            }
            
            if (attempts >= maxAttempts) {
              console.error('🎯 PAYMENT DEBUG - Session verification timeout');
              setState({
                status: 'error',
                message: 'Session verification failed',
                errorDetails: 'Unable to establish user session. Please try signing in again.'
              });
              return;
            }
            
            console.log('🎯 PAYMENT DEBUG - AuthCallback processing intent:', {
              paymentIntent,
              planId,
              willTriggerPayment: paymentIntent === 'plan' && planId,
              planIdAsNumber: planId ? parseInt(planId) : null
            });
            
            if (paymentIntent === 'plan' && planId) {
              console.log('🎯 PAYMENT DEBUG - Triggering payment flow for plan:', planId);
              setState({
                status: 'success',
                message: 'Processing your subscription...'
              });
              // Trigger payment flow after verification
              upgradeToPlan(parseInt(planId));
            } else {
              console.log('🎯 PAYMENT DEBUG - No payment intent, redirecting to dashboard');
              navigate('/', { replace: true });
            }
          };
          
          // Start the payment intent processing
          processPaymentIntent();
          
          return;
        }

        // No tokens and no error - invalid callback
        setState({
          status: 'error',
          message: 'Invalid verification link',
          errorDetails: 'This verification link is invalid or malformed. Please request a new verification email.'
        });

      } catch (err) {
        logger.error('Auth callback processing error:', err);
        setState({
          status: 'error',
          message: 'Processing failed',
          errorDetails: 'An unexpected error occurred while processing the verification link.'
        });
      }
    };

    processAuthCallback();
  }, [location.hash, navigate]);

  const handleResendVerification = async () => {
    if (!user?.email && state.status !== 'expired') {
      // If no user context, redirect to signup
      navigate('/auth', { replace: true });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await resendVerificationEmail();
      
      if (error) {
        setState({
          status: 'error',
          message: 'Failed to resend verification',
          errorDetails: error.message
        });
      } else {
        setState({
          status: 'success',
          message: 'Verification email sent! Please check your inbox and click the new verification link.'
        });
      }
    } catch (err) {
      setState({
        status: 'error',
        message: 'Failed to resend verification',
        errorDetails: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth', { replace: true });
  };

  const handleGoToDashboard = () => {
    navigate('/', { replace: true });
  };

  const renderIcon = () => {
    switch (state.status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'expired':
        return <Mail className="h-12 w-12 text-orange-600" />;
      case 'error':
      default:
        return <AlertCircle className="h-12 w-12 text-red-600" />;
    }
  };

  const renderActions = () => {
    switch (state.status) {
      case 'success':
        return (
          <div className="space-y-3">
            <Button 
              onClick={handleGoToDashboard}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        );
        
      case 'expired':
        return (
          <div className="space-y-3">
            <Button 
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={handleBackToLogin}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        );
        
      case 'error':
        return (
          <div className="space-y-3">
            <Button 
              onClick={handleResendVerification}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Request New Verification Email
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={handleBackToLogin}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        );
        
      case 'loading':
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-4">
      {/* Scola Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Scola</h1>
        <p className="text-gray-600">Email Verification</p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {renderIcon()}
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {state.status === 'loading' && 'Processing...'}
            {state.status === 'success' && 'Email Verified!'}
            {state.status === 'expired' && 'Link Expired'}
            {state.status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Message */}
          <div className="text-center">
            <p className="text-gray-700 text-sm leading-relaxed">
              {state.message}
            </p>
          </div>

          {/* Error Details */}
          {state.errorDetails && state.status !== 'loading' && (
            <Alert variant={state.status === 'expired' ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {state.errorDetails}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {renderActions()}

          {/* Help Text */}
          {state.status !== 'loading' && state.status !== 'success' && (
            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-500">
                Having trouble? Check your email for the latest verification link or contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-800 text-white text-xs rounded-lg max-w-md w-full">
          <p><strong>Debug Info:</strong></p>
          <p>Hash: {location.hash}</p>
          <p>Status: {state.status}</p>
          <p>User: {user ? user.email : 'None'}</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;