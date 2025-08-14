
import { useState, useCallback } from 'react';
import type { Highlight } from '@/types/highlight';

interface UseClearHighlightProps {
  onFormatText: (command: string, value?: string) => void;
  removeHighlightsByText?: (text: string) => Highlight[];
}

export const useClearHighlight = ({ onFormatText, removeHighlightsByText }: UseClearHighlightProps) => {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [pendingClearText, setPendingClearText] = useState<string>('');
  const [matchingHighlights, setMatchingHighlights] = useState<Highlight[]>([]);

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
    let matches: Highlight[] = [];
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
      // eslint-disable-next-line no-cond-assign
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
    
    // Close dialog and reset state
    setShowClearDialog(false);
    setPendingClearText('');
    setMatchingHighlights([]);
  }, [onFormatText, pendingClearText]);

  const closeClearDialog = useCallback(() => {
    setShowClearDialog(false);
    setPendingClearText('');
    setMatchingHighlights([]);
  }, []);

  return {
    showClearDialog,
    matchingHighlights,
    handleClearHighlight,
    confirmClearHighlight,
    closeClearDialog
  };
};
