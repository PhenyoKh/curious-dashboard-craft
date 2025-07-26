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
  customAccentColor: string;
  colorScheme: 'default' | 'vibrant' | 'muted' | 'high-contrast';
  
  // Layout
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  sidebarWidth: number;
  contentWidth: 'narrow' | 'medium' | 'wide' | 'full';
  
  // Visual Effects
  animations: boolean;
  borderRadius: number;
  shadows: boolean;
  blurEffects: boolean;
  
  // Typography Scale
  textScale: number;
  
  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'system',
    accentColor: 'blue',
    customAccentColor: '#3b82f6',
    colorScheme: 'default',
    layoutDensity: 'comfortable',
    sidebarWidth: 280,
    contentWidth: 'medium',
    animations: true,
    borderRadius: 8,
    shadows: true,
    blurEffects: true,
    textScale: 100,
    reducedMotion: false,
    highContrast: false,
    colorBlindMode: 'none'
  });

  // Predefined accent colors
  const accentColors = [
    { name: 'blue', color: '#3b82f6', label: 'Blue' },
    { name: 'indigo', color: '#6366f1', label: 'Indigo' },
    { name: 'purple', color: '#8b5cf6', label: 'Purple' },
    { name: 'pink', color: '#ec4899', label: 'Pink' },
    { name: 'red', color: '#ef4444', label: 'Red' },
    { name: 'orange', color: '#f97316', label: 'Orange' },
    { name: 'amber', color: '#f59e0b', label: 'Amber' },
    { name: 'yellow', color: '#eab308', label: 'Yellow' },
    { name: 'lime', color: '#84cc16', label: 'Lime' },
    { name: 'green', color: '#22c55e', label: 'Green' },
    { name: 'emerald', color: '#10b981', label: 'Emerald' },
    { name: 'teal', color: '#14b8a6', label: 'Teal' },
    { name: 'cyan', color: '#06b6d4', label: 'Cyan' },
    { name: 'sky', color: '#0ea5e9', label: 'Sky' },
    { name: 'slate', color: '#64748b', label: 'Slate' },
    { name: 'custom', color: settings.customAccentColor, label: 'Custom' }
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
    const currentAccentColor = appearanceSettings.accentColor === 'custom' 
      ? appearanceSettings.customAccentColor 
      : accentColors.find(c => c.name === appearanceSettings.accentColor)?.color || '#3b82f6';
    
    root.style.setProperty('--accent-color', currentAccentColor);
    root.style.setProperty('--border-radius', `${appearanceSettings.borderRadius}px`);
    root.style.setProperty('--sidebar-width', `${appearanceSettings.sidebarWidth}px`);
    root.style.setProperty('--text-scale', `${appearanceSettings.textScale}%`);
    
    // Layout density
    const densityMap = {
      compact: { spacing: '0.5rem', padding: '0.75rem' },
      comfortable: { spacing: '1rem', padding: '1rem' },
      spacious: { spacing: '1.5rem', padding: '1.5rem' }
    };
    const density = densityMap[appearanceSettings.layoutDensity];
    root.style.setProperty('--layout-spacing', density.spacing);
    root.style.setProperty('--layout-padding', density.padding);
    
    // Content width
    const widthMap = {
      narrow: '768px',
      medium: '1024px',
      wide: '1280px',
      full: '100%'
    };
    root.style.setProperty('--content-max-width', widthMap[appearanceSettings.contentWidth]);
    
    // Visual effects
    root.style.setProperty('--shadows', appearanceSettings.shadows ? 'block' : 'none');
    root.style.setProperty('--animations', appearanceSettings.animations ? 'all' : 'none');
    root.style.setProperty('--blur-effects', appearanceSettings.blurEffects ? 'blur(8px)' : 'none');
    
    // Theme
    if (appearanceSettings.theme !== 'system') {
      root.setAttribute('data-theme', appearanceSettings.theme);
    } else {
      root.removeAttribute('data-theme');
    }
    
    // Accessibility
    if (appearanceSettings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
    } else {
      root.style.removeProperty('--animation-duration');
    }
    
    if (appearanceSettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Color blind mode
    root.setAttribute('data-colorblind-mode', appearanceSettings.colorBlindMode);
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
    return settings.accentColor === 'custom' 
      ? settings.customAccentColor 
      : accentColors.find(c => c.name === settings.accentColor)?.color || '#3b82f6';
  }, [settings.accentColor, settings.customAccentColor, accentColors]);

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
            Customize accent colors and color schemes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Accent Color */}
          <div className="space-y-3">
            <Label>Accent Color</Label>
            <div className="grid grid-cols-8 gap-2">
              {accentColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => updateSetting('accentColor', color.name)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                    settings.accentColor === color.name
                      ? "border-gray-900 scale-110"
                      : "border-gray-300"
                  )}
                  style={{ backgroundColor: color.color }}
                  title={color.label}
                />
              ))}
            </div>
            
            {settings.accentColor === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.customAccentColor}
                    onChange={(e) => updateSetting('customAccentColor', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300"
                  />
                  <span className="text-sm text-gray-600">{settings.customAccentColor}</span>
                </div>
              </div>
            )}
          </div>

          {/* Color Scheme */}
          <div className="space-y-2">
            <Label>Color Scheme</Label>
            <Select
              value={settings.colorScheme}
              onValueChange={(value) => updateSetting('colorScheme', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="vibrant">Vibrant</SelectItem>
                <SelectItem value="muted">Muted</SelectItem>
                <SelectItem value="high-contrast">High Contrast</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Content Width */}
          <div className="space-y-2">
            <Label>Content Width</Label>
            <Select
              value={settings.contentWidth}
              onValueChange={(value) => updateSetting('contentWidth', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Narrow (768px)</SelectItem>
                <SelectItem value="medium">Medium (1024px)</SelectItem>
                <SelectItem value="wide">Wide (1280px)</SelectItem>
                <SelectItem value="full">Full Width</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Scale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Text Scale</Label>
              <span className="text-sm text-gray-500">{settings.textScale}%</span>
            </div>
            <Slider
              value={[settings.textScale]}
              onValueChange={(value) => updateSetting('textScale', value[0])}
              min={75}
              max={150}
              step={5}
              className="w-full"
            />
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
            Configure animations and visual enhancements
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

            {/* Blur Effects */}
            <div className="flex items-center justify-between">
              <Label>Blur effects</Label>
              <Switch
                checked={settings.blurEffects}
                onCheckedChange={(checked) => updateSetting('blurEffects', checked)}
              />
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <Label>High contrast</Label>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              />
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Border Radius</Label>
              <span className="text-sm text-gray-500">{settings.borderRadius}px</span>
            </div>
            <Slider
              value={[settings.borderRadius]}
              onValueChange={(value) => updateSetting('borderRadius', value[0])}
              min={0}
              max={16}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Accessibility</span>
          </CardTitle>
          <CardDescription>
            Settings to improve accessibility and readability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reduced motion</Label>
              <p className="text-sm text-gray-500">
                Minimize animations for motion sensitivity
              </p>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
            />
          </div>

          {/* Color Blind Mode */}
          <div className="space-y-2">
            <Label>Color blind support</Label>
            <Select
              value={settings.colorBlindMode}
              onValueChange={(value) => updateSetting('colorBlindMode', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="protanopia">Protanopia (Red-blind)</SelectItem>
                <SelectItem value="deuteranopia">Deuteranopia (Green-blind)</SelectItem>
                <SelectItem value="tritanopia">Tritanopia (Blue-blind)</SelectItem>
              </SelectContent>
            </Select>
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
            className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50"
            style={{
              borderRadius: `${settings.borderRadius}px`,
              background: `linear-gradient(to right, ${getCurrentAccentColor()}10, ${getCurrentAccentColor()}20)`
            }}
          >
            <h3 className="font-semibold mb-2" style={{ color: getCurrentAccentColor() }}>
              Sample Content
            </h3>
            <p className="text-gray-600 mb-3">
              This is how your content will appear with the current appearance settings. 
              The accent color, border radius, and other visual elements are applied here.
            </p>
            <Button 
              size="sm" 
              style={{ 
                backgroundColor: getCurrentAccentColor(),
                borderRadius: `${settings.borderRadius}px`
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