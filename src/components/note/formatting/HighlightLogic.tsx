
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
      
      // Clear selection after applying
      setTimeout(() => {
        if (selection) {
          selection.removeAllRanges();
        }
      }, 100);
    } else {
      // Toggle active highlight state for future text selection/typing
      const newActiveHighlight = activeHighlight === color ? null : color;
      setActiveHighlight(newActiveHighlight);
      
      // Set up the highlight for next text input
      if (newActiveHighlight) {
        // Store the highlight color in a data attribute on the editor
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
          editor.dataset.nextHighlight = color;
          editor.focus();
        }
      } else {
        // Clear the stored highlight
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
          delete editor.dataset.nextHighlight;
        }
      }
    }
  };

  const handleClearHighlight = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      onFormatText('hiliteColor', 'transparent');
    }
    
    // Clear active state and stored highlight
    setActiveHighlight(null);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      delete editor.dataset.nextHighlight;
    }
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

  // Handle text input to apply pending highlight
  useEffect(() => {
    const handleInput = (e: Event) => {
      const editor = e.target as HTMLElement;
      if (editor && editor.dataset.nextHighlight) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          // Apply highlight to the newly typed text
          const range = selection.getRangeAt(0);
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const span = document.createElement('span');
            span.style.backgroundColor = editor.dataset.nextHighlight;
            
            try {
              range.surroundContents(span);
            } catch {
              // If surrounding fails, wrap the text node
              const textNode = range.startContainer;
              if (textNode.parentNode) {
                span.textContent = textNode.textContent || '';
                textNode.parentNode.replaceChild(span, textNode);
              }
            }
          }
        }
      }
    };

    const editor = document.querySelector('[contenteditable="true"]');
    if (editor) {
      editor.addEventListener('input', handleInput);
      return () => editor.removeEventListener('input', handleInput);
    }
  }, []);

  // Clear active states when clicking elsewhere
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const toolbar = document.querySelector('[data-toolbar="formatting"]');
      const editor = document.querySelector('[contenteditable="true"]');
      
      if (toolbar && !toolbar.contains(e.target as Node) && 
          editor && !editor.contains(e.target as Node)) {
        setActiveHighlight(null);
        if (editor) {
          delete (editor as HTMLElement).dataset.nextHighlight;
        }
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
