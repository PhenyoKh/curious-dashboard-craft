import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/contexts/PWAContext';

const PWAUpdateNotification: React.FC = () => {
  const { updateAvailable, updateApp } = usePWA();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-green-50 rounded-lg shadow-lg border border-green-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 p-2 rounded-lg">
            <RefreshCw className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-800">Update Available</h3>
            <p className="text-sm text-green-700">
              A new version of Scola is ready
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={updateApp}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Update Now
        </Button>
        <Button
          variant="outline"
          onClick={() => {/* Handle dismiss */}}
          className="flex-1 border-green-300 text-green-700 hover:bg-green-100"
        >
          Later
        </Button>
      </div>
    </div>
  );
};

export default PWAUpdateNotification;