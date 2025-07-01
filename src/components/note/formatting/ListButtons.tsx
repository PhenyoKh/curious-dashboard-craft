
import React from 'react';

interface ListButtonsProps {
  onFormatText: (command: string, value?: string) => void;
  isFormatActive: (command: string) => boolean;
}

const ListButtons: React.FC<ListButtonsProps> = ({ onFormatText, isFormatActive }) => {
  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        onClick={() => onFormatText('insertUnorderedList')}
        className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
          isFormatActive('insertUnorderedList') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Bullet List"
      >
        • List
      </button>
      <button
        onClick={() => onFormatText('insertOrderedList')}
        className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
          isFormatActive('insertOrderedList') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Numbered List"
      >
        1. List
      </button>
      <button
        onClick={() => onFormatText('insertHTML', '<input type="checkbox"> ')}
        className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Checklist"
      >
        ☑ Todo
      </button>
    </div>
  );
};

export default ListButtons;
