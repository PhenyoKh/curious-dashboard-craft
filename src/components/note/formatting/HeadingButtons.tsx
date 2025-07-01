
import React from 'react';

interface HeadingButtonsProps {
  onFormatText: (command: string, value?: string) => void;
}

const HeadingButtons: React.FC<HeadingButtonsProps> = ({ onFormatText }) => {
  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        onClick={() => onFormatText('formatBlock', 'h1')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
      >
        H1
      </button>
      <button
        onClick={() => onFormatText('formatBlock', 'h2')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
      >
        H2
      </button>
      <button
        onClick={() => onFormatText('formatBlock', 'h3')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
      >
        H3
      </button>
    </div>
  );
};

export default HeadingButtons;
