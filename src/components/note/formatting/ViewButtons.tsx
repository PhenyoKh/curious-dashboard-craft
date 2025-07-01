
import React from 'react';
import { Maximize } from 'lucide-react';

interface ViewButtonsProps {
  wordCount: number;
}

const ViewButtons: React.FC<ViewButtonsProps> = ({ wordCount }) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 font-medium">
        {wordCount} words
      </span>
      <button
        className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Full Screen"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ViewButtons;
