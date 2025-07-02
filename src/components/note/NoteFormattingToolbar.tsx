
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
      // Toggle active highlight state for visual feedback
      setActiveHighlight(activeHighlight === color ? null : color);
    }
  };

  const handleClearHighlight = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
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
    }
  };

  const isFormatActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        // Highlighting shortcuts
        if (colorShortcuts[key as keyof typeof colorShortcuts]) {
          e.preventDefault();
          handleKeyboardHighlight(key);
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
  }, [activeHighlight, onFormatText]);

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
          onClearHighlight={handleClearHighlight}
          onFontColorClick={handleFontColorClick}
          activeHighlight={activeHighlight}
          activeFontColor={activeFontColor}
        />
        
        <InsertButtons onFormatText={onFormatText} />
        
        <ViewButtons wordCount={wordCount} />
      </div>
      
      {/* Keyboard Shortcuts Legend */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-600 mb-2 font-medium">Keyboard Shortcuts:</div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+B</kbd> Bold
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+I</kbd> Italic
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+U</kbd> Underline
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-200"></span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+1</kbd> Key Definition
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-200"></span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+2</kbd> Main Principle
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-200"></span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+3</kbd> Example
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-200"></span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+4</kbd> To Review
          </span>
        </div>
      </div>
    </div>
  );
};

export default NoteFormattingToolbar;
