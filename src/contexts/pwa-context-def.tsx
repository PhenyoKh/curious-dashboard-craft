import { createContext } from 'react';

export interface PWAContextType {
  isInstalled: boolean;
  isOnline: boolean;
  showInstallPrompt: boolean;
  dismissInstallPrompt: () => void;
  updateAvailable: boolean;
  updateApp: () => void;
}

export const PWAContext = createContext<PWAContextType | undefined>(undefined);