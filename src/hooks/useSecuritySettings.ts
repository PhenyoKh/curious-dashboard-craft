/**
 * Custom hook for security settings management
 * Handles user security preferences and configuration
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SecurityLevel, type SecurityConfig } from '@/lib/security/FileSecurityValidator';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security/SecurityLogger';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface SecuritySettings {
  id?: string;
  user_id: string;
  security_level: SecurityLevel;
  max_file_size: number;
  max_archive_depth: number;
  max_compression_ratio: number;
  allowed_extensions: string[];
  blocked_extensions: string[];
  allowed_mime_types: string[];
  enable_heuristic_scanning: boolean;
  enable_archive_scanning: boolean;
  enable_image_validation: boolean;
  quarantine_retention_days: number;
  auto_quarantine_suspicious: boolean;
  notify_on_threats: boolean;
  log_retention_days: number;
  custom_patterns: string[];
  created_at?: string;
  updated_at?: string;
}

export interface UseSecuritySettingsOptions {
  autoSave?: boolean;
  saveDelay?: number;
  onSettingsChanged?: (settings: SecuritySettings) => void;
  onSaveError?: (error: Error) => void;
}

export interface SecuritySettingsState {
  settings: SecuritySettings | null;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;
  lastSaved: Date | null;
}

const DEFAULT_SETTINGS: Omit<SecuritySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  security_level: SecurityLevel.BALANCED,
  max_file_size: 50 * 1024 * 1024, // 50MB
  max_archive_depth: 3,
  max_compression_ratio: 1000,
  allowed_extensions: [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
    'pdf', 'txt', 'md', 'rtf', 'docx', 'xlsx', 'pptx',
    'zip', 'rar', '7z', 'tar', 'gz',
    'json', 'xml', 'csv', 'log'
  ],
  blocked_extensions: [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'jar',
    'js', 'vbs', 'ps1', 'reg', 'msi', 'dll'
  ],
  allowed_mime_types: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'text/plain', 'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    'application/json', 'application/xml', 'text/csv'
  ],
  enable_heuristic_scanning: true,
  enable_archive_scanning: true,
  enable_image_validation: true,
  quarantine_retention_days: 30,
  auto_quarantine_suspicious: true,
  notify_on_threats: true,
  log_retention_days: 90,
  custom_patterns: []
};

export function useSecuritySettings(options: UseSecuritySettingsOptions = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<SecuritySettingsState>({
    settings: null,
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    error: null,
    lastSaved: null
  });

  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Load settings from localStorage (fallback to defaults)
  const loadSettings = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try to load from localStorage first
      const savedSettings = localStorage.getItem(`security_settings_${user.id}`);
      let settings: SecuritySettings;

      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          settings = {
            ...DEFAULT_SETTINGS,
            user_id: user.id,
            ...parsed
          };
        } catch (parseError) {
          console.warn('Failed to parse saved security settings, using defaults:', parseError);
          settings = {
            ...DEFAULT_SETTINGS,
            user_id: user.id
          };
        }
      } else {
        settings = {
          ...DEFAULT_SETTINGS,
          user_id: user.id
        };
      }

      setState(prev => ({ 
        ...prev, 
        settings,
        isLoading: false,
        hasUnsavedChanges: false
      }));

      // Log settings access
      await securityLogger.logEvent(
        SecurityEventType.SECURITY_DASHBOARD_ACCESSED,
        SecurityEventSeverity.INFO,
        'Security settings accessed',
        { settings_loaded: !!savedSettings }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false
      }));

      toast({
        title: "Error loading settings",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [user]);

  // Save settings to localStorage
  const saveSettings = useCallback(async (settingsToSave?: SecuritySettings) => {
    if (!user || (!state.settings && !settingsToSave)) return false;

    const settings = settingsToSave || state.settings!;
    
    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      // Save to localStorage
      const settingsToStore = {
        security_level: settings.security_level,
        max_file_size: settings.max_file_size,
        max_archive_depth: settings.max_archive_depth,
        max_compression_ratio: settings.max_compression_ratio,
        allowed_extensions: settings.allowed_extensions,
        blocked_extensions: settings.blocked_extensions,
        allowed_mime_types: settings.allowed_mime_types,
        enable_heuristic_scanning: settings.enable_heuristic_scanning,
        enable_archive_scanning: settings.enable_archive_scanning,
        enable_image_validation: settings.enable_image_validation,
        quarantine_retention_days: settings.quarantine_retention_days,
        auto_quarantine_suspicious: settings.auto_quarantine_suspicious,
        notify_on_threats: settings.notify_on_threats,
        log_retention_days: settings.log_retention_days,
        custom_patterns: settings.custom_patterns,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(`security_settings_${user.id}`, JSON.stringify(settingsToStore));

      setState(prev => ({ 
        ...prev, 
        settings: {
          ...settings,
          updated_at: settingsToStore.updated_at
        },
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }));

      // Log settings change
      await securityLogger.logEvent(
        SecurityEventType.SECURITY_RULES_UPDATED,
        SecurityEventSeverity.INFO,
        'Security settings updated',
        { 
          security_level: settings.security_level,
          max_file_size: settings.max_file_size,
          auto_quarantine: settings.auto_quarantine_suspicious
        }
      );

      options.onSettingsChanged?.(settings);

      toast({
        title: "Settings saved",
        description: "Your security settings have been updated successfully.",
        variant: "default"
      });

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isSaving: false
      }));

      options.onSaveError?.(error instanceof Error ? error : new Error(errorMessage));

      toast({
        title: "Save failed",
        description: errorMessage,
        variant: "destructive"
      });

      return false;
    }
  }, [user, state.settings, options]);

  // Update settings locally (with auto-save)
  const updateSettings = useCallback((updates: Partial<SecuritySettings>) => {
    if (!state.settings) return;

    const newSettings = { ...state.settings, ...updates };
    
    setState(prev => ({ 
      ...prev, 
      settings: newSettings,
      hasUnsavedChanges: true
    }));

    // Auto-save with debounce
    if (options.autoSave) {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        saveSettings(newSettings);
      }, options.saveDelay || 2000);

      setSaveTimeoutId(timeoutId);
    }
  }, [state.settings, options.autoSave, options.saveDelay, saveTimeoutId, saveSettings]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (!user) return;

    const defaultSettings: SecuritySettings = {
      ...DEFAULT_SETTINGS,
      user_id: user.id
    };

    setState(prev => ({ 
      ...prev, 
      settings: defaultSettings,
      hasUnsavedChanges: true
    }));

    toast({
      title: "Settings reset",
      description: "Security settings have been reset to defaults.",
      variant: "default"
    });
  }, [user]);

  // Convert to SecurityConfig for FileSecurityValidator
  const toSecurityConfig = useCallback((): SecurityConfig | null => {
    if (!state.settings) return null;

    return {
      level: state.settings.security_level,
      maxFileSize: state.settings.max_file_size,
      maxArchiveDepth: state.settings.max_archive_depth,
      maxCompressionRatio: state.settings.max_compression_ratio,
      allowedExtensions: new Set(state.settings.allowed_extensions),
      blockedExtensions: new Set(state.settings.blocked_extensions),
      allowedMimeTypes: new Set(state.settings.allowed_mime_types),
      enableHeuristicScanning: state.settings.enable_heuristic_scanning,
      enableArchiveScanning: state.settings.enable_archive_scanning,
      enableImageValidation: state.settings.enable_image_validation,
      customPatterns: state.settings.custom_patterns.map(pattern => new RegExp(pattern, 'gi'))
    };
  }, [state.settings]);

  // Validate settings
  const validateSettings = useCallback((settings: Partial<SecuritySettings>): string[] => {
    const errors: string[] = [];

    if (settings.max_file_size && settings.max_file_size < 1024) {
      errors.push('Maximum file size must be at least 1KB');
    }

    if (settings.max_file_size && settings.max_file_size > 1024 * 1024 * 1024) {
      errors.push('Maximum file size cannot exceed 1GB');
    }

    if (settings.max_archive_depth && (settings.max_archive_depth < 1 || settings.max_archive_depth > 10)) {
      errors.push('Archive depth must be between 1 and 10');
    }

    if (settings.max_compression_ratio && (settings.max_compression_ratio < 10 || settings.max_compression_ratio > 10000)) {
      errors.push('Compression ratio must be between 10 and 10,000');
    }

    if (settings.quarantine_retention_days && (settings.quarantine_retention_days < 1 || settings.quarantine_retention_days > 365)) {
      errors.push('Quarantine retention must be between 1 and 365 days');
    }

    if (settings.log_retention_days && (settings.log_retention_days < 7 || settings.log_retention_days > 730)) {
      errors.push('Log retention must be between 7 and 730 days');
    }

    if (settings.custom_patterns) {
      for (const pattern of settings.custom_patterns) {
        try {
          new RegExp(pattern);
        } catch {
          errors.push(`Invalid regex pattern: ${pattern}`);
        }
      }
    }

    return errors;
  }, []);

  // Security level presets
  const applySecurityPreset = useCallback((level: SecurityLevel) => {
    let updates: Partial<SecuritySettings> = { security_level: level };

    switch (level) {
      case SecurityLevel.STRICT:
        updates = {
          ...updates,
          max_file_size: 10 * 1024 * 1024, // 10MB
          max_archive_depth: 2,
          max_compression_ratio: 100,
          enable_heuristic_scanning: true,
          enable_archive_scanning: true,
          enable_image_validation: true,
          auto_quarantine_suspicious: true,
          blocked_extensions: [
            ...DEFAULT_SETTINGS.blocked_extensions,
            'zip', 'rar', '7z', 'tar', 'gz', // Block archives in strict mode
            'svg' // Block SVG due to XSS risks
          ]
        };
        break;

      case SecurityLevel.PERMISSIVE:
        updates = {
          ...updates,
          max_file_size: 100 * 1024 * 1024, // 100MB
          max_archive_depth: 5,
          max_compression_ratio: 5000,
          enable_heuristic_scanning: false,
          auto_quarantine_suspicious: false,
          blocked_extensions: [
            'exe', 'bat', 'cmd', 'com', 'pif', 'scr' // Only most dangerous
          ]
        };
        break;

      case SecurityLevel.BALANCED:
      default:
        updates = {
          ...updates,
          ...DEFAULT_SETTINGS
        };
        break;
    }

    updateSettings(updates);
  }, [updateSettings]);

  // Add custom extension
  const addAllowedExtension = useCallback((extension: string) => {
    if (!state.settings) return;

    const cleanExtension = extension.toLowerCase().replace(/^\./, '');
    
    if (!state.settings.allowed_extensions.includes(cleanExtension)) {
      updateSettings({
        allowed_extensions: [...state.settings.allowed_extensions, cleanExtension],
        blocked_extensions: state.settings.blocked_extensions.filter(ext => ext !== cleanExtension)
      });
    }
  }, [state.settings, updateSettings]);

  // Remove allowed extension
  const removeAllowedExtension = useCallback((extension: string) => {
    if (!state.settings) return;

    updateSettings({
      allowed_extensions: state.settings.allowed_extensions.filter(ext => ext !== extension)
    });
  }, [state.settings, updateSettings]);

  // Add blocked extension
  const addBlockedExtension = useCallback((extension: string) => {
    if (!state.settings) return;

    const cleanExtension = extension.toLowerCase().replace(/^\./, '');
    
    if (!state.settings.blocked_extensions.includes(cleanExtension)) {
      updateSettings({
        blocked_extensions: [...state.settings.blocked_extensions, cleanExtension],
        allowed_extensions: state.settings.allowed_extensions.filter(ext => ext !== cleanExtension)
      });
    }
  }, [state.settings, updateSettings]);

  // Remove blocked extension
  const removeBlockedExtension = useCallback((extension: string) => {
    if (!state.settings) return;

    updateSettings({
      blocked_extensions: state.settings.blocked_extensions.filter(ext => ext !== extension)
    });
  }, [state.settings, updateSettings]);

  // Add custom pattern
  const addCustomPattern = useCallback((pattern: string) => {
    if (!state.settings) return;

    try {
      new RegExp(pattern); // Validate pattern
      
      if (!state.settings.custom_patterns.includes(pattern)) {
        updateSettings({
          custom_patterns: [...state.settings.custom_patterns, pattern]
        });
      }
    } catch (error) {
      toast({
        title: "Invalid pattern",
        description: "The regex pattern is not valid.",
        variant: "destructive"
      });
    }
  }, [state.settings, updateSettings]);

  // Remove custom pattern
  const removeCustomPattern = useCallback((pattern: string) => {
    if (!state.settings) return;

    updateSettings({
      custom_patterns: state.settings.custom_patterns.filter(p => p !== pattern)
    });
  }, [state.settings, updateSettings]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }
    };
  }, [saveTimeoutId]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  return {
    // State
    ...state,
    
    // Actions
    loadSettings,
    saveSettings,
    updateSettings,
    resetToDefaults,
    
    // Security level presets
    applySecurityPreset,
    
    // Extension management
    addAllowedExtension,
    removeAllowedExtension,
    addBlockedExtension,
    removeBlockedExtension,
    
    // Pattern management
    addCustomPattern,
    removeCustomPattern,
    
    // Utilities
    toSecurityConfig,
    validateSettings,
    
    // Computed properties
    securityConfig: toSecurityConfig(),
    isStrict: state.settings?.security_level === SecurityLevel.STRICT,
    isBalanced: state.settings?.security_level === SecurityLevel.BALANCED,
    isPermissive: state.settings?.security_level === SecurityLevel.PERMISSIVE
  };
}