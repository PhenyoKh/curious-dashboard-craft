
import { useEffect, useMemo } from 'react';

interface KeyboardShortcutsHandlerProps {
  onFormatText: (command: string, value?: string) => void;
  activeHighlight: string | null;
  onKeyboardHighlight: (colorKey: string) => void;
}

const KeyboardShortcutsHandler: React.FC<KeyboardShortcutsHandlerProps> = ({
  onFormatText,
  activeHighlight,
  onKeyboardHighlight
}) => {
  // Color mapping for keyboard shortcuts - memoized to prevent recreation on every render
  const colorShortcuts = useMemo(() => ({
    '1': { color: '#ffcdd2', name: 'Red - Key Definition' },
    '2': { color: '#fff9c4', name: 'Yellow - Main Principle' },
    '3': { color: '#c8e6c9', name: 'Green - Example' },
    '4': { color: '#bbdefb', name: 'Blue - To Review' }
  }), []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        // Highlighting shortcuts
        if (colorShortcuts[key as keyof typeof colorShortcuts]) {
          e.preventDefault();
          onKeyboardHighlight(key);
        }
        
        // Basic formatting shortcuts
        switch(key) {
          case 'b':
            e.preventDefault();
            onFormatText('bold');
            break;
          case 'i':
            e.preventDefault();
            onFormatText('italic');
            break;
          case 'u':
            e.preventDefault();
            onFormatText('underline');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeHighlight, onFormatText, onKeyboardHighlight, colorShortcuts]);

  return null; // This component only handles keyboard events
};

export default KeyboardShortcutsHandler;
