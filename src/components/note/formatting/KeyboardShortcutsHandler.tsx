
import { useEffect, useMemo } from 'react';
import { HighlightCategories, Highlight } from '@/types/highlight';

interface KeyboardShortcutsHandlerProps {
  onFormatText: (command: string, value?: string) => void;
  activeHighlight: string | null;
  onKeyboardHighlight: (colorKey: string) => void;
  categories?: HighlightCategories;
  addHighlight?: (category: keyof HighlightCategories, text: string) => Highlight;
  onContentChange?: () => void;
}

const KeyboardShortcutsHandler: React.FC<KeyboardShortcutsHandlerProps> = ({
  onFormatText,
  activeHighlight,
  onKeyboardHighlight,
  categories,
  addHighlight,
  onContentChange
}) => {
  // Color mapping for keyboard shortcuts - memoized to prevent recreation on every render
  const colorShortcuts = useMemo(() => ({
    '1': { color: '#ffcdd2', name: 'Red - Key Definition', category: 'red' },
    '2': { color: '#fff9c4', name: 'Yellow - Main Principle', category: 'yellow' },
    '3': { color: '#c8e6c9', name: 'Green - Example', category: 'green' },
    '4': { color: '#bbdefb', name: 'Blue - To Review', category: 'blue' }
  }), []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        // Highlighting shortcuts
        if (colorShortcuts[key as keyof typeof colorShortcuts]) {
          e.preventDefault();
          
          const selection = window.getSelection();
          const selectedText = selection?.toString().trim();
          
          if (selectedText && categories && addHighlight) {
            // Add to highlighting system
            const shortcut = colorShortcuts[key as keyof typeof colorShortcuts];
            const highlight = addHighlight(shortcut.category as keyof HighlightCategories, selectedText);
            
            // Create highlight in editor
            const range = selection!.getRangeAt(0);
            const span = document.createElement('span');
            span.style.backgroundColor = shortcut.color;
            span.style.position = 'relative';
            span.style.padding = '2px 4px';
            span.style.borderRadius = '3px';
            
            // Add numbered badge
            const badge = document.createElement('span');
            badge.className = 'highlight-badge';
            badge.style.cssText = `
              position: absolute;
              top: -8px;
              right: -8px;
              background: #374151;
              color: white;
              font-size: 10px;
              padding: 2px 4px;
              border-radius: 50%;
              min-width: 16px;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              cursor: pointer;
            `;
            badge.textContent = highlight.number.toString();
            badge.onclick = () => {
              console.log('Scroll to highlight card:', highlight.id);
            };
            
            span.appendChild(range.extractContents());
            span.appendChild(badge);
            range.insertNode(span);
            
            selection.removeAllRanges();
            
            if (onContentChange) {
              onContentChange();
            }
          } else {
            // Fallback to original highlighting behavior
            onKeyboardHighlight(key);
          }
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
  }, [activeHighlight, onFormatText, onKeyboardHighlight, colorShortcuts, categories, addHighlight, onContentChange]);

  return null; // This component only handles keyboard events
};

export default KeyboardShortcutsHandler;
