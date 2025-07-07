import { useState, useCallback, useMemo } from 'react';
import ClearHighlightDialog from '../highlighting/ClearHighlightDialog';

interface HighlightLogicProps {
  onFormatText: (command: string, value?: string) => void;
  removeHighlightsByText?: (text: string) => any[];
  children: (props: {
    activeHighlight: string | null;
    activeFontColor: string;
    handleHighlightClick: (color: string) => void;
    handleClearHighlight: () => void;
    handleFontColorClick: (color: string) => void;
    handleKeyboardHighlight: (colorKey: string) => void;
  }) => React.ReactNode;
}

const HighlightLogic: React.FC<HighlightLogicProps> = ({ 
  onFormatText, 
  removeHighlightsByText,
  children 
}) => {
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [activeFontColor, setActiveFontColor] = useState<string>('#000000');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [pendingClearText, setPendingClearText] = useState<string>('');
  const [matchingHighlights, setMatchingHighlights] = useState<any[]>([]);

  // Color mapping for keyboard shortcuts - memoized to prevent recreation on every render
  const colorShortcuts = useMemo(() => ({
    '1': { color: '#ffcdd2', name: 'Red - Key Definition' },
    '2': { color: '#fff9c4', name: 'Yellow - Main Principle' },
    '3': { color: '#c8e6c9', name: 'Green - Example' },
    '4': { color: '#bbdefb', name: 'Blue - To Review' }
  }), []);

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

  const handleClearHighlight = useCallback(() => {
    console.log('Clear highlight click');
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      console.log('No selection found');
      return;
    }

    // Get the selected text
    const selectedText = selection.toString().trim();
    console.log('Selected text for clearing:', selectedText);
    
    if (!selectedText) {
      console.log('No text selected for clearing');
      return;
    }

    // Check if there are matching highlights in the commentary system
    let matches: any[] = [];
    if (removeHighlightsByText) {
      matches = removeHighlightsByText(selectedText);
    }
    
    setPendingClearText(selectedText);
    setMatchingHighlights(matches);
    setShowClearDialog(true);
  }, [removeHighlightsByText]);

  const confirmClearHighlight = useCallback(() => {
    console.log('Confirming clear highlight for text:', pendingClearText);
    
    // Get the current selection again
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Find all highlighted spans within the selection
      const parentElement = range.commonAncestorContainer;
      const walker = document.createTreeWalker(
        parentElement.nodeType === Node.TEXT_NODE ? parentElement.parentElement! : parentElement,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node: Element) => {
            if (node.tagName === 'SPAN') {
              const htmlElement = node as HTMLElement;
              if (htmlElement.style.backgroundColor || node.querySelector('.highlight-badge')) {
                return NodeFilter.FILTER_ACCEPT;
              }
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      const highlightedSpans: HTMLElement[] = [];
      let node;
      while (node = walker.nextNode()) {
        // Check if this span contains the selected text
        const spanText = node.textContent?.trim();
        if (spanText && pendingClearText.includes(spanText)) {
          highlightedSpans.push(node as HTMLElement);
        }
      }

      // Remove highlighting from found spans
      highlightedSpans.forEach(span => {
        // Remove the badge if it exists
        const badge = span.querySelector('.highlight-badge');
        if (badge) {
          badge.remove();
        }
        
        // Remove background color
        span.style.backgroundColor = 'transparent';
        
        // If the span only had highlighting, unwrap it
        if (!span.style.color && 
            !span.style.fontWeight && 
            !span.style.fontStyle) {
          const parent = span.parentNode;
          if (parent) {
            while (span.firstChild) {
              parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
          }
        }
      });
    }
    
    // Also try the traditional approach
    onFormatText('hiliteColor', 'transparent');
    setActiveHighlight(null);
    
    // Close dialog and reset state
    setShowClearDialog(false);
    setPendingClearText('');
    setMatchingHighlights([]);
  }, [onFormatText, pendingClearText]);

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
      
      <ClearHighlightDialog
        isOpen={showClearDialog}
        onClose={() => {
          setShowClearDialog(false);
          setPendingClearText('');
          setMatchingHighlights([]);
        }}
        onConfirm={confirmClearHighlight}
        highlightCount={matchingHighlights.length}
      />
    </>
  );
};

export default HighlightLogic;
