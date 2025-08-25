/**
 * Microsoft Calendar Integration Component - Simple, user-friendly connection interface  
 */

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { MicrosoftAuthService } from '@/services/integrations/microsoft/MicrosoftAuthService';

// Browser-compatible types  
export interface MicrosoftCalendarIntegration {
  id: string;
  sync_enabled: boolean;
  sync_status: 'connected' | 'disconnected' | 'error';
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
  const [integrations, setIntegrations] = React.useState<MicrosoftCalendarIntegration[]>([]);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check if Microsoft OAuth is configured
  const isMicrosoftAvailable = !!(import.meta.env.VITE_MICROSOFT_CLIENT_ID);
  const isConnected = integrations.length > 0;
  
  // Load existing integrations
  React.useEffect(() => {
    const loadIntegrations = async () => {
      if (!user || !isMicrosoftAvailable) {
        setIsLoading(false);
        return;
      }

      try {
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

        const userIntegrations = await microsoftAuth.getUserIntegrations(user.id);
        setIntegrations(userIntegrations);
        onIntegrationChange?.(userIntegrations);
        
        logger.log('Microsoft Calendar integrations loaded:', { count: userIntegrations.length });
      } catch (error) {
        logger.error('Failed to load Microsoft Calendar integrations:', error);
        setIntegrations([]);
        onIntegrationChange?.([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadIntegrations();
  }, [user, isMicrosoftAvailable, onIntegrationChange]);

  const handleConnectMicrosoft = async () => {
    if (!isMicrosoftAvailable) {
      toast.error('Microsoft Calendar integration is being set up. Check back soon!');
      logger.log('Microsoft Calendar connection attempted but not configured');
      return;
    }

    if (!user) {
      toast.error('Please log in to connect your Microsoft Calendar.');
      return;
    }

    setIsConnecting(true);
    logger.log('Microsoft Calendar OAuth flow initiated');
    
    try {
      // Initialize Microsoft Auth Service
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

      logger.log('Starting Microsoft OAuth redirect flow');
      
      // Show immediate feedback
      toast.info('Redirecting to Microsoft for authorization...');
      
      // Use redirect flow for Microsoft (more reliable than popup)
      await microsoftAuth.loginRedirect();
      
    } catch (error) {
      logger.error('Microsoft Calendar OAuth initiation failed:', error);
      
      const errorMessage = error?.message || error?.toString() || '';
      
      // Handle specific MSAL interaction errors with helpful user guidance
      if (errorMessage.includes('interaction_in_progress')) {
        toast.error('Please wait for any existing Microsoft authentication to complete, then try again.');
        
        // Clear MSAL state to help with recovery
        try {
          await microsoftAuth.clearAllState();
          logger.log('Cleared MSAL state after interaction error');
        } catch (clearError) {
          logger.error('Failed to clear MSAL state:', clearError);
        }
      } else {
        toast.error('Unable to start Microsoft Calendar connection. Please try again.');
      }
      
      setIsConnecting(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Microsoft Calendar</CardTitle>
                <CardDescription>
                  Checking connection status...
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Loading...</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Microsoft Calendar</CardTitle>
              <CardDescription>
                {isConnected 
                  ? `Connected to ${integrations[0]?.calendar_name || 'Microsoft Calendar'}`
                  : 'Automatically sync your Outlook and Office 365 events'
                }
              </CardDescription>
            </div>
          </div>
          
          {isConnected ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {!isConnected ? (
          <div className="flex flex-col space-y-3">
            <p className="text-sm text-gray-600">
              Connect your Microsoft Calendar to sync Outlook and Office 365 events automatically.
            </p>
            <Button 
              onClick={handleConnectMicrosoft}
              disabled={isConnecting || !isMicrosoftAvailable}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Connect Microsoft Calendar
                </>
              )}
            </Button>
            {!isMicrosoftAvailable && (
              <p className="text-xs text-gray-500">
                Microsoft Calendar integration is being configured.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
              ✓ Successfully connected to Microsoft Calendar
              <br />
              <span className="text-xs text-green-600">
                Last sync: {integrations[0]?.last_sync_at 
                  ? new Date(integrations[0].last_sync_at).toLocaleDateString() 
                  : 'Not yet synced'
                }
              </span>
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Sync Settings
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};