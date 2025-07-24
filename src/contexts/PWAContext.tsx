import React, { createContext, useContext, ReactNode } from 'react';

interface PWAContextType {
  isInstalled: boolean;
  isOnline: boolean;
  showInstallPrompt: boolean;
  dismissInstallPrompt: () => void;
  updateAvailable: boolean;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

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