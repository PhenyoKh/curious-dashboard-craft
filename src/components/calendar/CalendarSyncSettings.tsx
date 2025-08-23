/**
 * Calendar Sync Settings Component - Browser-compatible settings interface
 */

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  SettingsIcon,
  ClockIcon,
  AlertTriangleIcon,
  InfoIcon,
  BarChart3Icon,
  CalendarIcon
} from 'lucide-react';
import { logger } from '@/utils/logger';

export const CalendarSyncSettings: React.FC = () => {
  const { user } = useAuth();

  React.useEffect(() => {
    logger.log('Calendar sync settings in setup mode');
  }, []);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Please log in to configure calendar sync settings
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <span>Sync Settings</span>
          </CardTitle>
          <CardDescription>
            Configure global calendar synchronization preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Calendar sync settings will be available once OAuth integrations are configured.
            </AlertDescription>
          </Alert>

          {/* Disabled Settings Preview */}
          <div className="space-y-4 opacity-50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-sync">Automatic Sync</Label>
                <p className="text-sm text-gray-500">
                  Automatically sync calendar changes every 15 minutes
                </p>
              </div>
              <Switch id="auto-sync" disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="conflict-resolution">Smart Conflict Resolution</Label>
                <p className="text-sm text-gray-500">
                  Automatically resolve conflicts using newest event data
                </p>
              </div>
              <Switch id="conflict-resolution" disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notification">Sync Notifications</Label>
                <p className="text-sm text-gray-500">
                  Get notified when sync operations complete or fail
                </p>
              </div>
              <Switch id="notification" disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3Icon className="h-5 w-5" />
            <span>Sync Statistics</span>
          </CardTitle>
          <CardDescription>
            Overview of calendar synchronization activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No Sync Activity Yet
            </h3>
            <p className="text-gray-600">
              Statistics will appear here once calendar integrations are active
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5" />
            <span>Advanced Settings</span>
          </CardTitle>
          <CardDescription>
            Fine-tune synchronization behavior and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              Advanced settings will include sync frequency, field mapping preferences, 
              timezone handling, and custom conflict resolution rules.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 text-center">
            <Button variant="outline" disabled>
              <SettingsIcon className="w-4 h-4 mr-2" />
              Configure Advanced Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};