/**
 * Appearance Settings Component
 * Customize accent colors, layout density, and visual appearance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Palette, Layout, Monitor, Sun, Moon, Eye, Sparkles, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AppearanceSettingsProps {
  className?: string;
}

interface AppearanceSettings {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Colors
  accentColor: string;
  
  // Layout
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  
  // Visual Effects
  animations: boolean;
  shadows: boolean;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'system',
    accentColor: 'blue',
    layoutDensity: 'comfortable',
    animations: true,
    shadows: true
  });

  // Predefined accent colors
  const accentColors = [
    { name: 'blue', color: '#3b82f6', label: 'Blue' },
    { name: 'purple', color: '#8b5cf6', label: 'Purple' },
    { name: 'green', color: '#22c55e', label: 'Green' },
    { name: 'orange', color: '#f97316', label: 'Orange' },
    { name: 'red', color: '#ef4444', label: 'Red' },
    { name: 'slate', color: '#64748b', label: 'Slate' }
  ];

  // Load settings from localStorage
  useEffect(() => {
    if (user?.id) {
      const savedSettings = localStorage.getItem(`appearance_settings_${user.id}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
          applySettingsToDOM(parsed);
        } catch (error) {
          console.error('Failed to parse appearance settings:', error);
        }
      }
    }
  }, [user?.id]);

  // Apply settings to DOM for immediate preview
  const applySettingsToDOM = useCallback((appearanceSettings: AppearanceSettings) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    const currentAccentColor = accentColors.find(c => c.name === appearanceSettings.accentColor)?.color || '#3b82f6';
    
    root.style.setProperty('--accent-color', currentAccentColor);
    
    // Layout density
    const densityMap = {
      compact: { spacing: '0.5rem', padding: '0.75rem' },
      comfortable: { spacing: '1rem', padding: '1rem' },
      spacious: { spacing: '1.5rem', padding: '1.5rem' }
    };
    const density = densityMap[appearanceSettings.layoutDensity];
    root.style.setProperty('--layout-spacing', density.spacing);
    root.style.setProperty('--layout-padding', density.padding);
    
    // Visual effects
    root.style.setProperty('--shadows', appearanceSettings.shadows ? 'block' : 'none');
    root.style.setProperty('--animations', appearanceSettings.animations ? 'all' : 'none');
    
    // Theme
    if (appearanceSettings.theme !== 'system') {
      root.setAttribute('data-theme', appearanceSettings.theme);
    } else {
      root.removeAttribute('data-theme');
    }
  }, [accentColors]);

  // Save settings
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);

      // Save to localStorage
      localStorage.setItem(`appearance_settings_${user.id}`, JSON.stringify(settings));

      // Apply settings immediately
      applySettingsToDOM(settings);

      toast({
        title: "Appearance saved",
        description: "Your appearance settings have been saved successfully.",
      });

    } catch (error) {
      console.error('Failed to save appearance settings:', error);
      toast({
        title: "Save failed",
        description: "Failed to save appearance settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [settings, user?.id, applySettingsToDOM]);

  // Update setting helper
  const updateSetting = useCallback(<K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      // Apply settings immediately for live preview
      applySettingsToDOM(newSettings);
      return newSettings;
    });
  }, [applySettingsToDOM]);

  // Get current accent color
  const getCurrentAccentColor = useCallback(() => {
    return accentColors.find(c => c.name === settings.accentColor)?.color || '#3b82f6';
  }, [settings.accentColor, accentColors]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-5 h-5" />
            <span>Theme</span>
          </CardTitle>
          <CardDescription>
            Choose your preferred color theme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', icon: Sun, label: 'Light' },
              { value: 'dark', icon: Moon, label: 'Dark' },
              { value: 'system', icon: Monitor, label: 'System' }
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => updateSetting('theme', value as any)}
                className={cn(
                  "flex flex-col items-center space-y-2 p-4 border-2 rounded-lg transition-colors",
                  settings.theme === value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Colors</span>
          </CardTitle>
          <CardDescription>
            Choose your preferred accent color
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Accent Color */}
          <div className="space-y-3">
            <Label>Accent Color</Label>
            <div className="grid grid-cols-6 gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => updateSetting('accentColor', color.name)}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center",
                    settings.accentColor === color.name
                      ? "border-gray-900 scale-110"
                      : "border-gray-300"
                  )}
                  style={{ backgroundColor: color.color }}
                  title={color.label}
                >
                  {settings.accentColor === color.name && (
                    <span className="text-white text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layout className="w-5 h-5" />
            <span>Layout</span>
          </CardTitle>
          <CardDescription>
            Configure layout density and spacing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Layout Density */}
          <div className="space-y-3">
            <Label>Layout Density</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'compact', label: 'Compact', desc: 'More content' },
                { value: 'comfortable', label: 'Comfortable', desc: 'Balanced' },
                { value: 'spacious', label: 'Spacious', desc: 'More breathing room' }
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => updateSetting('layoutDensity', value as any)}
                  className={cn(
                    "flex flex-col items-center space-y-1 p-3 border-2 rounded-lg transition-colors text-center",
                    settings.layoutDensity === value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-gray-500">{desc}</span>
                </button>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Visual Effects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Visual Effects</span>
          </CardTitle>
          <CardDescription>
            Configure basic visual preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Animations */}
            <div className="flex items-center justify-between">
              <Label>Animations</Label>
              <Switch
                checked={settings.animations}
                onCheckedChange={(checked) => updateSetting('animations', checked)}
              />
            </div>

            {/* Shadows */}
            <div className="flex items-center justify-between">
              <Label>Shadows</Label>
              <Switch
                checked={settings.shadows}
                onCheckedChange={(checked) => updateSetting('shadows', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your settings look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="p-4 border rounded-lg"
            style={{
              background: `linear-gradient(to right, ${getCurrentAccentColor()}10, ${getCurrentAccentColor()}20)`
            }}
          >
            <h3 className="font-semibold mb-2" style={{ color: getCurrentAccentColor() }}>
              Sample Content
            </h3>
            <p className="text-gray-600 mb-3">
              This preview shows how your selected accent color will appear throughout the interface.
            </p>
            <Button 
              size="sm" 
              style={{ 
                backgroundColor: getCurrentAccentColor()
              }}
            >
              Sample Button
            </Button>
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
              <span>Save Appearance</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AppearanceSettings;