
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
      // Apply highlighting to selected text
      onFormatText('hiliteColor', color);
      setActiveHighlight(null); // Clear active state after applying
      
      // Clear selection to prevent continued highlighting
      setTimeout(() => {
        if (selection) {
          selection.removeAllRanges();
        }
      }, 100);
    } else {
      // Set active highlight state and prepare for next text selection/typing
      setActiveHighlight(activeHighlight === color ? null : color);
      
      // Apply highlight color for next typing if no text is selected
      if (activeHighlight !== color) {
        onFormatText('hiliteColor', color);
      } else {
        // Clear highlight if toggling off
        onFormatText('hiliteColor', 'transparent');
      }
    }
  };

  const handleClearHighlight = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      onFormatText('hiliteColor', 'transparent');
    } else {
      // Clear for future typing
      onFormatText('hiliteColor', 'transparent');
    }
    setActiveHighlight(null);
  };

  const handleFontColorClick = (color: string) => {
    onFormatText('foreColor', color);
    setActiveFontColor(color);
  };

  const handleKeyboardHighlight = (colorKey: string) => {
    const selection = window.getSelection();
    const colorInfo = colorShortcuts[colorKey as keyof typeof colorShortcuts];
    
    if (selection && selection.toString().trim() && colorInfo) {
      handleHighlightClick(colorInfo.color);
    } else if (colorInfo) {
      setActiveHighlight(activeHighlight === colorInfo.color ? null : colorInfo.color);
      // Apply for next typing
      if (activeHighlight !== colorInfo.color) {
        onFormatText('hiliteColor', colorInfo.color);
      } else {
        onFormatText('hiliteColor', 'transparent');
      }
    }
  };

  // Clear active states when clicking elsewhere
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const toolbar = document.querySelector('[data-toolbar="formatting"]');
      if (toolbar && !toolbar.contains(e.target as Node)) {
        setActiveHighlight(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
