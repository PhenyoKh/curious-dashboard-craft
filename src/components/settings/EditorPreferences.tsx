/**
 * Editor Preferences Component
 * Configure font preferences, auto-save intervals, and editor behavior
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Type, Clock, Save, Eye, Keyboard, CheckSquare, Sparkles } from 'lucide-react';
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
  // Font Settings
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
  
  // Auto-save Settings
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in seconds
  saveOnFocusLoss: boolean;
  
  // Editor Behavior
  autoCapitalize: boolean;
  spellCheck: boolean;
  wrapText: boolean;
  
  // Visual Settings
  showLineNumbers: boolean;
  showWordCount: boolean;
  showCharacterCount: boolean;
  highlightCurrentLine: boolean;
  
  // Focus Settings
  highContrast: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
}

const EditorPreferences: React.FC<EditorPreferencesProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Add debug logging
  console.log('🔧 EditorPreferences: Component rendered', { userId: user?.id, className });
  
  const [settings, setSettings] = useState<EditorSettings>({
    // Font Settings
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 1.6,
    fontWeight: 'normal',
    
    // Auto-save Settings
    autoSaveEnabled: true,
    autoSaveInterval: 30,
    saveOnFocusLoss: true,
    
    // Editor Behavior
    autoCapitalize: true,
    spellCheck: true,
    wrapText: true,
    
    // Visual Settings
    showLineNumbers: false,
    showWordCount: true,
    showCharacterCount: true,
    highlightCurrentLine: false,
    
    // Focus Settings
    highContrast: false,
    focusMode: false,
    typewriterMode: false,
  });

  // Get font family CSS value
  const getFontFamilyValue = useCallback((fontFamily: string) => {
    const fontMap: Record<string, string> = {
      'Inter': '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      'System': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'Georgia': '"Georgia", "Times New Roman", serif',
      'Times': '"Times New Roman", Times, serif',
      'Helvetica': '"Helvetica Neue", Helvetica, Arial, sans-serif',
      'Monaco': '"Monaco", "Menlo", "Ubuntu Mono", monospace',
      'Fira Code': '"Fira Code", "Monaco", "Menlo", monospace',
      'Source Sans': '"Source Sans Pro", sans-serif',
      'Merriweather': '"Merriweather", Georgia, serif',
      'Open Sans': '"Open Sans", sans-serif',
      'Roboto': '"Roboto", Arial, sans-serif'
    };
    return fontMap[fontFamily] || fontMap['Inter'];
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    try {
      console.log('🔧 EditorPreferences: Loading settings from localStorage', { userId: user?.id });
      if (user?.id) {
        const savedSettings = localStorage.getItem(`editor_preferences_${user.id}`);
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            console.log('🔧 EditorPreferences: Parsed settings successfully', parsed);
            setSettings(prev => ({ ...prev, ...parsed }));
          } catch (error) {
            console.error('🔧 EditorPreferences: Failed to parse editor settings:', error);
          }
        } else {
          console.log('🔧 EditorPreferences: No saved settings found, using defaults');
        }
      }
    } catch (error) {
      console.error('🔧 EditorPreferences: Error in settings loading useEffect:', error);
    }
  }, [user?.id]);

  // Apply settings to document whenever settings change
  useEffect(() => {
    try {
      console.log('🔧 EditorPreferences: Applying settings to DOM', {
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        fontWeight: settings.fontWeight
      });
      const root = document.documentElement;
      root.style.setProperty('--editor-font-family', getFontFamilyValue(settings.fontFamily));
      root.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
      root.style.setProperty('--editor-line-height', settings.lineHeight.toString());
      root.style.setProperty('--editor-font-weight', settings.fontWeight);
      console.log('🔧 EditorPreferences: DOM settings applied successfully');
    } catch (error) {
      console.error('🔧 EditorPreferences: Error applying settings to DOM:', error);
    }
  }, [settings.fontFamily, settings.fontSize, settings.lineHeight, settings.fontWeight, getFontFamilyValue]);

  // Save settings
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      // Save to localStorage
      localStorage.setItem(`editor_preferences_${user.id}`, JSON.stringify(settings));

      // Apply settings to document for immediate preview
      const root = document.documentElement;
      root.style.setProperty('--editor-font-family', getFontFamilyValue(settings.fontFamily));
      root.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
      root.style.setProperty('--editor-line-height', settings.lineHeight.toString());
      root.style.setProperty('--editor-font-weight', settings.fontWeight);

      toast({
        title: "Preferences saved",
        description: "Your editor preferences have been saved successfully.",
      });

    } catch (error) {
      console.error('Failed to save editor preferences:', error);
      toast({
        title: "Save failed",
        description: "Failed to save editor preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [settings, user?.id]);

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
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Times">Times New Roman</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Monaco">Monaco (Monospace)</SelectItem>
                  <SelectItem value="Fira Code">Fira Code (Monospace)</SelectItem>
                  <SelectItem value="Source Sans">Source Sans Pro</SelectItem>
                  <SelectItem value="Merriweather">Merriweather</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Font Weight</Label>
              <Select
                value={settings.fontWeight}
                onValueChange={(value) => updateSetting('fontWeight', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="semibold">Semi Bold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
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

          {/* Line Height */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Height</Label>
              <span className="text-sm text-gray-500">{settings.lineHeight}</span>
            </div>
            <Slider
              value={[settings.lineHeight]}
              onValueChange={(value) => updateSetting('lineHeight', value[0])}
              min={1.0}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Font Preview */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <p 
              className="text-gray-900"
              style={{
                fontFamily: getFontFamilyValue(settings.fontFamily),
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                fontWeight: settings.fontWeight
              }}
            >
              The quick brown fox jumps over the lazy dog. This is a preview of how your text will appear in the editor with the current font settings.
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

              {/* Save on Focus Loss */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Save when leaving editor</Label>
                  <p className="text-sm text-gray-500">
                    Save automatically when you click outside the editor
                  </p>
                </div>
                <Switch
                  checked={settings.saveOnFocusLoss}
                  onCheckedChange={(checked) => updateSetting('saveOnFocusLoss', checked)}
                />
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
            <span>Editor Behavior</span>
          </CardTitle>
          <CardDescription>
            Configure basic typing and editing options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto-capitalize */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-capitalize sentences</Label>
                <p className="text-sm text-gray-500">Automatically capitalize the first letter of sentences</p>
              </div>
              <Switch
                checked={settings.autoCapitalize}
                onCheckedChange={(checked) => updateSetting('autoCapitalize', checked)}
              />
            </div>

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

            {/* Text Wrapping */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Wrap text</Label>
                <p className="text-sm text-gray-500">Wrap long lines to fit the editor width</p>
              </div>
              <Switch
                checked={settings.wrapText}
                onCheckedChange={(checked) => updateSetting('wrapText', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Visual Settings</span>
          </CardTitle>
          <CardDescription>
            Customize the visual appearance of the editor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Show Line Numbers */}
            <div className="flex items-center justify-between">
              <Label>Show line numbers</Label>
              <Switch
                checked={settings.showLineNumbers}
                onCheckedChange={(checked) => updateSetting('showLineNumbers', checked)}
              />
            </div>

            {/* Show Word Count */}
            <div className="flex items-center justify-between">
              <Label>Show word count</Label>
              <Switch
                checked={settings.showWordCount}
                onCheckedChange={(checked) => updateSetting('showWordCount', checked)}
              />
            </div>

            {/* Show Character Count */}
            <div className="flex items-center justify-between">
              <Label>Show character count</Label>
              <Switch
                checked={settings.showCharacterCount}
                onCheckedChange={(checked) => updateSetting('showCharacterCount', checked)}
              />
            </div>

            {/* Highlight Current Line */}
            <div className="flex items-center justify-between">
              <Label>Highlight current line</Label>
              <Switch
                checked={settings.highlightCurrentLine}
                onCheckedChange={(checked) => updateSetting('highlightCurrentLine', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Focus & Accessibility</span>
          </CardTitle>
          <CardDescription>
            Settings to improve focus and accessibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <Label>High contrast mode</Label>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>

            {/* Focus Mode */}
            <div className="flex items-center justify-between">
              <Label>Focus mode</Label>
              <Switch
                checked={settings.focusMode}
                onCheckedChange={(checked) => updateSetting('focusMode', checked)}
              />
            </div>

            {/* Typewriter Mode */}
            <div className="flex items-center justify-between">
              <Label>Typewriter mode</Label>
              <Switch
                checked={settings.typewriterMode}
                onCheckedChange={(checked) => updateSetting('typewriterMode', checked)}
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