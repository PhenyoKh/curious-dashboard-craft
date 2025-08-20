/**
 * Microsoft Calendar Integration Component - Main UI for managing Microsoft Calendar connections
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
import { CalendarIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon, SettingsIcon, VideoIcon, UsersIcon } from 'lucide-react';
import { MicrosoftAuthService, MicrosoftCalendarIntegration } from '@/services/integrations/microsoft/MicrosoftAuthService';
import { MicrosoftCalendarService, MicrosoftCalendarInfo } from '@/services/integrations/microsoft/MicrosoftCalendarService';
import { MicrosoftCalendarSyncEngine, MicrosoftSyncResult } from '@/services/integrations/microsoft/MicrosoftCalendarSyncEngine';
import { ConflictResolutionService, SyncConflict } from '@/services/integrations/google/ConflictResolutionService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface MicrosoftCalendarIntegrationProps {
  onIntegrationChange?: (integrations: MicrosoftCalendarIntegration[]) => void;
}

export const MicrosoftCalendarIntegration: React.FC<MicrosoftCalendarIntegrationProps> = ({
  onIntegrationChange
}) => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<MicrosoftCalendarIntegration[]>([]);
  const [availableCalendars, setAvailableCalendars] = useState<{ [key: string]: MicrosoftCalendarInfo[] }>({});
  const [syncStatus, setSyncStatus] = useState<{ [key: string]: 'idle' | 'syncing' | 'success' | 'error' }>({});
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncEngine = MicrosoftCalendarSyncEngine.getInstance();
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
      const authService = MicrosoftAuthService.getInstance();
      const userIntegrations = await authService.getUserIntegrations(user.id);
      setIntegrations(userIntegrations);
      
      // Load available calendars for each integration
      const calendarsMap: { [key: string]: MicrosoftCalendarInfo[] } = {};
      const calendarService = MicrosoftCalendarService.getInstance();
      
      for (const integration of userIntegrations) {
        if (integration.sync_enabled) {
          try {
            const calendarList = await calendarService.getCalendarList(integration);
            calendarsMap[integration.id] = calendarList.calendars;
          } catch (error) {
            logger.error(`Failed to load calendars for integration ${integration.id}:`, error);
          }
        }
      }
      setAvailableCalendars(calendarsMap);
      
      onIntegrationChange?.(userIntegrations);
    } catch (error) {
      logger.error('Failed to load Microsoft integrations:', error);
      setError('Failed to load Microsoft Calendar integrations');
    } finally {
      setLoading(false);
    }
  }, [user, onIntegrationChange]);

  const loadConflicts = useCallback(async () => {
    if (!user) return;

    try {
      const pendingConflicts = await conflictService.getPendingConflicts(user.id);
      setConflicts(pendingConflicts);
    } catch (error) {
      logger.error('Failed to load conflicts:', error);
    }
  }, [user, conflictService]);

  const handleConnectMicrosoft = async () => {
    if (!user) return;

    try {
      // Initialize Microsoft Auth Service with environment variables
      const config = {
        clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
        tenantId: import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common',
        redirectUri: `${window.location.origin}/auth/microsoft/callback`,
        scopes: MicrosoftAuthService.getDefaultScopes()
      };

      if (!config.clientId) {
        throw new Error('Microsoft Calendar integration is not configured. Please contact your administrator.');
      }

      const authService = await MicrosoftAuthService.initialize(config);
      
      // Use popup authentication
      const authResult = await authService.loginPopup();
      
      if (authResult) {
        const userInfo = await authService.getUserInfo();
        const tokens = {
          access_token: authResult.accessToken,
          id_token: authResult.idToken,
          expires_in: 3600 // Typical expiry
        };

        await authService.storeIntegration(user.id, userInfo, tokens);
        await loadIntegrations();
        toast.success('Microsoft Calendar connected successfully!');
      }
    } catch (error) {
      logger.error('Failed to connect Microsoft Calendar:', error);
      toast.error('Failed to connect Microsoft Calendar');
    }
  };

  const handleToggleSync = async (integrationId: string, enabled: boolean) => {
    try {
      const authService = MicrosoftAuthService.getInstance();
      await authService.updateSyncPreferences(integrationId, { sync_enabled: enabled });
      await loadIntegrations();
      toast.success(`Sync ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      logger.error('Failed to toggle sync:', error);
      toast.error('Failed to update sync settings');
    }
  };

  const handleChangeSyncDirection = async (integrationId: string, direction: 'import_only' | 'export_only' | 'bidirectional') => {
    try {
      const authService = MicrosoftAuthService.getInstance();
      await authService.updateSyncPreferences(integrationId, { sync_direction: direction });
      await loadIntegrations();
      toast.success('Sync direction updated successfully');
    } catch (error) {
      logger.error('Failed to update sync direction:', error);
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
        let message = `Sync completed: ${result.eventsProcessed} events processed`;
        
        if (result.onlineMeetingsCreated > 0) {
          message += `, ${result.onlineMeetingsCreated} Teams meetings created`;
        }
        
        toast.success(message);
        
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
      logger.error('Microsoft sync failed:', error);
      setSyncStatus(prev => ({ ...prev, [integrationId]: 'error' }));
      toast.error('Sync failed unexpectedly');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const authService = MicrosoftAuthService.getInstance();
      await authService.revokeAccess(integrationId);
      await loadIntegrations();
      toast.success('Microsoft Calendar disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect Microsoft Calendar');
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

  const getSyncStatusText = (integration: MicrosoftCalendarIntegration) => {
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
            <span>Loading Microsoft Calendar integrations...</span>
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
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-sm flex items-center justify-center">
                <CalendarIcon className="h-3 w-3 text-white" />
              </div>
              <span>Microsoft Calendar Integration</span>
            </div>
          </CardTitle>
          <CardDescription>
            Connect your Microsoft Calendar and Outlook to sync events with Teams meeting support
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Microsoft Calendar Connected</h3>
              <p className="text-gray-600 mb-4">
                Connect your Microsoft Calendar to automatically sync your events and Teams meetings
              </p>
              <Button onClick={handleConnectMicrosoft}>
                Connect Microsoft Calendar
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  {integrations.length} Microsoft Calendar{integrations.length > 1 ? 's' : ''} connected
                </p>
              </div>
              <Button variant="outline" onClick={handleConnectMicrosoft}>
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
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <span>{integration.calendar_name || 'Microsoft Calendar'}</span>
                    {integration.tenant_id && integration.tenant_id !== 'common' && (
                      <Badge variant="outline" className="text-xs">
                        Work Account
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {getSyncStatusText(integration)}
                    {integration.mailbox_settings?.timeZone && (
                      <span className="ml-2 text-xs text-gray-500">
                        • {integration.mailbox_settings.timeZone}
                      </span>
                    )}
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
            {/* Microsoft-specific features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <VideoIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Teams Integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <UsersIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Attendee Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Category Sync</span>
              </div>
            </div>

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
                    <SelectItem value="import_only">Import Only (Microsoft → Local)</SelectItem>
                    <SelectItem value="export_only">Export Only (Local → Microsoft)</SelectItem>
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
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: calendar.hexColor || '#0078d4' }}
                        />
                        <div>
                          <span className="text-sm font-medium">{calendar.name}</span>
                          <div className="flex items-center space-x-2 mt-1">
                            {calendar.isDefaultCalendar && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                            {calendar.canShare && (
                              <Badge variant="outline" className="text-xs">Shareable</Badge>
                            )}
                            {!calendar.isRemovable && (
                              <Badge variant="outline" className="text-xs">System</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 capitalize">
                          {calendar.canEdit ? 'Read/Write' : 'Read Only'}
                        </span>
                        {calendar.owner && (
                          <div className="text-xs text-gray-400">
                            {calendar.owner.name || calendar.owner.address}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Microsoft-specific settings */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Microsoft-specific Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Include Teams Meetings</label>
                    <p className="text-xs text-gray-500">Automatically create Teams meetings for new events</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Sync Categories</label>
                    <p className="text-xs text-gray-500">Sync Outlook categories as event colors</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Sync Private Events</label>
                    <p className="text-xs text-gray-500">Include private and confidential events</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Auto-accept Invites</label>
                    <p className="text-xs text-gray-500">Automatically accept meeting invitations</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
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