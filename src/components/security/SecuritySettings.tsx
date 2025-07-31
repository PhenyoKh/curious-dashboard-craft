/**
 * Security Settings Component for Scola
 * Integrates with the existing Settings modal as a new tab
 */

import React, { useState } from 'react';
import { 
  Shield, 
  HardDrive, 
  AlertTriangle, 
  FileX, 
  Settings,
  Eye,
  EyeOff,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { useQuarantine } from '@/hooks/useQuarantine';
import { SecurityLevel } from '@/lib/security/FileSecurityValidator';

const SecuritySettings: React.FC = () => {
  const {
    settings,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    error,
    lastSaved,
    updateSettings,
    saveSettings,
    resetToDefaults,
    applySecurityPreset,
    addAllowedExtension,
    removeAllowedExtension,
    addBlockedExtension,
    removeBlockedExtension,
    addCustomPattern,
    removeCustomPattern,
    validateSettings
  } = useSecuritySettings({ autoSave: true, saveDelay: 2000 });

  const {
    stats,
    cleanupExpired,
    loadStats
  } = useQuarantine({ autoRefresh: true });

  const [newExtension, setNewExtension] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getSecurityLevelColor = (level: SecurityLevel): string => {
    switch (level) {
      case SecurityLevel.STRICT: return 'text-red-600 bg-red-50 border-red-200';
      case SecurityLevel.BALANCED: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case SecurityLevel.PERMISSIVE: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getSecurityLevelDescription = (level: SecurityLevel): string => {
    switch (level) {
      case SecurityLevel.STRICT: 
        return 'Maximum security - blocks all potentially risky files';
      case SecurityLevel.BALANCED: 
        return 'Recommended - balances security with usability';
      case SecurityLevel.PERMISSIVE: 
        return 'Minimal restrictions - allows most file types';
    }
  };

  const addExtension = (type: 'allowed' | 'blocked') => {
    if (!newExtension.trim()) return;
    
    const extension = newExtension.trim().toLowerCase().replace(/^\./, '');
    
    if (type === 'allowed') {
      addAllowedExtension(extension);
    } else {
      addBlockedExtension(extension);
    }
    
    setNewExtension('');
  };

  const addPattern = () => {
    if (!newPattern.trim()) return;
    
    addCustomPattern(newPattern.trim());
    setNewPattern('');
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-900">Security Status</h3>
            <p className="text-sm text-gray-600">
              Level: <Badge className={getSecurityLevelColor(settings.security_level)}>
                {settings.security_level.toUpperCase()}
              </Badge>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-orange-600">
              Unsaved Changes
            </Badge>
          )}
          {isSaving && (
            <Badge variant="secondary" className="text-blue-600">
              Saving...
            </Badge>
          )}
          {lastSaved && (
            <p className="text-xs text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="files">File Types</TabsTrigger>
          <TabsTrigger value="quarantine">Quarantine</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Level</CardTitle>
              <CardDescription>
                Choose your security stance for file uploads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(SecurityLevel).map((level) => (
                  <div
                    key={level}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      settings.security_level === level
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => applySecurityPreset(level)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{level}</h4>
                      {settings.security_level === level && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {getSecurityLevelDescription(level)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Limits</CardTitle>
              <CardDescription>
                Configure file size and processing limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="max-file-size">Maximum File Size</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="max-file-size"
                    type="number"
                    value={Math.round(settings.max_file_size / (1024 * 1024))}
                    onChange={(e) => updateSettings({
                      max_file_size: parseInt(e.target.value) * 1024 * 1024
                    })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">MB</span>
                  <span className="text-xs text-gray-500 ml-2">
                    Current: {formatFileSize(settings.max_file_size)}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="archive-depth">Maximum Archive Depth</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="archive-depth"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.max_archive_depth}
                    onChange={(e) => updateSettings({
                      max_archive_depth: parseInt(e.target.value)
                    })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">levels</span>
                </div>
              </div>

              <div>
                <Label htmlFor="compression-ratio">Maximum Compression Ratio</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="compression-ratio"
                    type="number"
                    min="10"
                    max="10000"
                    value={settings.max_compression_ratio}
                    onChange={(e) => updateSettings({
                      max_compression_ratio: parseInt(e.target.value)
                    })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">:1</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Features</CardTitle>
              <CardDescription>
                Enable or disable specific security checks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="heuristic-scanning">Heuristic Scanning</Label>
                  <p className="text-sm text-gray-600">Detect threats using behavioral analysis</p>
                </div>
                <Switch
                  id="heuristic-scanning"
                  checked={settings.enable_heuristic_scanning}
                  onCheckedChange={(checked) => updateSettings({
                    enable_heuristic_scanning: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="archive-scanning">Archive Scanning</Label>
                  <p className="text-sm text-gray-600">Scan inside ZIP, RAR, and other archives</p>
                </div>
                <Switch
                  id="archive-scanning"
                  checked={settings.enable_archive_scanning}
                  onCheckedChange={(checked) => updateSettings({
                    enable_archive_scanning: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="image-validation">Image Validation</Label>
                  <p className="text-sm text-gray-600">Verify image file integrity and detect polyglots</p>
                </div>
                <Switch
                  id="image-validation"
                  checked={settings.enable_image_validation}
                  onCheckedChange={(checked) => updateSettings({
                    enable_image_validation: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-quarantine">Auto-Quarantine Suspicious Files</Label>
                  <p className="text-sm text-gray-600">Automatically quarantine detected threats</p>
                </div>
                <Switch
                  id="auto-quarantine"
                  checked={settings.auto_quarantine_suspicious}
                  onCheckedChange={(checked) => updateSettings({
                    auto_quarantine_suspicious: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="threat-notifications">Threat Notifications</Label>
                  <p className="text-sm text-gray-600">Show alerts when threats are detected</p>
                </div>
                <Switch
                  id="threat-notifications"
                  checked={settings.notify_on_threats}
                  onCheckedChange={(checked) => updateSettings({
                    notify_on_threats: checked
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Types */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Allowed File Extensions</CardTitle>
              <CardDescription>
                File types that are permitted for upload
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {settings.allowed_extensions.map((ext) => (
                  <Badge key={ext} variant="secondary" className="text-green-700">
                    .{ext}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0"
                      onClick={() => removeAllowedExtension(ext)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Input
                  placeholder="Add extension (e.g., pdf)"
                  value={newExtension}
                  onChange={(e) => setNewExtension(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addExtension('allowed')}
                />
                <Button 
                  onClick={() => addExtension('allowed')}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blocked File Extensions</CardTitle>
              <CardDescription>
                File types that are blocked for security reasons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {settings.blocked_extensions.map((ext) => (
                  <Badge key={ext} variant="destructive">
                    .{ext}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0 text-red-100 hover:text-red-200"
                      onClick={() => removeBlockedExtension(ext)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Input
                  placeholder="Add extension (e.g., exe)"
                  value={newExtension}
                  onChange={(e) => setNewExtension(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addExtension('blocked')}
                />
                <Button 
                  onClick={() => addExtension('blocked')}
                  size="sm"
                  variant="destructive"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarantine Management */}
        <TabsContent value="quarantine" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quarantine Statistics</CardTitle>
              <CardDescription>
                Overview of quarantined files and storage usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.total_files}</p>
                    <p className="text-sm text-gray-600">Total Files</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {formatFileSize(stats.total_size)}
                    </p>
                    <p className="text-sm text-gray-600">Total Size</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.recent_quarantines}</p>
                    <p className="text-sm text-gray-600">Last 24h</p>
                  </div>
                  <div className="text-center">
                    <Button
                      onClick={cleanupExpired}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cleanup
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Loading quarantine statistics...
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quarantine Settings</CardTitle>
              <CardDescription>
                Configure automatic quarantine behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="retention-days">Retention Period</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="retention-days"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.quarantine_retention_days}
                    onChange={(e) => updateSettings({
                      quarantine_retention_days: parseInt(e.target.value)
                    })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">days</span>
                  <span className="text-xs text-gray-500 ml-2">
                    Files are automatically deleted after this period
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Security Patterns</CardTitle>
              <CardDescription>
                Define custom regex patterns for threat detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {settings.custom_patterns.map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <code className="text-sm font-mono">{pattern}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomPattern(pattern)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter regex pattern"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPattern()}
                  className="font-mono"
                />
                <Button onClick={addPattern} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
              <CardDescription>
                Configure how long security data is kept
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="log-retention">Security Log Retention</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="log-retention"
                    type="number"
                    min="7"
                    max="730"
                    value={settings.log_retention_days}
                    onChange={(e) => updateSettings({
                      log_retention_days: parseInt(e.target.value)
                    })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reset Settings</CardTitle>
              <CardDescription>
                Restore all security settings to their default values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will reset all your security settings to defaults. This action cannot be undone.
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={resetToDefaults}
                variant="destructive"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => loadStats()}
        >
          Refresh
        </Button>
        <Button
          onClick={() => saveSettings()}
          disabled={isSaving || !hasUnsavedChanges}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default SecuritySettings;