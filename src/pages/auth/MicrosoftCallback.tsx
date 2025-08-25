/**
 * Microsoft OAuth Callback Handler  
 * Processes Microsoft Calendar OAuth responses and stores integration tokens
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, Calendar, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { MicrosoftAuthService } from '@/services/integrations/microsoft/MicrosoftAuthService';
import { logger } from '@/utils/logger';

interface MicrosoftCallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  errorDetails?: string;
}

const MicrosoftCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [state, setState] = useState<MicrosoftCallbackState>({
    status: 'loading',
    message: 'Processing Microsoft Calendar connection...'
  });
  const [hasProcessed, setHasProcessed] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    const processMicrosoftCallback = async () => {
      // Prevent multiple processing attempts
      if (hasProcessed || processedRef.current) {
        logger.log('Microsoft OAuth callback already processed, skipping');
        return;
      }
      
      logger.log('🔐 MICROSOFT OAUTH - Starting callback processing');
      setHasProcessed(true);
      processedRef.current = true;

      try {
        // Check if user is authenticated
        if (!user) {
          setState({
            status: 'error',
            message: 'Authentication required',
            errorDetails: 'Please log in to connect your Microsoft Calendar.'
          });
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
          return;
        }

        // Initialize Microsoft Auth Service
        setState({
          status: 'loading',
          message: 'Initializing Microsoft authentication...'
        });

        const microsoftAuth = await MicrosoftAuthService.initialize({
          clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID!,
          tenantId: import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common',
          redirectUri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI!,
          scopes: [
            'https://graph.microsoft.com/Calendars.ReadWrite',
            'https://graph.microsoft.com/User.Read',
            'https://graph.microsoft.com/MailboxSettings.Read',
            'https://graph.microsoft.com/OnlineMeetings.ReadWrite'
          ]
        });

        // Handle redirect response from Microsoft
        setState({
          status: 'loading',
          message: 'Processing Microsoft authentication response...'
        });

        const authResult = await microsoftAuth.handleRedirectResponse();

        if (!authResult) {
          // No auth result could mean several things
          const urlParams = new URLSearchParams(location.search);
          const error = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');

          if (error) {
            let errorMessage = 'Microsoft Calendar connection failed';
            let errorDetails = 'An error occurred during authentication.';

            switch (error) {
              case 'access_denied':
                errorMessage = 'Access denied';
                errorDetails = 'You denied access to your Microsoft Calendar. Please try again if you want to connect your calendar.';
                break;
              case 'invalid_request':
                errorMessage = 'Invalid request';
                errorDetails = 'The authentication request was invalid. Please try connecting again.';
                break;
              case 'server_error':
                errorMessage = 'Server error';
                errorDetails = 'Microsoft encountered a server error. Please try again in a few minutes.';
                break;
              default:
                errorDetails = errorDescription || `Authentication error: ${error}`;
            }

            setState({
              status: 'error',
              message: errorMessage,
              errorDetails
            });
            return;
          }

          // No auth result and no error - possibly invalid callback
          setState({
            status: 'error',
            message: 'Invalid callback',
            errorDetails: 'The Microsoft OAuth callback did not contain valid authentication data. Please try connecting again.'
          });
          return;
        }

        // Success! We have authentication result
        logger.log('🔐 MICROSOFT OAUTH - Authentication successful:', {
          hasAccessToken: !!authResult.accessToken,
          hasAccount: !!authResult.account,
          scopes: authResult.scopes
        });

        // Get user info from Microsoft Graph
        setState({
          status: 'loading',
          message: 'Retrieving your Microsoft account information...'
        });

        const userInfo = await microsoftAuth.getUserInfo(authResult.accessToken);
        
        // Store integration in database
        setState({
          status: 'loading',
          message: 'Saving Microsoft Calendar integration...'
        });

        const integration = await microsoftAuth.storeIntegration(
          user.id,
          userInfo,
          {
            access_token: authResult.accessToken,
            refresh_token: authResult.account?.idTokenClaims ? 'msal_refresh_token' : undefined,
            id_token: authResult.idToken,
            expires_in: authResult.expiresOn ? Math.floor((authResult.expiresOn.getTime() - Date.now()) / 1000) : 3600,
            scope: authResult.scopes?.join(' '),
            token_type: 'Bearer'
          }
        );

        logger.log('🔐 MICROSOFT OAUTH - Integration stored successfully:', {
          integrationId: integration.id,
          provider: integration.provider,
          calendarName: integration.calendar_name,
          syncEnabled: integration.sync_enabled
        });

        // Success!
        setState({
          status: 'success',
          message: `Successfully connected to ${userInfo.name}'s Microsoft Calendar! You can now sync your calendar events.`
        });

        // Redirect to calendar settings after a brief delay
        setTimeout(() => {
          navigate('/schedule', { replace: true });
        }, 3000);

      } catch (err) {
        logger.error('🔐 MICROSOFT OAUTH - Callback processing error:', err);
        
        let errorMessage = 'Connection failed';
        let errorDetails = 'An unexpected error occurred while connecting to Microsoft Calendar.';
        
        if (err instanceof Error) {
          if (err.message.includes('Failed to authenticate')) {
            errorDetails = 'Unable to authenticate with Microsoft. Please try again.';
          } else if (err.message.includes('Failed to fetch user information')) {
            errorDetails = 'Unable to retrieve your Microsoft account information. Please try again.';
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

    processMicrosoftCallback();
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
        <p className="text-gray-600">Microsoft Calendar Integration</p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {renderIcon()}
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {state.status === 'loading' && 'Connecting...'}
            {state.status === 'success' && 'Microsoft Calendar Connected!'}
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

export default MicrosoftCallback;