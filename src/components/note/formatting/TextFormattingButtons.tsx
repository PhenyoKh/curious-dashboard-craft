
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
    { value: 'Small', label: 'Small', size: '14px' },
    { value: 'Normal', label: 'Normal', size: '16px' },
    { value: 'Large', label: 'Large', size: '18px' }
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
    const sizeInfo = sizes.find(s => s.value === size);
    if (sizeInfo) {
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editor) {
        editor.focus();
        
        // Clear any existing fontSize formatting on the current selection/position
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          // If there's selected text, remove existing font size spans
          if (selection.toString().trim()) {
            // Create a temporary div to process the selection
            const div = document.createElement('div');
            div.appendChild(range.cloneContents());
            
            // Remove font-size styles from all elements
            const elements = div.querySelectorAll('*');
            elements.forEach(el => {
              (el as HTMLElement).style.fontSize = '';
            });
            
            // Clear the range and insert processed content
            range.deleteContents();
            range.insertNode(div);
            
            // Now apply the new font size
            onFormatText('fontSize', sizeInfo.size);
          } else {
            // For cursor position, just apply the size
            onFormatText('fontSize', sizeInfo.size);
          }
        }
      }
    }
  };

  const handleToggleFormat = (command: string) => {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
      
      // For toggling formatting, ensure clean state
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.toString().trim()) {
        // If no text selected and we're turning off formatting,
        // create a clean text node to break formatting
        if (isFormatActive(command)) {
          const textNode = document.createTextNode(' ');
          const range = selection.getRangeAt(0);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
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
