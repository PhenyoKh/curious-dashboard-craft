/**
 * Editor Preferences Component
 * Configure font preferences, auto-save intervals, and editor behavior
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Type, Save, Keyboard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface EditorPreferencesProps {
  className?: string;
}

interface EditorSettings {
  // Font Settings (simplified)
  fontFamily: string;
  fontSize: number;
  
  // Auto-save Settings
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in seconds
  
  // Editor Behavior (essential only)
  spellCheck: boolean;
  showWordCount: boolean;
}

const EditorPreferences: React.FC<EditorPreferencesProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Development logging only
  if (process.env.NODE_ENV === 'development') {
    console.log('EditorPreferences: Rendered', { userId: user?.id });
  }
  
  const [settings, setSettings] = useState<EditorSettings>({
    // Font Settings (simplified)
    fontFamily: 'Inter',
    fontSize: 16,
    
    // Auto-save Settings
    autoSaveEnabled: true,
    autoSaveInterval: 30,
    
    // Editor Behavior (essential only)
    spellCheck: true,
    showWordCount: true,
  });

  // Get font family CSS value (simplified)
  const getFontFamilyValue = useCallback((fontFamily: string) => {
    const fontMap: Record<string, string> = {
      'Inter': '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      'System': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'Georgia': '"Georgia", "Times New Roman", serif',
      'Monaco': '"Monaco", "Menlo", "Ubuntu Mono", monospace'
    };
    return fontMap[fontFamily] || fontMap['Inter'];
  }, []);

  // Load settings from localStorage with error handling
  useEffect(() => {
    if (user?.id) {
      try {
        const savedSettings = localStorage.getItem(`editor_preferences_${user.id}`);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (typeof parsed === 'object' && parsed !== null) {
            setSettings(prev => ({ ...prev, ...parsed }));
          }
        }
      } catch (error) {
        // Silently fall back to defaults on error
      }
    }
  }, [user?.id]);

  // Apply settings to document (simplified and safer)
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.style.setProperty('--editor-font-family', getFontFamilyValue(settings.fontFamily));
      root.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
    } catch (error) {
      // Silently fail if DOM manipulation fails
    }
  }, [settings.fontFamily, settings.fontSize, getFontFamilyValue]);

  // Save settings with validation
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      // Validate settings
      if (settings.fontSize < 12 || settings.fontSize > 24) {
        throw new Error('Font size must be between 12px and 24px');
      }
      
      if (settings.autoSaveInterval < 5 || settings.autoSaveInterval > 300) {
        throw new Error('Auto-save interval must be between 5 seconds and 5 minutes');
      }

      // Save to localStorage
      localStorage.setItem(`editor_preferences_${user.id}`, JSON.stringify(settings));

      // Apply settings to document
      try {
        const root = document.documentElement;
        root.style.setProperty('--editor-font-family', getFontFamilyValue(settings.fontFamily));
        root.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
      } catch (domError) {
        // DOM manipulation failed, but settings are still saved
      }

      toast({
        title: "Preferences saved",
        description: "Your editor preferences have been saved successfully.",
      });

    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save editor preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [settings, user?.id, getFontFamilyValue]);

  // Update setting helper
  const updateSetting = useCallback(<K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Format auto-save interval display
  const formatInterval = useCallback((seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Font Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Type className="w-5 h-5" />
            <span>Font & Typography</span>
          </CardTitle>
          <CardDescription>
            Customize the appearance of text in the editor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Font Family */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => updateSetting('fontFamily', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter (Default)</SelectItem>
                  <SelectItem value="System">System Font</SelectItem>
                  <SelectItem value="Georgia">Georgia (Serif)</SelectItem>
                  <SelectItem value="Monaco">Monaco (Monospace)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Font Size</Label>
              <span className="text-sm text-gray-500">{settings.fontSize}px</span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={(value) => updateSetting('fontSize', value[0])}
              min={12}
              max={24}
              step={1}
              className="w-full"
            />
          </div>


          {/* Font Preview */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <p 
              className="text-gray-900"
              style={{
                fontFamily: getFontFamilyValue(settings.fontFamily),
                fontSize: `${settings.fontSize}px`
              }}
            >
              The quick brown fox jumps over the lazy dog. This is a preview of how your text will appear in the editor.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-save Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Save className="w-5 h-5" />
            <span>Auto-save & Backup</span>
          </CardTitle>
          <CardDescription>
            Configure automatic saving and backup behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-save Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto-save</Label>
              <p className="text-sm text-gray-500">
                Automatically save your work at regular intervals
              </p>
            </div>
            <Switch
              checked={settings.autoSaveEnabled}
              onCheckedChange={(checked) => updateSetting('autoSaveEnabled', checked)}
            />
          </div>

          {settings.autoSaveEnabled && (
            <>
              {/* Auto-save Interval */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Auto-save Interval</Label>
                  <span className="text-sm text-gray-500">{formatInterval(settings.autoSaveInterval)}</span>
                </div>
                <Slider
                  value={[settings.autoSaveInterval]}
                  onValueChange={(value) => updateSetting('autoSaveInterval', value[0])}
                  min={5}
                  max={300}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>5s</span>
                  <span>1m</span>
                  <span>2m</span>
                  <span>5m</span>
                </div>
              </div>

            </>
          )}
        </CardContent>
      </Card>

      {/* Editor Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5" />
            <span>Editor Options</span>
          </CardTitle>
          <CardDescription>
            Essential editor preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spell Check */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Spell check</Label>
                <p className="text-sm text-gray-500">Highlight misspelled words as you type</p>
              </div>
              <Switch
                checked={settings.spellCheck}
                onCheckedChange={(checked) => updateSetting('spellCheck', checked)}
              />
            </div>

            {/* Show Word Count */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show word count</Label>
                <p className="text-sm text-gray-500">Display word count in the editor</p>
              </div>
              <Switch
                checked={settings.showWordCount}
                onCheckedChange={(checked) => updateSetting('showWordCount', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving}
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
              <span>Save Preferences</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EditorPreferences;