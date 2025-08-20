
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { selectionCache } from '@/utils/formatting/selectionCache';
import { logger } from '@/utils/logger';

interface TextFormattingButtonsProps {
  onFormatText: (command: string, value?: string) => void;
  isFormatActive: (command: string) => boolean;
}

const TextFormattingButtons: React.FC<TextFormattingButtonsProps> = ({
  onFormatText,
  isFormatActive
}) => {
  // Helper function to safely read current selection's font family
  const getCurrentFont = (): string => {
    try {
      const selection = selectionCache.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return 'Inter'; // default
      }

      const range = selection.getRangeAt(0);
      const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement 
        : range.commonAncestorContainer as Element;

      if (!element) return 'Inter';

      const computedStyle = window.getComputedStyle(element);
      const fontFamily = computedStyle.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
      
      // Validate against our predefined fonts
      const validFonts = ['Inter', 'Segoe UI', 'Roboto', 'Lexend Deca'];
      return validFonts.includes(fontFamily) ? fontFamily : 'Inter';
    } catch (error) {
      logger.error('Error reading current font:', error);
      return 'Inter';
    }
  };

  // Helper function to safely read current selection's font size
  const getCurrentSize = (): string => {
    try {
      const selection = selectionCache.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return 'Normal'; // default
      }

      const range = selection.getRangeAt(0);
      const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement 
        : range.commonAncestorContainer as Element;

      if (!element) return 'Normal';

      const computedStyle = window.getComputedStyle(element);
      const fontSize = parseFloat(computedStyle.fontSize);
      
      // Map pixel sizes to our predefined size names
      if (fontSize <= 14) return 'Small';
      if (fontSize >= 18) return 'Large';
      return 'Normal';
    } catch (error) {
      logger.error('Error reading current size:', error);
      return 'Normal';
    }
  };

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
  // Sync dropdown states with current selection
  useEffect(() => {
    const handleSelectionChange = () => {
      // Update dropdown states to match current selection
      const currentFont = getCurrentFont();
      const currentSize = getCurrentSize();
      
      setSelectedFont(currentFont);
      setSelectedSize(currentSize);
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Also check on mouse up and key up to catch selection changes
    const editor = selectionCache.getEditor();
    if (editor) {
      editor.addEventListener('mouseup', handleSelectionChange);
      editor.addEventListener('keyup', handleSelectionChange);
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (editor) {
        editor.removeEventListener('mouseup', handleSelectionChange);
        editor.removeEventListener('keyup', handleSelectionChange);
      }
    };
  }, []);


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
