/**
 * Google OAuth Callback Handler
 * Processes Google Calendar OAuth responses and stores integration tokens
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, Calendar, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { GoogleAuthService } from '@/services/integrations/google/GoogleAuthService';
import { logger } from '@/utils/logger';

interface GoogleCallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  errorDetails?: string;
}

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [state, setState] = useState<GoogleCallbackState>({
    status: 'loading',
    message: 'Processing Google Calendar connection...'
  });
  const [hasProcessed, setHasProcessed] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    const processGoogleCallback = async () => {
      // Prevent multiple processing attempts
      if (hasProcessed || processedRef.current) {
        logger.log('Google OAuth callback already processed, skipping');
        return;
      }
      
      logger.log('🔐 GOOGLE OAUTH - Starting callback processing');
      setHasProcessed(true);
      processedRef.current = true;

      try {
        // Check if user is authenticated
        if (!user) {
          setState({
            status: 'error',
            message: 'Authentication required',
            errorDetails: 'Please log in to connect your Google Calendar.'
          });
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
          return;
        }

        // Parse URL search parameters for OAuth response
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        logger.log('🔐 GOOGLE OAUTH - Callback params:', { 
          hasCode: !!code, 
          error, 
          state,
          userId: user.id 
        });

        // Handle error cases first
        if (error) {
          let errorMessage = 'Google Calendar connection failed';
          let errorDetails = 'An error occurred during authentication.';

          switch (error) {
            case 'access_denied':
              errorMessage = 'Access denied';
              errorDetails = 'You denied access to your Google Calendar. Please try again if you want to connect your calendar.';
              break;
            case 'invalid_request':
              errorMessage = 'Invalid request';
              errorDetails = 'The authentication request was invalid. Please try connecting again.';
              break;
            default:
              errorDetails = `Authentication error: ${error}`;
          }

          setState({
            status: 'error',
            message: errorMessage,
            errorDetails
          });
          return;
        }

        // Check for authorization code
        if (!code) {
          setState({
            status: 'error',
            message: 'Missing authorization code',
            errorDetails: 'The Google OAuth response is missing the authorization code. Please try connecting again.'
          });
          return;
        }

        // Initialize Google Auth Service
        setState({
          status: 'loading',
          message: 'Exchanging authorization code for tokens...'
        });

        const googleAuth = GoogleAuthService.initialize({
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
          clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET,
          redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI!,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
          ]
        });

        // Exchange code for tokens
        setState({
          status: 'loading',
          message: 'Getting access tokens from Google...'
        });

        const tokens = await googleAuth.getTokensFromCode(code);
        
        if (!tokens.access_token) {
          throw new Error('No access token received from Google');
        }

        // Get user info from Google
        setState({
          status: 'loading',
          message: 'Retrieving your Google account information...'
        });

        const userInfo = await googleAuth.getUserInfo(tokens.access_token);
        
        // Store integration in database
        setState({
          status: 'loading',
          message: 'Saving Google Calendar integration...'
        });

        const integration = await googleAuth.storeIntegration(
          user.id,
          userInfo,
          tokens
        );

        logger.log('🔐 GOOGLE OAUTH - Integration stored successfully:', {
          integrationId: integration.id,
          provider: integration.provider,
          calendarName: integration.calendar_name,
          syncEnabled: integration.sync_enabled
        });

        // Success!
        setState({
          status: 'success',
          message: `Successfully connected to ${userInfo.name}'s Google Calendar! You can now sync your calendar events.`
        });

        // Redirect to calendar settings after a brief delay
        setTimeout(() => {
          navigate('/schedule', { replace: true });
        }, 3000);

      } catch (err) {
        logger.error('🔐 GOOGLE OAUTH - Callback processing error:', err);
        
        let errorMessage = 'Connection failed';
        let errorDetails = 'An unexpected error occurred while connecting to Google Calendar.';
        
        if (err instanceof Error) {
          if (err.message.includes('Failed to exchange authorization code')) {
            errorDetails = 'Unable to exchange the authorization code for tokens. Please try again.';
          } else if (err.message.includes('Failed to fetch user information')) {
            errorDetails = 'Unable to retrieve your Google account information. Please try again.';
          } else if (err.message.includes('Failed to store calendar integration')) {
            errorDetails = 'Unable to save the calendar integration. Please try again.';
          } else {
            errorDetails = err.message;
          }
        }

        setState({
          status: 'error',
          message: errorMessage,
          errorDetails
        });
      }
    };

    processGoogleCallback();
  }, [location.search, navigate, user]);

  const handleRetry = () => {
    // Navigate back to schedule page to try connection again
    navigate('/schedule', { replace: true });
  };

  const handleBackToSchedule = () => {
    navigate('/schedule', { replace: true });
  };

  const renderIcon = () => {
    switch (state.status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
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
              onClick={handleBackToSchedule}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Go to Schedule
            </Button>
          </div>
        );
        
      case 'error':
        return (
          <div className="space-y-3">
            <Button 
              onClick={handleRetry}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline"
              onClick={handleBackToSchedule}
              className="w-full"
            >
              Back to Schedule
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
        <p className="text-gray-600">Google Calendar Integration</p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {renderIcon()}
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {state.status === 'loading' && 'Connecting...'}
            {state.status === 'success' && 'Google Calendar Connected!'}
            {state.status === 'error' && 'Connection Failed'}
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
            <Alert variant={state.status === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {state.errorDetails}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {renderActions()}

          {/* Help Text */}
          {state.status !== 'loading' && (
            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-500">
                Having trouble? You can try connecting again from the Schedule page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-800 text-white text-xs rounded-lg max-w-md w-full">
          <p><strong>Debug Info:</strong></p>
          <p>Search: {location.search}</p>
          <p>Status: {state.status}</p>
          <p>User: {user ? user.email : 'None'}</p>
        </div>
      )}
    </div>
  );
};

export default GoogleCallback;