
import React, { useState, useEffect } from 'react';
import TextFormattingButtons from './formatting/TextFormattingButtons';
import HeadingButtons from './formatting/HeadingButtons';
import ListButtons from './formatting/ListButtons';
import AlignmentButtons from './formatting/AlignmentButtons';
import ColorButtons from './formatting/ColorButtons';
import InsertButtons from './formatting/InsertButtons';
import ViewButtons from './formatting/ViewButtons';

interface NoteFormattingToolbarProps {
  onFormatText: (command: string, value?: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  wordCount: number;
}

const NoteFormattingToolbar: React.FC<NoteFormattingToolbarProps> = ({
  onFormatText,
  wordCount
}) => {
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  // Color mapping for keyboard shortcuts
  const colorShortcuts = {
    'y': { color: '#fff9c4', name: 'Yellow - Key Concepts/Definitions' },
    'b': { color: '#bbdefb', name: 'Blue - Facts/Formulas/Dates' },
    'g': { color: '#c8e6c9', name: 'Green - Examples/Explanations' },
    'r': { color: '#ffcdd2', name: 'Red - To Review/Struggle Spots' }
  };

  const handleHighlightClick = (color: string) => {
    const selection = window.getSelection();
    
    // Only apply highlighting if there's selected text
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const parentElement = range.commonAncestorContainer.parentElement;
      
      // If already highlighted with this color, remove the highlight
      if (parentElement && parentElement.style.backgroundColor === color) {
        onFormatText('hiliteColor', 'transparent');
        setActiveHighlight(null);
        return;
      }
      
      // Apply the highlight color
      onFormatText('hiliteColor', color);
      
      // Clear selection after highlighting to prevent continued highlighting
      setTimeout(() => {
        selection.removeAllRanges();
        setActiveHighlight(null);
      }, 100);
    } else {
      // Toggle active highlight state for visual feedback
      if (activeHighlight === color) {
        setActiveHighlight(null);
      } else {
        setActiveHighlight(color);
      }
    }
  };

  const handleKeyboardHighlight = (colorKey: string) => {
    const selection = window.getSelection();
    const colorInfo = colorShortcuts[colorKey as keyof typeof colorShortcuts];
    
    if (selection && selection.toString().trim() && colorInfo) {
      // Apply highlight to selected text
      handleHighlightClick(colorInfo.color);
    } else if (colorInfo) {
      // Toggle active highlight state for visual feedback
      if (activeHighlight === colorInfo.color) {
        setActiveHighlight(null);
      } else {
        setActiveHighlight(colorInfo.color);
      }
    }
  };

  const isFormatActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  // Handle keyboard shortcuts for highlighting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (colorShortcuts[key as keyof typeof colorShortcuts]) {
          e.preventDefault();
          handleKeyboardHighlight(key);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeHighlight]);

  // Clear active highlight when clicking elsewhere or typing
  useEffect(() => {
    const handleInput = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount === 0) {
        setActiveHighlight(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Clear active highlight if clicking outside the toolbar
      const toolbar = document.querySelector('[data-toolbar="formatting"]');
      if (toolbar && !toolbar.contains(e.target as Node)) {
        setActiveHighlight(null);
      }
    };

    document.addEventListener('input', handleInput);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="px-6 py-3 overflow-x-auto" data-toolbar="formatting">
      <div className="flex items-center gap-8 min-w-max">
        <TextFormattingButtons 
          onFormatText={onFormatText} 
          isFormatActive={isFormatActive} 
        />
        
        <HeadingButtons onFormatText={onFormatText} />
        
        <ListButtons 
          onFormatText={onFormatText} 
          isFormatActive={isFormatActive} 
        />
        
        <AlignmentButtons 
          onFormatText={onFormatText} 
          isFormatActive={isFormatActive} 
        />
        
        <ColorButtons 
          onFormatText={onFormatText} 
          onHighlightClick={handleHighlightClick}
          activeHighlight={activeHighlight}
        />
        
        <InsertButtons onFormatText={onFormatText} />
        
        <ViewButtons wordCount={wordCount} />
      </div>
      
      {/* Active Highlight Indicator */}
      {activeHighlight && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full border border-gray-400"
              style={{ backgroundColor: activeHighlight }}
            ></span>
            <span className="font-medium">Active Highlighter</span>
            <span className="text-xs text-gray-500">(Select text to highlight, or click again to deactivate)</span>
          </span>
        </div>
      )}
      
      {/* Keyboard Shortcuts Legend */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-600 mb-2 font-medium">Highlight Shortcuts:</div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-200"></span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+Y</kbd> Key Concepts
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-200"></span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+B</kbd> Facts/Formulas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-200"></span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+G</kbd> Examples
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-200"></span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+R</kbd> To Review
          </span>
        </div>
      </div>
    </div>
  );
};

export default NoteFormattingToolbar;
