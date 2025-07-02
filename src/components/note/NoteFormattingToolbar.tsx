
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
    // Check if the current selection already has this highlight color
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentElement = range.commonAncestorContainer.parentElement;
      
      // If already highlighted with this color, remove the highlight
      if (parentElement && parentElement.style.backgroundColor === color) {
        onFormatText('hiliteColor', 'transparent');
        setActiveHighlight(null);
        return;
      }
    }
    
    // Apply the highlight color
    onFormatText('hiliteColor', color);
    setActiveHighlight(color);
  };

  const handleKeyboardHighlight = (colorKey: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const colorInfo = colorShortcuts[colorKey as keyof typeof colorShortcuts];
      if (colorInfo) {
        handleHighlightClick(colorInfo.color);
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
  }, []);

  // Check for active highlight on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.parentElement;
        
        if (parentElement && parentElement.style.backgroundColor) {
          const bgColor = parentElement.style.backgroundColor;
          // Convert rgb to hex or handle different color formats
          const colorMap: { [key: string]: string } = {
            'rgb(255, 205, 210)': '#ffcdd2',
            'rgb(187, 222, 251)': '#bbdefb',
            'rgb(200, 230, 201)': '#c8e6c9',
            'rgb(255, 249, 196)': '#fff9c4'
          };
          setActiveHighlight(colorMap[bgColor] || bgColor);
        } else {
          setActiveHighlight(null);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  return (
    <div className="px-6 py-3 overflow-x-auto">
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
