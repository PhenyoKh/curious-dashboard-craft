/**
 * Basic Security Settings Component
 * Essential file upload security for note-taking app
 * Maintains core security while simplifying user experience
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Upload, Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface BasicSecuritySettingsProps {
  className?: string;
}

interface SecuritySettings {
  // File Size Limits
  maxFileSize: number; // in MB
  
  // Basic Security (essential)
  blockExecutableFiles: boolean;
  warnLargeFiles: boolean;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  maxFileSize: 10, // 10MB default
  blockExecutableFiles: true,
  warnLargeFiles: true
};

const BasicSecuritySettings: React.FC<BasicSecuritySettingsProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings from localStorage with error handling
  useEffect(() => {
    if (user?.id) {
      try {
        const savedSettings = localStorage.getItem(`basic_security_settings_${user.id}`);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          // Validate parsed settings have expected structure
          if (typeof parsed === 'object' && parsed !== null) {
            setSettings(prev => ({ ...prev, ...parsed }));
          }
        }
      } catch (error) {
        // Silently fall back to defaults on error
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, [user?.id]);

  // Update setting helper
  const updateSetting = useCallback(<K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // Save settings with proper validation
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      // Validate settings before saving
      if (settings.maxFileSize < 1 || settings.maxFileSize > 50) {
        throw new Error('File size must be between 1MB and 50MB');
      }

      // Save to localStorage
      localStorage.setItem(`basic_security_settings_${user.id}`, JSON.stringify(settings));

      toast({
        title: "Security settings saved",
        description: "Your file upload preferences have been updated successfully.",
      });

      setHasUnsavedChanges(false);

    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save security settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [settings, user?.id]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setHasUnsavedChanges(true);
    toast({
      title: "Settings reset",
      description: "Security settings have been reset to defaults.",
    });
  }, []);

  // Format file size for display
  const formatFileSize = useCallback((sizeInMB: number) => {
    if (sizeInMB >= 1000) {
      return `${(sizeInMB / 1000).toFixed(1)}GB`;
    }
    return `${sizeInMB}MB`;
  }, []);

  // Get security status summary
  const getSecuritySummary = useCallback(() => {
    const features = [];
    if (settings.blockExecutableFiles) features.push('Executable blocking');
    if (settings.warnLargeFiles) features.push('Large file warnings');
    
    return features.length > 0 ? features.join(', ') : 'Basic security';
  }, [settings]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>File Upload Security</span>
          </CardTitle>
          <CardDescription>
            Essential security settings for file uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-700">Maximum File Size</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatFileSize(settings.maxFileSize)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Security Features</div>
              <div className="text-sm text-gray-600">
                {getSecuritySummary()}
              </div>
            </div>
          </div>
          
          {hasUnsavedChanges && (
            <Alert className="mt-4 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                You have unsaved changes. Click "Save Settings" to apply them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* File Size Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>File Size Limits</span>
          </CardTitle>
          <CardDescription>
            Set the maximum file size for uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Maximum File Size</Label>
              <span className="text-sm text-gray-500">{formatFileSize(settings.maxFileSize)}</span>
            </div>
            <Slider
              value={[settings.maxFileSize]}
              onValueChange={(value) => updateSetting('maxFileSize', value[0])}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1MB</span>
              <span>25MB</span>
              <span>50MB</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Warn About Large Files</Label>
              <p className="text-sm text-gray-500">
                Show a warning when uploading files larger than 5MB
              </p>
            </div>
            <Switch
              checked={settings.warnLargeFiles}
              onCheckedChange={(checked) => updateSetting('warnLargeFiles', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Essential Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Essential security measures for file uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Block Executable Files</Label>
              <p className="text-sm text-gray-500">
                Prevent uploading of potentially dangerous file types (.exe, .bat, etc.)
              </p>
            </div>
            <Switch
              checked={settings.blockExecutableFiles}
              onCheckedChange={(checked) => updateSetting('blockExecutableFiles', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={isSaving}
        >
          Reset to Defaults
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasUnsavedChanges}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BasicSecuritySettings;