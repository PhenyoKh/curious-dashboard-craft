import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Clock, Settings, CheckCircle } from 'lucide-react';
import { TimezoneService } from '../../services/timezoneService';
import { UserPreferencesService, CalendarSettings } from '../../services/userPreferencesService';
import { useAuth } from '@/hooks/useAuth';

export const TimezoneSettings = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CalendarSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');

  useEffect(() => {
    loadPreferences();
    setDetectedTimezone(TimezoneService.getUserTimezone());
  }, [user?.id, loadPreferences]);

  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const userPrefs = await UserPreferencesService.getUserPreferences(user.id);
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const savePreferences = async () => {
    if (!user?.id || !preferences) return;

    try {
      setSaving(true);
      await UserPreferencesService.updateUserPreferences(user.id, preferences);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof CalendarSettings, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  const detectAndSetTimezone = () => {
    const detected = TimezoneService.getUserTimezone();
    updatePreference('user_timezone', detected);
    setDetectedTimezone(detected);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Timezone & Time Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading preferences...</p>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Timezone & Time Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load preferences.</p>
          <Button onClick={loadPreferences} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const timezoneInfo = TimezoneService.getTimezoneInfo(preferences.user_timezone);
  const isTimezoneDetected = preferences.user_timezone === detectedTimezone;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Timezone & Time Settings
          </CardTitle>
          <CardDescription>
            Configure your timezone preferences for accurate scheduling and time display
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Timezone Info */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Current timezone:</strong> {preferences.user_timezone} ({timezoneInfo.abbreviation})
                  <br />
                  <span className="text-sm text-muted-foreground">
                    UTC{timezoneInfo.offset >= 0 ? '+' : ''}{(timezoneInfo.offset / 60).toFixed(1).replace('.0', '')}
                    {timezoneInfo.isDST && ' (DST active)'}
                  </span>
                </div>
                {!isTimezoneDetected && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={detectAndSetTimezone}
                  >
                    Auto-detect
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Timezone Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timezone" className="text-sm font-medium">
                Timezone
              </Label>
              <Select 
                value={preferences.user_timezone} 
                onValueChange={(value) => updatePreference('user_timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TimezoneService.getPopularTimezones().map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label} {tz.offset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeFormat" className="text-sm font-medium">
                Time Format
              </Label>
              <Select 
                value={preferences.time_format} 
                onValueChange={(value: '12h' | '24h') => updatePreference('time_format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-detection Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoDetect" className="text-sm font-medium">
                Auto-detect timezone
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically update timezone when your location changes
              </p>
            </div>
            <Switch
              id="autoDetect"
              checked={preferences.auto_detect_timezone}
              onCheckedChange={(checked) => updatePreference('auto_detect_timezone', checked)}
            />
          </div>

          {/* Show Timezone in Events */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showTimezone" className="text-sm font-medium">
                Show timezone in events
              </Label>
              <p className="text-sm text-muted-foreground">
                Display timezone abbreviations (EST, PST, etc.) in event times
              </p>
            </div>
            <Switch
              id="showTimezone"
              checked={preferences.show_timezone_in_events}
              onCheckedChange={(checked) => updatePreference('show_timezone_in_events', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Calendar Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Calendar Preferences
          </CardTitle>
          <CardDescription>
            Customize your calendar behavior and default settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weekStart" className="text-sm font-medium">
                Week starts on
              </Label>
              <Select 
                value={preferences.week_starts_on} 
                onValueChange={(value: 'sunday' | 'monday') => updatePreference('week_starts_on', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="defaultView" className="text-sm font-medium">
                Default calendar view
              </Label>
              <Select 
                value={preferences.default_view} 
                onValueChange={(value: 'day' | 'week' | 'month') => updatePreference('default_view', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventDuration" className="text-sm font-medium">
                Default event duration (minutes)
              </Label>
              <Input
                id="eventDuration"
                type="number"
                min="15"
                max="480"
                step="15"
                value={preferences.default_event_duration}
                onChange={(e) => updatePreference('default_event_duration', parseInt(e.target.value) || 60)}
              />
            </div>

            <div>
              <Label htmlFor="reminderMinutes" className="text-sm font-medium">
                Default reminder (minutes before)
              </Label>
              <Input
                id="reminderMinutes"
                type="number"
                min="0"
                max="1440"
                step="5"
                value={preferences.default_reminder_minutes}
                onChange={(e) => updatePreference('default_reminder_minutes', parseInt(e.target.value) || 15)}
              />
            </div>
          </div>

          {/* Show Weekends Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showWeekends" className="text-sm font-medium">
                Show weekends in calendar
              </Label>
              <p className="text-sm text-muted-foreground">
                Display Saturday and Sunday in calendar views
              </p>
            </div>
            <Switch
              id="showWeekends"
              checked={preferences.show_weekends}
              onCheckedChange={(checked) => updatePreference('show_weekends', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {saveSuccess && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Settings saved successfully!</span>
          </div>
        )}
        <Button 
          onClick={savePreferences} 
          disabled={saving}
          className="min-w-24"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};