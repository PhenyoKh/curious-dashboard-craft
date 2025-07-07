
import React, { useCallback } from 'react';
import { HighlightCategories } from '@/types/highlight';

interface HighlightingNoteEditorProps {
  editorRef: React.RefObject<HTMLDivElement>;
  categories: HighlightCategories;
  addHighlight: (category: keyof HighlightCategories, text: string) => any;
  onContentChange: () => void;
  showPanel: boolean;
  onScrollToCard: (category: string, number: number) => void;
}

const HighlightingNoteEditor: React.FC<HighlightingNoteEditorProps> = ({
  editorRef,
  categories,
  addHighlight,
  onContentChange,
  showPanel,
  onScrollToCard
}) => {
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Create highlight menu
    const menu = document.createElement('div');
    menu.className = 'absolute bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 flex gap-2';
    menu.style.position = 'fixed';
    
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;

    // Add category buttons
    Object.entries(categories).forEach(([key, category]) => {
      const button = document.createElement('button');
      button.className = 'px-3 py-1 text-xs font-medium rounded border hover:bg-gray-50 transition-colors';
      button.style.borderColor = category.color;
      button.style.color = '#374151';
      button.textContent = category.name;
      
      button.onclick = () => {
        const highlight = addHighlight(key as keyof HighlightCategories, selectedText);
        
        // Wrap selected text with highlight
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.backgroundColor = category.color;
        span.style.position = 'relative';
        span.style.padding = '2px 4px';
        span.style.borderRadius = '3px';
        span.style.cursor = 'pointer';
        span.setAttribute('data-highlight-id', highlight.id);
        span.setAttribute('data-highlight-category', key);
        span.setAttribute('data-category-name', category.name);
        span.setAttribute('data-highlight-number', highlight.number.toString());
        
        // Add click handler to highlighted text
        span.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showPanel) {
            onScrollToCard(category.name, highlight.number);
          }
        });
        
        // Add numbered badge that is not editable
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
          user-select: none;
          pointer-events: auto;
        `;
        badge.textContent = highlight.number.toString();
        badge.setAttribute('contenteditable', 'false');
        badge.setAttribute('data-highlight-number', highlight.number.toString());
        badge.setAttribute('data-highlight-id', highlight.id);
        badge.setAttribute('data-category-name', category.name);
        
        // Add click handler to badge
        badge.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showPanel) {
            onScrollToCard(category.name, highlight.number);
          }
        });
        
        span.appendChild(range.extractContents());
        span.appendChild(badge);
        range.insertNode(span);
        
        selection.removeAllRanges();
        document.body.removeChild(menu);
        onContentChange();
      };
      
      menu.appendChild(button);
    });

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'px-2 py-1 text-xs text-gray-500 hover:text-gray-700';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => {
      selection.removeAllRanges();
      document.body.removeChild(menu);
    };
    menu.appendChild(closeBtn);

    document.body.appendChild(menu);

    // Remove menu when clicking elsewhere
    const handleClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', handleClickOutside);
      }
    };
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
  }, [categories, addHighlight, onContentChange, showPanel, onScrollToCard]);

  // Add click handlers to existing highlighted text
  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Define the handler function first
    const handleHighlightClick = (categoryName: string, highlightNumber: number) => {
      return (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (showPanel) {
          onScrollToCard(categoryName, highlightNumber);
        }
      };
    };

    const addClickHandlers = () => {
      const highlightedElements = editor.querySelectorAll('[data-highlight-id]');
      highlightedElements.forEach((element) => {
        const span = element as HTMLElement;
        const badge = span.querySelector('.highlight-badge') as HTMLElement;
        const categoryName = span.getAttribute('data-category-name');
        const highlightNumber = span.getAttribute('data-highlight-number');
        
        if (!categoryName || !highlightNumber) return;
        
        const number = parseInt(highlightNumber);
        const clickHandler = handleHighlightClick(categoryName, number);
        
        // Remove existing listeners to prevent duplicates
        span.removeEventListener('click', clickHandler);
        if (badge) {
          badge.removeEventListener('click', clickHandler);
        }
        
        // Add click handlers
        span.addEventListener('click', clickHandler);
        if (badge) {
          badge.addEventListener('click', clickHandler);
        }
      });
    };

    addClickHandlers();
    
    // Re-add handlers when content changes
    const observer = new MutationObserver(addClickHandlers);
    observer.observe(editor, { childList: true, subtree: true });

    editor.addEventListener('mouseup', handleTextSelection);
    
    return () => {
      editor.removeEventListener('mouseup', handleTextSelection);
      observer.disconnect();
    };
  }, [handleTextSelection, showPanel, onScrollToCard]);

  return null; // This component only adds event listeners
};

export default HighlightingNoteEditor;
