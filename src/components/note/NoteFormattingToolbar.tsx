
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

  const isFormatActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

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
    </div>
  );
};

export default NoteFormattingToolbar;
