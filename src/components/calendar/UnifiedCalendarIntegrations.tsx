/**
 * Unified Calendar Integrations Component - Browser-compatible setup interface
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarIcon, 
  SettingsIcon
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
      {/* Simple Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold flex items-center justify-center space-x-2 mb-2">
          <CalendarIcon className="h-6 w-6" />
          <span>Connect Your Calendars</span>
        </h2>
        <p className="text-gray-600">
          Sync your events across Google Calendar and Microsoft Calendar
        </p>
      </div>

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

    </div>
  );
};