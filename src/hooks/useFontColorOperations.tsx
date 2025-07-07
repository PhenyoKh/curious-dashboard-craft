
import { useState, useCallback } from 'react';

interface UseFontColorOperationsProps {
  onFormatText: (command: string, value?: string) => void;
}

export const useFontColorOperations = ({ onFormatText }: UseFontColorOperationsProps) => {
  const [activeFontColor, setActiveFontColor] = useState<string>('#000000');

  const handleFontColorClick = useCallback((color: string) => {
    console.log('Font color click:', color);
    
    // Update the active font color state
    setActiveFontColor(color);
    
    // Apply the color directly to the editor element
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.style.color = color;
      editor.focus();
    }
    
    // If there's selected text, apply color to it as well
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      onFormatText('foreColor', color);
    }
  }, [onFormatText]);

  return {
    activeFontColor,
    setActiveFontColor,
    handleFontColorClick
  };
};
