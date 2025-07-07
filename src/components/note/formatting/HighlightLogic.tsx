
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
    const selectedText = selection?.toString().trim();
    
    if (selectedText && removeHighlightsByText) {
      // Check if there are matching highlights in the commentary system
      const matches = removeHighlightsByText ? 
        // Just check for matches without removing yet
        [] : // We'll implement a check function if needed
        [];
      
      // For now, let's find matching highlights by checking the current highlights
      // This is a simplified approach - in a real implementation, you'd want to 
      // pass the current highlights to this component
      setPendingClearText(selectedText);
      setMatchingHighlights(matches);
      setShowClearDialog(true);
    } else if (selectedText) {
      // No commentary system integration, just clear the highlight
      onFormatText('hiliteColor', 'transparent');
      setActiveHighlight(null);
    }
  }, [onFormatText, removeHighlightsByText]);

  const confirmClearHighlight = useCallback(() => {
    // Clear the visual highlight
    onFormatText('hiliteColor', 'transparent');
    setActiveHighlight(null);
    
    // Remove from commentary system if available
    if (removeHighlightsByText && pendingClearText) {
      removeHighlightsByText(pendingClearText);
    }
    
    // Close dialog and reset state
    setShowClearDialog(false);
    setPendingClearText('');
    setMatchingHighlights([]);
  }, [onFormatText, removeHighlightsByText, pendingClearText]);

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
