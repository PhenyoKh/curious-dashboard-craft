
import { useState, useCallback, useMemo } from 'react';

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

  // Color mapping for keyboard shortcuts - memoized to prevent recreation on every render
  const colorShortcuts = useMemo(() => ({
    '1': { color: '#ffcdd2', name: 'Red - Key Definition' },
    '2': { color: '#fff9c4', name: 'Yellow - Main Principle' },
    '3': { color: '#c8e6c9', name: 'Green - Example' },
    '4': { color: '#bbdefb', name: 'Blue - To Review' }
  }), []);

  const handleHighlightClick = useCallback((color: string) => {
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim()) {
      // Only apply highlighting if there's selected text
      onFormatText('hiliteColor', color);
      setActiveHighlight(color);
    }
    // If no text is selected, do nothing - just set the active state for visual feedback
    else {
      setActiveHighlight(color);
    }
  }, [onFormatText]);

  const handleClearHighlight = useCallback(() => {
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim()) {
      // Only clear highlighting if there's selected text
      onFormatText('hiliteColor', 'transparent');
    }
    
    setActiveHighlight(null);
  }, [onFormatText]);

  const handleFontColorClick = useCallback((color: string) => {
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim()) {
      onFormatText('foreColor', color);
      setActiveFontColor(color);
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
  }, [onFormatText, colorShortcuts]);

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
