/**
 * Microsoft Calendar Integration Component - Browser-compatible UI for Microsoft Calendar setup
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, ExternalLink, AlertTriangleIcon, Settings } from 'lucide-react';
import { logger } from '@/utils/logger';

// Browser-compatible types  
export interface MicrosoftCalendarIntegration {
  id: string;
  sync_enabled: boolean;
  sync_status: 'setup_required' | 'success' | 'error' | 'pending';
  last_sync_at?: string;
  calendar_name?: string;
  provider: 'microsoft';
}

interface MicrosoftCalendarIntegrationProps {
  onIntegrationChange?: (integrations: MicrosoftCalendarIntegration[]) => void;
}

export const MicrosoftCalendarIntegration: React.FC<MicrosoftCalendarIntegrationProps> = ({
  onIntegrationChange
}) => {
  const { user } = useAuth();
  const [isSetupMode] = useState(true); // Always in setup mode until OAuth is configured

  // Check if Microsoft OAuth is configured
  const isMicrosoftConfigured = !!(import.meta.env.VITE_MICROSOFT_CLIENT_ID);
  
  React.useEffect(() => {
    // Report empty integrations to parent
    onIntegrationChange?.([]);
    logger.log('Microsoft Calendar integration in setup mode');
  }, [onIntegrationChange]);

  const handleSetupMicrosoft = () => {
    logger.log('Microsoft Calendar setup requested');
    window.open('https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app', '_blank');
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Please log in to configure Microsoft Calendar integration
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
            <span>Microsoft Calendar Integration</span>
          </CardTitle>
          <CardDescription>
            Connect your Microsoft 365 or Outlook Calendar to sync events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isMicrosoftConfigured ? (
            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                Microsoft Calendar OAuth credentials need to be configured in environment variables.
                Contact your administrator to set up VITE_MICROSOFT_CLIENT_ID.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Microsoft Calendar integration is ready for configuration. OAuth flow will be implemented in a future update.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Microsoft Calendar Setup Required
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              To connect Microsoft Calendar (Outlook), you'll need to set up Azure AD OAuth2 credentials 
              and configure the Microsoft Graph API integration.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleSetupMicrosoft}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Azure Setup Guide
              </Button>
              <Button disabled>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Connect Microsoft Calendar
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
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Azure AD OAuth2 authentication</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Microsoft Graph API integration</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Outlook and Office 365 calendar sync</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Teams meeting integration</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Cross-tenant support</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};