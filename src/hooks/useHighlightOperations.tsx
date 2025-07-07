
import { useState, useCallback } from 'react';
import { colorShortcuts } from '@/utils/formatting/colorShortcuts';

interface UseHighlightOperationsProps {
  onFormatText: (command: string, value?: string) => void;
}

export const useHighlightOperations = ({ onFormatText }: UseHighlightOperationsProps) => {
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  const handleHighlightClick = useCallback((color: string) => {
    console.log('Highlight click:', color);
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim()) {
      // Only apply highlighting if there's selected text
      onFormatText('hiliteColor', color);
      setActiveHighlight(color);
    } else {
      console.log('No text selected for highlight');
      setActiveHighlight(color);
    }
  }, [onFormatText]);

  const handleKeyboardHighlight = useCallback((colorKey: string) => {
    const colorInfo = colorShortcuts[colorKey as keyof typeof colorShortcuts];
    if (colorInfo) {
      const selection = window.getSelection();
      
      if (selection && selection.toString().trim()) {
        // Apply highlighting to selected text
        onFormatText('hiliteColor', colorInfo.color);
        setActiveHighlight(colorInfo.color);
      }
    }
  }, [onFormatText]);

  return {
    activeHighlight,
    setActiveHighlight,
    handleHighlightClick,
    handleKeyboardHighlight
  };
};
