/**
 * Basic Security Settings Component
 * Simple file upload preferences for note-taking app
 * Replaces complex enterprise security module with user-friendly options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Upload, File, Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface BasicSecuritySettingsProps {
  className?: string;
}

interface SecuritySettings {
  // File Size Limits
  maxFileSize: number; // in MB
  
  // Allowed File Types
  allowImages: boolean;
  allowPDFs: boolean;
  allowDocuments: boolean;
  allowArchives: boolean;
  
  // Upload Preferences
  warnLargeFiles: boolean;
  showFilePreview: boolean;
  autoDeleteFailedUploads: boolean;
  
  // Basic Security
  blockExecutableFiles: boolean;
  scanFileNames: boolean;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  maxFileSize: 10, // 10MB default
  allowImages: true,
  allowPDFs: true,
  allowDocuments: true,
  allowArchives: false,
  warnLargeFiles: true,
  showFilePreview: true,
  autoDeleteFailedUploads: true,
  blockExecutableFiles: true,
  scanFileNames: true
};

const BasicSecuritySettings: React.FC<BasicSecuritySettingsProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    if (user?.id) {
      const savedSettings = localStorage.getItem(`basic_security_settings_${user.id}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Failed to parse security settings:', error);
        }
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

  // Save settings
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      // Save to localStorage
      localStorage.setItem(`basic_security_settings_${user.id}`, JSON.stringify(settings));

      toast({
        title: "Security settings saved",
        description: "Your file upload preferences have been updated successfully.",
      });

      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('Failed to save security settings:', error);
      toast({
        title: "Save failed",
        description: "Failed to save security settings. Please try again.",
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

  // Get allowed file types summary
  const getAllowedTypesSummary = useCallback(() => {
    const types = [];
    if (settings.allowImages) types.push('Images');
    if (settings.allowPDFs) types.push('PDFs');
    if (settings.allowDocuments) types.push('Documents');
    if (settings.allowArchives) types.push('Archives');
    
    if (types.length === 0) return 'No file types allowed';
    if (types.length === 4) return 'All file types allowed';
    return types.join(', ');
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
            Configure basic file upload preferences and restrictions
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
              <div className="text-sm font-medium text-gray-700">Allowed Types</div>
              <div className="text-sm text-gray-600">
                {getAllowedTypesSummary()}
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

      {/* Allowed File Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <File className="w-5 h-5" />
            <span>Allowed File Types</span>
          </CardTitle>
          <CardDescription>
            Choose which types of files can be uploaded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Images</Label>
                <p className="text-sm text-gray-500">JPG, PNG, GIF, WebP</p>
              </div>
              <Switch
                checked={settings.allowImages}
                onCheckedChange={(checked) => updateSetting('allowImages', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>PDF Documents</Label>
                <p className="text-sm text-gray-500">PDF files</p>
              </div>
              <Switch
                checked={settings.allowPDFs}
                onCheckedChange={(checked) => updateSetting('allowPDFs', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Documents</Label>
                <p className="text-sm text-gray-500">DOCX, TXT, MD</p>
              </div>
              <Switch
                checked={settings.allowDocuments}
                onCheckedChange={(checked) => updateSetting('allowDocuments', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Archives</Label>
                <p className="text-sm text-gray-500">ZIP, RAR (be careful)</p>
              </div>
              <Switch
                checked={settings.allowArchives}
                onCheckedChange={(checked) => updateSetting('allowArchives', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Preferences</CardTitle>
          <CardDescription>
            Configure how file uploads behave
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show File Preview</Label>
              <p className="text-sm text-gray-500">
                Display a preview of uploaded files when possible
              </p>
            </div>
            <Switch
              checked={settings.showFilePreview}
              onCheckedChange={(checked) => updateSetting('showFilePreview', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-delete Failed Uploads</Label>
              <p className="text-sm text-gray-500">
                Automatically remove files that fail to upload
              </p>
            </div>
            <Switch
              checked={settings.autoDeleteFailedUploads}
              onCheckedChange={(checked) => updateSetting('autoDeleteFailedUploads', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic Security */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Security</CardTitle>
          <CardDescription>
            Simple security measures to protect your account
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Scan File Names</Label>
              <p className="text-sm text-gray-500">
                Check file names for suspicious patterns
              </p>
            </div>
            <Switch
              checked={settings.scanFileNames}
              onCheckedChange={(checked) => updateSetting('scanFileNames', checked)}
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