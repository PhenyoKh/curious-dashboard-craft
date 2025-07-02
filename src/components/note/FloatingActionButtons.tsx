
import React from 'react';
import { formatText } from '@/utils/formatting/textFormatting';

interface FloatingActionButtonsProps {
  onContentChange: () => void;
}

const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({ onContentChange }) => {
  const handleUndo = () => {
    formatText('undo');
    onContentChange();
  };

  const handleRedo = () => {
    formatText('redo');
    onContentChange();
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2">
      <button
        onClick={handleUndo}
        className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all flex items-center justify-center"
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        onClick={handleRedo}
        className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all flex items-center justify-center"
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
    </div>
  );
};

export default FloatingActionButtons;
