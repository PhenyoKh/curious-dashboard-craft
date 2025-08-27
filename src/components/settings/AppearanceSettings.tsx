/**
 * Appearance Settings Component
 * Customize accent colors, layout density, and visual appearance
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Palette, Layout, Monitor, Sun, Moon, Eye, Sparkles, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

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

  // Predefined accent colors - memoized to prevent useCallback recreation
  const accentColors = useMemo(() => [
    { name: 'blue', color: '#3b82f6', label: 'Blue' },
    { name: 'purple', color: '#8b5cf6', label: 'Purple' },
    { name: 'green', color: '#22c55e', label: 'Green' },
    { name: 'orange', color: '#f97316', label: 'Orange' },
    { name: 'red', color: '#ef4444', label: 'Red' },
    { name: 'slate', color: '#64748b', label: 'Slate' }
  ], []);

  // Apply settings to DOM for immediate preview - defined before useEffect
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

  // Load settings from localStorage - now with proper dependencies
  useEffect(() => {
    if (user?.id) {
      const savedSettings = localStorage.getItem(`appearance_settings_${user.id}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
          applySettingsToDOM(parsed);
        } catch (error) {
          logger.error('Failed to parse appearance settings:', error);
        }
      }
    }
  }, [user?.id, applySettingsToDOM]);

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
      logger.error('Failed to save appearance settings:', error);
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
      {/* Theme Settings - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-5 h-5" />
            <span>Theme</span>
            <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">Coming Soon</span>
          </CardTitle>
          <CardDescription>
            Dark mode and theme customization will be available in a future update
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
                disabled
                className="flex flex-col items-center space-y-2 p-4 border-2 rounded-lg transition-colors border-gray-200 bg-gray-50 cursor-not-allowed"
              >
                <Icon className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-400">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Customization - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Colors</span>
            <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">Coming Soon</span>
          </CardTitle>
          <CardDescription>
            Custom accent colors will be available in a future update
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Accent Color */}
          <div className="space-y-3">
            <Label className="text-gray-400">Accent Color</Label>
            <div className="grid grid-cols-6 gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.name}
                  disabled
                  className="w-10 h-10 rounded-full border-2 transition-transform border-gray-300 cursor-not-allowed opacity-50"
                  style={{ backgroundColor: color.color }}
                  title={`${color.label} (Coming Soon)`}
                >
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layout className="w-5 h-5" />
            <span>Layout</span>
            <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">Coming Soon</span>
          </CardTitle>
          <CardDescription>
            Layout density options will be available in a future update
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Layout Density */}
          <div className="space-y-3">
            <Label className="text-gray-400">Layout Density</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'compact', label: 'Compact', desc: 'More content' },
                { value: 'comfortable', label: 'Comfortable', desc: 'Balanced' },
                { value: 'spacious', label: 'Spacious', desc: 'More breathing room' }
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  disabled
                  className="flex flex-col items-center space-y-1 p-3 border-2 rounded-lg transition-colors text-center border-gray-200 bg-gray-50 cursor-not-allowed"
                >
                  <span className="text-sm font-medium text-gray-400">{label}</span>
                  <span className="text-xs text-gray-400">{desc}</span>
                </button>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Visual Effects - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Visual Effects</span>
            <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">Coming Soon</span>
          </CardTitle>
          <CardDescription>
            Animation and visual effect controls will be available in a future update
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Animations */}
            <div className="flex items-center justify-between">
              <Label className="text-gray-400">Animations</Label>
              <Switch
                checked={false}
                disabled
                className="opacity-50 cursor-not-allowed"
              />
            </div>

            {/* Shadows */}
            <div className="flex items-center justify-between">
              <Label className="text-gray-400">Shadows</Label>
              <Switch
                checked={false}
                disabled
                className="opacity-50 cursor-not-allowed"
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Coming Soon Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">
                Appearance Customization Coming Soon!
              </h3>
              <p className="text-amber-700 text-sm">
                We're working on bringing you full theme customization, including dark mode, accent colors, and layout options. Stay tuned for updates!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSettings;