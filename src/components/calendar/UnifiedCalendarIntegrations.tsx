/**
 * Unified Calendar Integrations Component - Browser-compatible setup interface
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CalendarIcon, 
  RefreshCwIcon, 
  AlertTriangleIcon, 
  SettingsIcon,
  RefreshCw,
  ClockIcon
} from 'lucide-react';
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';
import { MicrosoftCalendarIntegration } from './MicrosoftCalendarIntegration';
import { CalendarSyncSettings } from './CalendarSyncSettings';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { logger } from '@/utils/logger';

// Browser-compatible types
export interface GoogleIntegration {
  id: string;
  sync_enabled: boolean;
  sync_status: 'setup_required' | 'success' | 'error' | 'pending';
  last_sync_at?: string;
  calendar_name?: string;
  provider: 'google';
}

export interface MicrosoftIntegrationType {
  id: string;
  sync_enabled: boolean;
  sync_status: 'setup_required' | 'success' | 'error' | 'pending';
  last_sync_at?: string;
  calendar_name?: string;
  provider: 'microsoft';
}

export interface SyncConflict {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

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
  
  // Simple state for setup mode
  const [googleIntegrations, setGoogleIntegrations] = useState<GoogleIntegration[]>([]);
  const [microsoftIntegrations, setMicrosoftIntegrations] = useState<MicrosoftIntegrationType[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  
  // Simple stats for setup mode
  const stats: IntegrationStats = {
    totalIntegrations: googleIntegrations.length + microsoftIntegrations.length,
    activeIntegrations: 0, // None active in setup mode
    totalEvents: 0,
    pendingConflicts: 0,
    syncErrors: 0
  };

  // Initialize logging
  React.useEffect(() => {
    logger.log('Unified Calendar Integrations loaded (setup mode)');
  }, []);

  const handleGoogleIntegrationsChange = (integrations: GoogleIntegration[]) => {
    setGoogleIntegrations(integrations);
    logger.log('Google integrations updated', { count: integrations.length });
  };

  const handleMicrosoftIntegrationsChange = (integrations: MicrosoftIntegrationType[]) => {
    setMicrosoftIntegrations(integrations);
    logger.log('Microsoft integrations updated', { count: integrations.length });
  };

  const handleSyncAll = () => {
    logger.log('Sync all requested (setup mode)');
    // In setup mode, this is disabled
  };

  const handleConflictClick = (conflict: SyncConflict) => {
    setSelectedConflict(conflict);
    setShowConflictModal(true);
    logger.log('Conflict modal opened', conflict);
  };

  const handleConflictResolved = () => {
    setShowConflictModal(false);
    setSelectedConflict(null);
    logger.log('Conflict modal closed');
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

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Please log in to configure calendar integrations
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Alert>
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          Calendar integration services are in setup mode. OAuth credentials need to be configured 
          for Google and Microsoft Calendar integration to work properly.
        </AlertDescription>
      </Alert>

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
                disabled={true}
                title="Available when integrations are configured"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
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

      {/* Setup Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5" />
            <span>Integration Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-sm text-gray-600 mb-4">
              Calendar integrations are ready for OAuth configuration. Once configured, you'll be able to:
            </div>
            <div className="space-y-2 text-sm text-gray-600 max-w-md mx-auto">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Sync events bidirectionally between calendars</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Resolve conflicts automatically or manually</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Monitor sync status and statistics</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};