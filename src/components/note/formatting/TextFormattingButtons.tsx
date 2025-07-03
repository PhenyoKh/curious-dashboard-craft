
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { selectionCache } from '@/utils/formatting/selectionCache';

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

  const fonts = useMemo(() => [
    { value: 'Inter', label: 'Inter' },
    { value: 'Segoe UI', label: 'Segoe UI' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Lexend Deca', label: 'Lexend Deca' }
  ], []);

  const sizes = useMemo(() => [
    { value: 'Small', label: 'Small' },
    { value: 'Normal', label: 'Normal' },
    { value: 'Large', label: 'Large' }
  ], []);

  const handleFontChange = useCallback((font: string) => {
    setSelectedFont(font);
    if (selectionCache.focusEditor()) {
      onFormatText('fontName', font);
    }
  }, [onFormatText]);

  const handleSizeChange = useCallback((size: string) => {
    setSelectedSize(size);
    if (selectionCache.focusEditor()) {
      onFormatText('fontSize', size);
    }
  }, [onFormatText]);

  const handleToggleFormat = useCallback((command: string) => {
    if (selectionCache.focusEditor()) {
      onFormatText(command);
    }
  }, [onFormatText]);

  // Memoize format button data
  const formatButtons = useMemo(() => [
    { command: 'bold', label: 'B', title: 'Bold (Ctrl/⌘+B)', className: 'font-bold' },
    { command: 'italic', label: 'I', title: 'Italic (Ctrl/⌘+I)', className: 'italic' },
    { command: 'underline', label: 'U', title: 'Underline (Ctrl/⌘+U)', className: 'underline' }
  ], []);

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
        {formatButtons.map((button) => (
          <button
            key={button.command}
            onClick={() => handleToggleFormat(button.command)}
            className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${button.className} ${
              isFormatActive(button.command) ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title={button.title}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TextFormattingButtons;
