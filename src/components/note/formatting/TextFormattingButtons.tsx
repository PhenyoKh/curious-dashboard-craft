
import React, { useState, useEffect } from 'react';

interface TextFormattingButtonsProps {
  onFormatText: (command: string, value?: string) => void;
  isFormatActive: (command: string) => boolean;
}

const TextFormattingButtons: React.FC<TextFormattingButtonsProps> = ({
  onFormatText,
  isFormatActive
}) => {
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [selectedSize, setSelectedSize] = useState('Normal');

  const fonts = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Segoe UI', label: 'Segoe UI' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Lexend Deca', label: 'Lexend Deca' }
  ];

  const sizes = [
    { value: 'Small', label: 'Small' },
    { value: 'Normal', label: 'Normal' },
    { value: 'Large', label: 'Large' }
  ];

  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
      onFormatText('fontName', font);
    }
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
      onFormatText('fontSize', size);
    }
  };

  const handleToggleFormat = (command: string) => {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
      onFormatText(command);
    }
  };

  return (
    <div className="flex items-center gap-3 pr-6 border-r border-gray-200">
      {/* Font Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Font:</span>
        <select
          value={selectedFont}
          onChange={(e) => handleFontChange(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          {fonts.map((font) => (
            <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Size:</span>
        <select
          value={selectedSize}
          onChange={(e) => handleSizeChange(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          {sizes.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      {/* Formatting Buttons */}
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={() => handleToggleFormat('bold')}
          className={`p-2 hover:bg-gray-100 rounded text-sm font-bold transition-colors ${
            isFormatActive('bold') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Bold (Ctrl/⌘+B)"
        >
          B
        </button>
        <button
          onClick={() => handleToggleFormat('italic')}
          className={`p-2 hover:bg-gray-100 rounded text-sm italic transition-colors ${
            isFormatActive('italic') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Italic (Ctrl/⌘+I)"
        >
          I
        </button>
        <button
          onClick={() => handleToggleFormat('underline')}
          className={`p-2 hover:bg-gray-100 rounded text-sm underline transition-colors ${
            isFormatActive('underline') ? 'bg-blue-100 text-blue-700' : ''
          }`}
          title="Underline (Ctrl/⌘+U)"
        >
          U
        </button>
      </div>
    </div>
  );
};

export default TextFormattingButtons;
