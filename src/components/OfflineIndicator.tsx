import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-orange-100 border border-orange-200 rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 text-orange-800">
        <WifiOff className="w-5 h-5" />
        <span className="text-sm font-medium">You're offline</span>
      </div>
      <p className="text-xs text-orange-700 mt-1">
        Some features may be limited
      </p>
    </div>
  );
};

export default OfflineIndicator;