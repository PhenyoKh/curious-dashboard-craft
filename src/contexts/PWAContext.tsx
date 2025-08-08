import React, { ReactNode } from 'react';
import { PWAContext, PWAContextType } from '@/contexts/pwa-context-def';

interface PWAProviderProps {
  children: ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const dummyValue: PWAContextType = {
    isInstalled: false,
    isOnline: true,
    showInstallPrompt: false,
    dismissInstallPrompt: () => {},
    updateAvailable: false,
    updateApp: () => {},
  };

  return (
    <PWAContext.Provider value={dummyValue}>
      {children}
    </PWAContext.Provider>
  );
};