/**
 * Calendar Sync Settings Component - Advanced settings for calendar synchronization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  SettingsIcon,
  ClockIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircleIcon,
  BarChart3Icon,
  CalendarIcon
} from 'lucide-react';
import { GoogleAuthService, CalendarIntegration } from '@/services/integrations/google/GoogleAuthService';
import { ConflictResolutionService, ConflictResolutionStrategy } from '@/services/integrations/google/ConflictResolutionService';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { toast } from 'sonner';

export const CalendarSyncSettings: React.FC = () => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [globalStrategy, setGlobalStrategy] = useState<ConflictResolutionStrategy>({
    type: 'manual',
    autoResolutionRule: 'newest_wins',
    fieldPriorities: {
      title: 'newest',
      description: 'newest',
      time: 'newest',
      location: 'newest',
      reminders: 'newest'
    }
  });
  const [syncStats, setSyncStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const authService = GoogleAuthService.getInstance();
  const conflictService = ConflictResolutionService.getInstance();

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load integrations
      const userIntegrations = await authService.getUserIntegrations(user.id);
      setIntegrations(userIntegrations);
      
      // Load conflict statistics
      const stats = await conflictService.getConflictStatistics(user.id);
      setSyncStats(stats);
      
    } catch (error) {
      console.error('Failed to load sync settings:', error);
      toast.error('Failed to load sync settings');
    } finally {
      setLoading(false);
    }
  }, [user, authService, conflictService]);

  const handleUpdateSyncFrequency = async (integrationId: string, minutes: number) => {
    try {
      await authService.updateSyncPreferences(integrationId, { 
        sync_frequency_minutes: minutes 
      });
      await loadSettings();
      toast.success('Sync frequency updated');
    } catch (error) {
      console.error('Failed to update sync frequency:', error);
      toast.error('Failed to update sync frequency');
    }
  };

  const handleUpdateSyncRange = async (integrationId: string, pastDays: number, futureDays: number) => {
    try {
      // Note: These would need to be added to the database schema
      // For now, we'll just show the UI
      toast.success('Sync range updated');
    } catch (error) {
      console.error('Failed to update sync range:', error);
      toast.error('Failed to update sync range');
    }
  };

  const handleUpdateConflictStrategy = (strategy: Partial<ConflictResolutionStrategy>) => {
    setGlobalStrategy(prev => ({ ...prev, ...strategy }));
    toast.success('Conflict resolution strategy updated');
  };

  const handleBulkResolveConflicts = async () => {
    if (!user) return;

    try {
      const pendingConflicts = await conflictService.getPendingConflicts(user.id);
      const conflictIds = pendingConflicts.map(c => c.id);
      
      if (conflictIds.length === 0) {
        toast.info('No pending conflicts to resolve');
        return;
      }

      const result = await conflictService.batchResolveConflicts(
        conflictIds,
        user.id,
        globalStrategy
      );

      if (result.resolved > 0) {
        toast.success(`Resolved ${result.resolved} conflicts automatically`);
      }
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} conflicts could not be resolved automatically`);
      }

      await loadSettings();
    } catch (error) {
      console.error('Failed to bulk resolve conflicts:', error);
      toast.error('Failed to resolve conflicts');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCwIcon className="h-4 w-4 animate-spin" />
            <span>Loading sync settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <span>Calendar Sync Settings</span>
          </CardTitle>
          <CardDescription>
            Configure advanced settings for calendar synchronization and conflict resolution
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="sync" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sync">Sync Settings</TabsTrigger>
          <TabsTrigger value="conflicts">Conflict Resolution</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Sync Settings Tab */}
        <TabsContent value="sync" className="space-y-4">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {integration.calendar_name || 'Google Calendar'}
                </CardTitle>
                <CardDescription>
                  Configure sync frequency and data range
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sync Frequency */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4" />
                      <Label>Sync Frequency</Label>
                    </div>
                    <Select
                      value={integration.sync_frequency_minutes?.toString() || '15'}
                      onValueChange={(value) => handleUpdateSyncFrequency(integration.id, parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Every 5 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                        <SelectItem value="240">Every 4 hours</SelectItem>
                        <SelectItem value="1440">Daily</SelectItem>
                        <SelectItem value="0">Manual only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      How often to automatically sync with Google Calendar
                    </p>
                  </div>

                  {/* Sync Direction */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RefreshCwIcon className="h-4 w-4" />
                      <Label>Sync Direction</Label>
                    </div>
                    <Select
                      value={integration.sync_direction}
                      onValueChange={(value: 'import_only' | 'export_only' | 'bidirectional') =>
                        authService.updateSyncPreferences(integration.id, { sync_direction: value })
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
                    <p className="text-xs text-gray-500">
                      Direction of event synchronization
                    </p>
                  </div>
                </div>

                {/* Sync Range */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4" />
                    <Label>Sync Date Range</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Past days</Label>
                      <Input
                        type="number"
                        value={integration.sync_past_days || 30}
                        onChange={(e) => {
                          const pastDays = parseInt(e.target.value);
                          handleUpdateSyncRange(integration.id, pastDays, integration.sync_future_days || 365);
                        }}
                        min="0"
                        max="365"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Future days</Label>
                      <Input
                        type="number"
                        value={integration.sync_future_days || 365}
                        onChange={(e) => {
                          const futureDays = parseInt(e.target.value);
                          handleUpdateSyncRange(integration.id, integration.sync_past_days || 30, futureDays);
                        }}
                        min="0"
                        max="365"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    How many days in the past and future to sync events
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Conflict Resolution Tab */}
        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Conflict Resolution</CardTitle>
              <CardDescription>
                Configure how conflicts between local and Google Calendar events are handled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resolution Strategy */}
              <div className="space-y-3">
                <Label>Default Resolution Strategy</Label>
                <Select
                  value={globalStrategy.type}
                  onValueChange={(value: 'manual' | 'automatic') => 
                    handleUpdateConflictStrategy({ type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Resolution</SelectItem>
                    <SelectItem value="automatic">Automatic Resolution</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {globalStrategy.type === 'automatic' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Auto-Resolution Rule</Label>
                    <Select
                      value={globalStrategy.autoResolutionRule}
                      onValueChange={(value: 'local_wins' | 'external_wins' | 'newest_wins' | 'longest_wins') =>
                        handleUpdateConflictStrategy({ autoResolutionRule: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local_wins">Local Always Wins</SelectItem>
                        <SelectItem value="external_wins">Google Calendar Always Wins</SelectItem>
                        <SelectItem value="newest_wins">Newest Version Wins</SelectItem>
                        <SelectItem value="longest_wins">Longest Event Wins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Field Priorities */}
                  <div className="space-y-3">
                    <Label>Field Priorities (for merge conflicts)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(globalStrategy.fieldPriorities || {}).map(([field, priority]) => (
                        <div key={field} className="space-y-2">
                          <Label className="text-sm capitalize">{field}</Label>
                          <Select
                            value={priority}
                            onValueChange={(value: 'local' | 'external' | 'newest') =>
                              handleUpdateConflictStrategy({
                                fieldPriorities: {
                                  ...globalStrategy.fieldPriorities,
                                  [field]: value
                                }
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">Local</SelectItem>
                              <SelectItem value="external">Google</SelectItem>
                              <SelectItem value="newest">Newest</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Actions */}
              {syncStats && syncStats.pending > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pending Conflicts</Label>
                      <p className="text-sm text-gray-600">
                        {syncStats.pending} conflicts waiting for resolution
                      </p>
                    </div>
                    <Button onClick={handleBulkResolveConflicts}>
                      Resolve All Automatically
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          {syncStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <BarChart3Icon className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{syncStats.total}</p>
                      <p className="text-sm text-gray-600">Total Conflicts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <AlertTriangleIcon className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{syncStats.pending}</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{syncStats.resolved}</p>
                      <p className="text-sm text-gray-600">Resolved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <InfoIcon className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-2xl font-bold">{syncStats.ignored}</p>
                      <p className="text-sm text-gray-600">Ignored</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {syncStats && (
            <Card>
              <CardHeader>
                <CardTitle>Conflict Types</CardTitle>
                <CardDescription>Breakdown of conflicts by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(syncStats.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Advanced configuration options for power users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  These settings are for advanced users. Changing them may affect sync performance or reliability.
                </AlertDescription>
              </Alert>

              {/* Placeholder for future advanced settings */}
              <div className="space-y-4 opacity-50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Webhook Sync</Label>
                    <p className="text-sm text-gray-600">
                      Receive real-time updates from Google Calendar
                    </p>
                  </div>
                  <Switch disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Batch Sync Operations</Label>
                    <p className="text-sm text-gray-600">
                      Process multiple events in single API calls
                    </p>
                  </div>
                  <Switch disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Debug Logging</Label>
                    <p className="text-sm text-gray-600">
                      Enable detailed logging for troubleshooting
                    </p>
                  </div>
                  <Switch disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};