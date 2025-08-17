/**
 * Google Calendar Integration Component - Main UI for managing Google Calendar connections
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon, SettingsIcon } from 'lucide-react';
import { GoogleAuthService, CalendarIntegration } from '@/services/integrations/google/GoogleAuthService';
import { GoogleCalendarService, GoogleCalendarInfo } from '@/services/integrations/google/GoogleCalendarService';
import { CalendarSyncEngine, SyncResult } from '@/services/integrations/google/CalendarSyncEngine';
import { ConflictResolutionService, SyncConflict } from '@/services/integrations/google/ConflictResolutionService';
import { toast } from 'sonner';

interface GoogleCalendarIntegrationProps {
  onIntegrationChange?: (integrations: CalendarIntegration[]) => void;
}

export const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  onIntegrationChange
}) => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [availableCalendars, setAvailableCalendars] = useState<{ [key: string]: GoogleCalendarInfo[] }>({});
  const [syncStatus, setSyncStatus] = useState<{ [key: string]: 'idle' | 'syncing' | 'success' | 'error' }>({});
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authService = GoogleAuthService.getInstance();
  const calendarService = GoogleCalendarService.getInstance();
  const syncEngine = CalendarSyncEngine.getInstance();
  const conflictService = ConflictResolutionService.getInstance();

  useEffect(() => {
    if (user) {
      loadIntegrations();
      loadConflicts();
    }
  }, [user, loadIntegrations, loadConflicts]);

  const loadIntegrations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userIntegrations = await authService.getUserIntegrations(user.id);
      setIntegrations(userIntegrations);
      
      // Load available calendars for each integration
      const calendarsMap: { [key: string]: GoogleCalendarInfo[] } = {};
      for (const integration of userIntegrations) {
        if (integration.sync_enabled) {
          try {
            const calendarList = await calendarService.getCalendarList(integration);
            calendarsMap[integration.id] = calendarList.calendars;
          } catch (error) {
            console.error(`Failed to load calendars for integration ${integration.id}:`, error);
          }
        }
      }
      setAvailableCalendars(calendarsMap);
      
      onIntegrationChange?.(userIntegrations);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      setError('Failed to load calendar integrations');
    } finally {
      setLoading(false);
    }
  }, [user, onIntegrationChange, authService, calendarService]);

  const loadConflicts = useCallback(async () => {
    if (!user) return;

    try {
      const pendingConflicts = await conflictService.getPendingConflicts(user.id);
      setConflicts(pendingConflicts);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  }, [user, conflictService]);

  const handleConnectGoogle = async () => {
    if (!user) return;

    try {
      // Initialize Google Auth Service with environment variables
      const config = {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        // clientSecret not needed for client-side OAuth2 flow
        redirectUri: `${window.location.origin}/auth/google/callback`,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ]
      };

      if (!config.clientId) {
        throw new Error('Google Calendar integration is not configured. Please contact your administrator.');
      }

      GoogleAuthService.initialize(config);
      const authUrl = authService.getAuthUrl(`connect-calendar-${user.id}`);
      
      // Open Google OAuth in new window
      window.open(authUrl, 'google-auth', 'width=500,height=600');
      
      // Listen for auth completion (in a real app, you'd handle the callback properly)
      toast.info('Complete the authorization in the popup window');
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      toast.error('Failed to connect Google Calendar');
    }
  };

  const handleToggleSync = async (integrationId: string, enabled: boolean) => {
    try {
      await authService.updateSyncPreferences(integrationId, { sync_enabled: enabled });
      await loadIntegrations();
      toast.success(`Sync ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Failed to toggle sync:', error);
      toast.error('Failed to update sync settings');
    }
  };

  const handleChangeSyncDirection = async (integrationId: string, direction: 'import_only' | 'export_only' | 'bidirectional') => {
    try {
      await authService.updateSyncPreferences(integrationId, { sync_direction: direction });
      await loadIntegrations();
      toast.success('Sync direction updated successfully');
    } catch (error) {
      console.error('Failed to update sync direction:', error);
      toast.error('Failed to update sync direction');
    }
  };

  const handleSyncNow = async (integrationId: string) => {
    if (!user) return;

    try {
      setSyncStatus(prev => ({ ...prev, [integrationId]: 'syncing' }));
      
      const result = await syncEngine.performFullSync(user.id, integrationId);
      
      if (result.success) {
        setSyncStatus(prev => ({ ...prev, [integrationId]: 'success' }));
        toast.success(`Sync completed: ${result.eventsProcessed} events processed`);
        
        if (result.conflictsDetected > 0) {
          toast.warning(`${result.conflictsDetected} conflicts detected - please review`);
          await loadConflicts();
        }
      } else {
        setSyncStatus(prev => ({ ...prev, [integrationId]: 'error' }));
        toast.error(`Sync failed: ${result.errors.join(', ')}`);
      }
      
      await loadIntegrations();
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(prev => ({ ...prev, [integrationId]: 'error' }));
      toast.error('Sync failed unexpectedly');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      await authService.revokeAccess(integrationId);
      await loadIntegrations();
      toast.success('Google Calendar disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect Google Calendar');
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'syncing':
        return <RefreshCwIcon className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <CalendarIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSyncStatusText = (integration: CalendarIntegration) => {
    if (integration.last_successful_sync_at) {
      const lastSync = new Date(integration.last_successful_sync_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));
      
      if (diffMinutes < 60) {
        return `Last synced ${diffMinutes} minutes ago`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return `Last synced ${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffMinutes / 1440);
        return `Last synced ${days} day${days > 1 ? 's' : ''} ago`;
      }
    }
    return 'Never synced';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCwIcon className="h-4 w-4 animate-spin" />
            <span>Loading calendar integrations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Google Calendar Connected</h3>
              <p className="text-gray-600 mb-4">
                Connect your Google Calendar to automatically sync your events
              </p>
              <Button onClick={handleConnectGoogle}>
                Connect Google Calendar
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  {integrations.length} Google Calendar{integrations.length > 1 ? 's' : ''} connected
                </p>
              </div>
              <Button variant="outline" onClick={handleConnectGoogle}>
                Add Another Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Calendars */}
      {integrations.map((integration) => (
        <Card key={integration.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getSyncStatusIcon(integration.sync_status)}
                <div>
                  <CardTitle className="text-lg">
                    {integration.calendar_name || 'Google Calendar'}
                  </CardTitle>
                  <CardDescription>
                    {getSyncStatusText(integration)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={integration.sync_enabled ? 'default' : 'secondary'}>
                  {integration.sync_enabled ? 'Active' : 'Paused'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSyncNow(integration.id)}
                  disabled={syncStatus[integration.id] === 'syncing'}
                >
                  {syncStatus[integration.id] === 'syncing' ? (
                    <RefreshCwIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect(integration.id)}
                >
                  <XCircleIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sync Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enable Sync</label>
                <Switch
                  checked={integration.sync_enabled}
                  onCheckedChange={(enabled) => handleToggleSync(integration.id, enabled)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Sync Direction</label>
                <Select
                  value={integration.sync_direction}
                  onValueChange={(value: 'import_only' | 'export_only' | 'bidirectional') =>
                    handleChangeSyncDirection(integration.id, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import_only">Import Only (Google → Local)</SelectItem>
                    <SelectItem value="export_only">Export Only (Local → Google)</SelectItem>
                    <SelectItem value="bidirectional">Bidirectional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sync Status Details */}
            {integration.sync_error_message && (
              <Alert variant="destructive">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  Sync Error: {integration.sync_error_message}
                </AlertDescription>
              </Alert>
            )}

            {/* Available Calendars */}
            {availableCalendars[integration.id] && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Available Calendars</label>
                <div className="grid gap-2">
                  {availableCalendars[integration.id].map((calendar) => (
                    <div
                      key={calendar.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: calendar.backgroundColor || '#3b82f6' }}
                        />
                        <span className="text-sm">{calendar.summary}</span>
                        {calendar.primary && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 capitalize">
                        {calendar.accessRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-600">
              <AlertTriangleIcon className="h-5 w-5" />
              <span>Sync Conflicts</span>
            </CardTitle>
            <CardDescription>
              {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} require{conflicts.length === 1 ? 's' : ''} your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflicts.slice(0, 3).map((conflict) => (
                <div
                  key={conflict.id}
                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {conflict.local_event_data.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      {conflict.conflict_description}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Resolve
                  </Button>
                </div>
              ))}
              {conflicts.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm">
                    View All {conflicts.length} Conflicts
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};