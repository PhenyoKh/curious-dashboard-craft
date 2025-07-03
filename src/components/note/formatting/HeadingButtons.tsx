
import React from 'react';
import { applyHeading } from '@/utils/formatting/headingFormatting';

interface HeadingButtonsProps {
  onFormatText: (command: string, value?: string) => void;
}

const HeadingButtons: React.FC<HeadingButtonsProps> = ({ onFormatText }) => {
  const handleHeadingClick = (tag: 'h1' | 'h2' | 'h3' | 'p') => {
    applyHeading(tag);
  };

  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        onClick={() => handleHeadingClick('h1')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-bold transition-colors"
        title="Heading 1 - Main Title"
      >
        H1
      </button>
      <button
        onClick={() => handleHeadingClick('h2')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
        title="Heading 2 - Main Subheading"
      >
        H2
      </button>
      <button
        onClick={() => handleHeadingClick('h3')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-medium transition-colors"
        title="Heading 3 - Sub-subheading"
      >
        H3
      </button>
      <button
        onClick={() => handleHeadingClick('p')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Paragraph - Normal Text"
      >
        P
      </button>
    </div>
  );
};

export default HeadingButtons;
