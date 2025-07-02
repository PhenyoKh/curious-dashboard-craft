import { useState, useCallback } from 'react';

interface HighlightLogicProps {
  onFormatText: (command: string, value?: string) => void;
  children: (props: {
    activeHighlight: string | null;
    activeFontColor: string;
    handleHighlightClick: (color: string) => void;
    handleClearHighlight: () => void;
    handleFontColorClick: (color: string) => void;
    handleKeyboardHighlight: (colorKey: string) => void;
  }) => React.ReactNode;
}

const HighlightLogic: React.FC<HighlightLogicProps> = ({ onFormatText, children }) => {
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [activeFontColor, setActiveFontColor] = useState<string>('#000000');

  // Color mapping for keyboard shortcuts
  const colorShortcuts = {
    '1': { color: '#ffcdd2', name: 'Red - Key Definition' },
    '2': { color: '#fff9c4', name: 'Yellow - Main Principle' },
    '3': { color: '#c8e6c9', name: 'Green - Example' },
    '4': { color: '#bbdefb', name: 'Blue - To Review' }
  };

  const handleHighlightClick = useCallback((color: string) => {
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim()) {
      // Apply highlighting to selected text immediately
      onFormatText('hiliteColor', color);
      // Don't clear active highlight - keep it active for next selection
      setActiveHighlight(color);
    } else {
      // Toggle active highlight state for future text selection/typing
      const newActiveHighlight = activeHighlight === color ? null : color;
      setActiveHighlight(newActiveHighlight);
      
      // Apply the highlight style to the current cursor position
      if (newActiveHighlight) {
        onFormatText('hiliteColor', newActiveHighlight);
      }
      
      // Focus the editor
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editor) {
        editor.focus();
      }
    }
  }, [activeHighlight, onFormatText]);

  const handleClearHighlight = useCallback(() => {
    onFormatText('hiliteColor', 'transparent');
    setActiveHighlight(null);
  }, [onFormatText]);

  const handleFontColorClick = useCallback((color: string) => {
    onFormatText('foreColor', color);
    setActiveFontColor(color);
  }, [onFormatText]);

  const handleKeyboardHighlight = useCallback((colorKey: string) => {
    const colorInfo = colorShortcuts[colorKey as keyof typeof colorShortcuts];
    if (colorInfo) {
      handleHighlightClick(colorInfo.color);
    }
  }, [handleHighlightClick]);

  return (
    <>
      {children({
        activeHighlight,
        activeFontColor,
        handleHighlightClick,
        handleClearHighlight,
        handleFontColorClick,
        handleKeyboardHighlight
      })}
    </>
  );
};

export default HighlightLogic;
