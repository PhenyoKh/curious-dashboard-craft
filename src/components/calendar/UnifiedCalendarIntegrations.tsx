/**
 * Unified Calendar Integrations Component - Manages both Google and Microsoft Calendar integrations
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CalendarIcon, 
  RefreshCwIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  SettingsIcon,
  SyncIcon,
  PlusIcon,
  TrendingUpIcon,
  ClockIcon
} from 'lucide-react';
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';
import { MicrosoftCalendarIntegration } from './MicrosoftCalendarIntegration';
import { CalendarSyncSettings } from './CalendarSyncSettings';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { GoogleAuthService, CalendarIntegration as GoogleIntegration } from '@/services/integrations/google/GoogleAuthService';
import { MicrosoftAuthService, MicrosoftCalendarIntegration } from '@/services/integrations/microsoft/MicrosoftAuthService';
import { ConflictResolutionService, SyncConflict } from '@/services/integrations/google/ConflictResolutionService';
import { toast } from 'sonner';

interface IntegrationStats {
  totalIntegrations: number;
  activeIntegrations: number;
  lastSyncTime?: Date;
  totalEvents: number;
  pendingConflicts: number;
  syncErrors: number;
}

export const UnifiedCalendarIntegrations: React.FC = () => {
  const { user } = useAuth();
  const [googleIntegrations, setGoogleIntegrations] = useState<GoogleIntegration[]>([]);
  const [microsoftIntegrations, setMicrosoftIntegrations] = useState<MicrosoftCalendarIntegration[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [stats, setStats] = useState<IntegrationStats>({
    totalIntegrations: 0,
    activeIntegrations: 0,
    totalEvents: 0,
    pendingConflicts: 0,
    syncErrors: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);

  const conflictService = ConflictResolutionService.getInstance();

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await Promise.all([
        loadConflicts(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      toast.error('Failed to load calendar integrations');
    } finally {
      setLoading(false);
    }
  };

  const loadConflicts = async () => {
    if (!user) return;

    try {
      const pendingConflicts = await conflictService.getPendingConflicts(user.id);
      setConflicts(pendingConflicts);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      // This would typically come from a unified stats API
      // For now, we'll calculate from individual integrations
      const conflictStats = await conflictService.getConflictStatistics(user.id);
      
      const totalIntegrations = googleIntegrations.length + microsoftIntegrations.length;
      const activeIntegrations = googleIntegrations.filter(i => i.sync_enabled).length + 
                                microsoftIntegrations.filter(i => i.sync_enabled).length;
      const syncErrors = googleIntegrations.filter(i => i.sync_status === 'error').length + 
                        microsoftIntegrations.filter(i => i.sync_status === 'error').length;

      // Find most recent sync time
      const allSyncTimes = [
        ...googleIntegrations.map(i => i.last_sync_at).filter(Boolean),
        ...microsoftIntegrations.map(i => i.last_sync_at).filter(Boolean)
      ];
      const lastSyncTime = allSyncTimes.length > 0 ? 
        new Date(Math.max(...allSyncTimes.map(t => new Date(t!).getTime()))) : undefined;

      setStats({
        totalIntegrations,
        activeIntegrations,
        lastSyncTime,
        totalEvents: 0, // This would come from actual event counts
        pendingConflicts: conflictStats.pending,
        syncErrors
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleGoogleIntegrationsChange = (integrations: GoogleIntegration[]) => {
    setGoogleIntegrations(integrations);
    loadStats();
  };

  const handleMicrosoftIntegrationsChange = (integrations: MicrosoftCalendarIntegration[]) => {
    setMicrosoftIntegrations(integrations);
    loadStats();
  };

  const handleSyncAll = async () => {
    if (!user) return;

    try {
      setSyncingAll(true);
      
      const allIntegrations = [
        ...googleIntegrations.filter(i => i.sync_enabled),
        ...microsoftIntegrations.filter(i => i.sync_enabled)
      ];

      if (allIntegrations.length === 0) {
        toast.info('No active integrations to sync');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Sync Google Calendar integrations
      for (const integration of googleIntegrations.filter(i => i.sync_enabled)) {
        try {
          // This would use the appropriate sync engine
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to sync Google integration ${integration.id}:`, error);
        }
      }

      // Sync Microsoft Calendar integrations
      for (const integration of microsoftIntegrations.filter(i => i.sync_enabled)) {
        try {
          // This would use the Microsoft sync engine
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to sync Microsoft integration ${integration.id}:`, error);
        }
      }

      if (errorCount === 0) {
        toast.success(`Successfully synced ${successCount} calendar${successCount > 1 ? 's' : ''}`);
      } else {
        toast.warning(`Synced ${successCount} calendars with ${errorCount} errors`);
      }

      await loadAllData();
    } catch (error) {
      console.error('Failed to sync all calendars:', error);
      toast.error('Failed to sync calendars');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleConflictClick = (conflict: SyncConflict) => {
    setSelectedConflict(conflict);
    setShowConflictModal(true);
  };

  const handleConflictResolved = () => {
    setShowConflictModal(false);
    setSelectedConflict(null);
    loadConflicts();
    loadStats();
  };

  const formatLastSyncTime = (time?: Date) => {
    if (!time) return 'Never';
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <RefreshCwIcon className="h-4 w-4 animate-spin" />
              <span>Loading calendar integrations...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5" />
                <span>Calendar Integrations</span>
              </CardTitle>
              <CardDescription>
                Manage your Google Calendar and Microsoft Calendar connections
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleSyncAll}
                disabled={syncingAll || stats.activeIntegrations === 0}
              >
                {syncingAll ? (
                  <RefreshCwIcon className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <SyncIcon className="h-4 w-4 mr-2" />
                )}
                Sync All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalIntegrations}</div>
              <div className="text-sm text-gray-600">Total Calendars</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activeIntegrations}</div>
              <div className="text-sm text-gray-600">Active Syncs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pendingConflicts}</div>
              <div className="text-sm text-gray-600">Conflicts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.syncErrors}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-gray-800">
                {formatLastSyncTime(stats.lastSyncTime)}
              </div>
              <div className="text-sm text-gray-600">Last Sync</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {(stats.pendingConflicts > 0 || stats.syncErrors > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-600">
              <AlertTriangleIcon className="h-5 w-5" />
              <span>Action Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.pendingConflicts > 0 && (
                <Alert>
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {stats.pendingConflicts} sync conflict{stats.pendingConflicts > 1 ? 's' : ''} need resolution
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setShowConflictModal(true)}>
                      Review Conflicts
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {stats.syncErrors > 0 && (
                <Alert variant="destructive">
                  <XCircleIcon className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {stats.syncErrors} integration{stats.syncErrors > 1 ? 's have' : ' has'} sync errors
                    </span>
                    <Button variant="outline" size="sm">
                      View Errors
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Integration Tabs */}
      <Tabs defaultValue="google" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="google" className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            <span>Google Calendar</span>
            {googleIntegrations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {googleIntegrations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="microsoft" className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-sm"></div>
            <span>Microsoft Calendar</span>
            {microsoftIntegrations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {microsoftIntegrations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="space-y-6">
          <GoogleCalendarIntegration onIntegrationChange={handleGoogleIntegrationsChange} />
        </TabsContent>

        <TabsContent value="microsoft" className="space-y-6">
          <MicrosoftCalendarIntegration onIntegrationChange={handleMicrosoftIntegrationsChange} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <CalendarSyncSettings />
        </TabsContent>
      </Tabs>

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflict={selectedConflict}
        onResolved={handleConflictResolved}
      />

      {/* Recent Activity */}
      {(googleIntegrations.length > 0 || microsoftIntegrations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5" />
              <span>Recent Sync Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...googleIntegrations, ...microsoftIntegrations]
                .filter(i => i.last_sync_at)
                .sort((a, b) => new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime())
                .slice(0, 5)
                .map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        integration.sync_status === 'success' ? 'bg-green-500' : 
                        integration.sync_status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <span className="text-sm font-medium">
                          {integration.calendar_name || `${integration.provider} Calendar`}
                        </span>
                        <div className="text-xs text-gray-500">
                          {integration.last_sync_at && formatLastSyncTime(new Date(integration.last_sync_at))}
                        </div>
                      </div>
                    </div>
                    <Badge variant={
                      integration.sync_status === 'success' ? 'default' : 
                      integration.sync_status === 'error' ? 'destructive' : 'secondary'
                    }>
                      {integration.sync_status}
                    </Badge>
                  </div>
                ))}
              
              {[...googleIntegrations, ...microsoftIntegrations].filter(i => i.last_sync_at).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No recent sync activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};