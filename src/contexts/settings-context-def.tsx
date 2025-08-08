import { createContext } from 'react';

export interface SettingsContextType {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);