
import { useState, useEffect } from 'react';

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

  const handleHighlightClick = (color: string) => {
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim()) {
      // Apply highlighting to selected text immediately
      onFormatText('hiliteColor', color);
      setActiveHighlight(null);
    } else {
      // Toggle active highlight state for future text selection/typing
      const newActiveHighlight = activeHighlight === color ? null : color;
      setActiveHighlight(newActiveHighlight);
      
      // Focus the editor
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editor) {
        editor.focus();
      }
    }
  };

  const handleClearHighlight = () => {
    onFormatText('hiliteColor', 'transparent');
    setActiveHighlight(null);
  };

  const handleFontColorClick = (color: string) => {
    onFormatText('foreColor', color);
    setActiveFontColor(color);
  };

  const handleKeyboardHighlight = (colorKey: string) => {
    const colorInfo = colorShortcuts[colorKey as keyof typeof colorShortcuts];
    if (colorInfo) {
      handleHighlightClick(colorInfo.color);
    }
  };

  // Simple approach - apply highlight when text is typed if activeHighlight is set
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (activeHighlight && selection && selection.toString().trim()) {
        // If there's text selected and we have an active highlight, apply it
        onFormatText('hiliteColor', activeHighlight);
        setActiveHighlight(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [activeHighlight, onFormatText]);

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
