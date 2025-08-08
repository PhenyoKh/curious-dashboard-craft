import { useContext } from 'react';
import { SettingsContext } from '@/contexts/settings-context-def';

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};