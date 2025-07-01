
import React from 'react';

interface AlignmentButtonsProps {
  onFormatText: (command: string, value?: string) => void;
  isFormatActive: (command: string) => boolean;
}

const AlignmentButtons: React.FC<AlignmentButtonsProps> = ({ onFormatText, isFormatActive }) => {
  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        onClick={() => onFormatText('justifyLeft')}
        className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
          isFormatActive('justifyLeft') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Align Left"
      >
        ⬅
      </button>
      <button
        onClick={() => onFormatText('justifyCenter')}
        className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
          isFormatActive('justifyCenter') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Align Center"
      >
        ⬌
      </button>
      <button
        onClick={() => onFormatText('justifyRight')}
        className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
          isFormatActive('justifyRight') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Align Right"
      >
        ➡
      </button>
    </div>
  );
};

export default AlignmentButtons;
