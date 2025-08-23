/**
 * Google Calendar Integration Component - Browser-compatible UI for Google Calendar setup
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, ExternalLink, AlertTriangleIcon, Settings } from 'lucide-react';
import { logger } from '@/utils/logger';

// Browser-compatible types
export interface CalendarIntegration {
  id: string;
  sync_enabled: boolean;
  sync_status: 'setup_required' | 'success' | 'error' | 'pending';
  last_sync_at?: string;
  calendar_name?: string;
  provider: 'google';
}

interface GoogleCalendarIntegrationProps {
  onIntegrationChange?: (integrations: CalendarIntegration[]) => void;
}

export const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  onIntegrationChange
}) => {
  const { user } = useAuth();
  const [isSetupMode] = useState(true); // Always in setup mode until OAuth is configured

  // Check if Google OAuth is configured
  const isGoogleConfigured = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  
  React.useEffect(() => {
    // Report empty integrations to parent
    onIntegrationChange?.([]);
    logger.log('Google Calendar integration in setup mode');
  }, [onIntegrationChange]);

  const handleSetupGoogle = () => {
    logger.log('Google Calendar setup requested');
    window.open('https://developers.google.com/calendar/api/quickstart/js', '_blank');
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Please log in to configure Google Calendar integration
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Setup Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Google Calendar Integration</span>
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to sync events bidirectionally
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isGoogleConfigured ? (
            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                Google Calendar OAuth credentials need to be configured in environment variables.
                Contact your administrator to set up VITE_GOOGLE_CLIENT_ID.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Google Calendar integration is ready for configuration. OAuth flow will be implemented in a future update.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center py-6">
            <CalendarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Google Calendar Setup Required
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              To connect Google Calendar, you'll need to set up OAuth2 credentials and configure 
              the integration. This feature is currently in development.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleSetupGoogle}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Google Setup Guide
              </Button>
              <Button disabled>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Connect Google Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>OAuth2 authentication flow</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Bidirectional event synchronization</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Multiple calendar support</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Conflict resolution</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Real-time sync status</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};