
import React from 'react';

interface TextFormattingButtonsProps {
  onFormatText: (command: string, value?: string) => void;
  isFormatActive: (command: string) => boolean;
}

const TextFormattingButtons: React.FC<TextFormattingButtonsProps> = ({
  onFormatText,
  isFormatActive
}) => {
  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        onClick={() => onFormatText('bold')}
        className={`p-2 hover:bg-gray-100 rounded text-sm font-bold transition-colors ${
          isFormatActive('bold') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Bold (Ctrl+B)"
      >
        B
      </button>
      <button
        onClick={() => onFormatText('italic')}
        className={`p-2 hover:bg-gray-100 rounded text-sm italic transition-colors ${
          isFormatActive('italic') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Italic (Ctrl+I)"
      >
        I
      </button>
      <button
        onClick={() => onFormatText('underline')}
        className={`p-2 hover:bg-gray-100 rounded text-sm underline transition-colors ${
          isFormatActive('underline') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Underline (Ctrl+U)"
      >
        U
      </button>
      <button
        onClick={() => onFormatText('strikeThrough')}
        className={`p-2 hover:bg-gray-100 rounded text-sm line-through transition-colors ${
          isFormatActive('strikeThrough') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Strikethrough"
      >
        S
      </button>
    </div>
  );
};

export default TextFormattingButtons;
