import { useState, useCallback, useEffect } from 'react';
import { applyFontColor, storeCurrentSelection } from '../utils/formatting/colorFormatting';

interface UseFontColorOperationsReturn {
  activeFontColor: string;
  handleFontColorClick: (color: string) => void;
}

export const useFontColorOperations = (
  onFormatText?: (command: string, value?: string) => void
): UseFontColorOperationsReturn => {
  const [activeFontColor, setActiveFontColor] = useState<string>('#000000');

  // Helper function to safely read current selection's color
  const getCurrentColor = useCallback((): string => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return '#000000'; // default black
      }

      const range = selection.getRangeAt(0);
      const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement 
        : range.commonAncestorContainer as Element;

      if (!element) return '#000000';

      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.color;
      
      // Convert rgb/rgba to hex for consistency
      if (color.startsWith('rgb')) {
        const rgbValues = color.match(/d+/g);
        if (rgbValues && rgbValues.length >= 3) {
          const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
          const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
          const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        }
      }
      
      return color.startsWith('#') ? color : '#000000';
    } catch (error) {
      console.error('Error reading current color:', error);
      return '#000000';
    }
  }, []);

  // Sync activeFontColor with current selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const currentColor = getCurrentColor();
      setActiveFontColor(currentColor);
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Also listen for mouse and key events
    const handleEditorEvent = () => {
      // Small delay to ensure DOM has updated
      setTimeout(handleSelectionChange, 10);
    };
    
    document.addEventListener('mouseup', handleEditorEvent);
    document.addEventListener('keyup', handleEditorEvent);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleEditorEvent);
      document.removeEventListener('keyup', handleEditorEvent);
    };
  }, [getCurrentColor]);

  const handleFontColorClick = useCallback((color: string) => {
    console.log("Font color click:", color);

    // Store current selection before it gets lost
    const hasSelection = storeCurrentSelection();
    if (!hasSelection) {
      console.log("No text selected - please select text first");
      return;
    }
    
    // Validate color input for security
    const isValidColor = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) || 
                        /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color) ||
                        /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01]?\.?\d*\s*\)$/.test(color);
    
    if (!isValidColor) {
      console.error('Invalid color format:', color);
      return;
    }

    // Use the secure applyFontColor function instead of manipulating editor directly
    const success = applyFontColor(color);
    
    if (success) {
      // Update the active font color state only if the application was successful
      setActiveFontColor(color);
    }
  }, []);

  return {
    activeFontColor,
    handleFontColorClick
  };
};