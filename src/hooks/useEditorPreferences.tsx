/**
 * Hook to load and apply editor preferences globally
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface EditorSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
}

const defaultSettings: EditorSettings = {
  fontFamily: 'Inter',
  fontSize: 16,
  lineHeight: 1.6,
  fontWeight: '400',
};

// Get font family CSS value
const getFontFamilyValue = (fontFamily: string) => {
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
    'Playfair Display': '"Playfair Display", Georgia, serif',
    'Roboto': '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
    'Calibri': 'Calibri, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };
  return fontMap[fontFamily] || fontMap['Inter'];
};

export const useEditorPreferences = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Load settings from localStorage
    const savedSettings = localStorage.getItem(`editor_preferences_${user.id}`);
    let settings = defaultSettings;

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        settings = { ...defaultSettings, ...parsed };
      } catch (error) {
        logger.error('Failed to parse editor settings:', error);
      }
    }

    // Apply settings to document
    const root = document.documentElement;
    root.style.setProperty('--editor-font-family', getFontFamilyValue(settings.fontFamily));
    root.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--editor-line-height', settings.lineHeight.toString());
    root.style.setProperty('--editor-font-weight', settings.fontWeight);

  }, [user?.id]);
};