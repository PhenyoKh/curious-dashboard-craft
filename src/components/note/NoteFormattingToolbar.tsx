
import React from 'react';
import TextFormattingButtons from './formatting/TextFormattingButtons';
import HeadingButtons from './formatting/HeadingButtons';
import ListButtons from './formatting/ListButtons';
import AlignmentButtons from './formatting/AlignmentButtons';
import ColorButtons from './formatting/ColorButtons';
import InsertButtons from './formatting/InsertButtons';
import ViewButtons from './formatting/ViewButtons';
import KeyboardShortcutsHandler from './formatting/KeyboardShortcutsHandler';
import ShortcutsLegend from './formatting/ShortcutsLegend';
import HighlightLogic from './formatting/HighlightLogic';

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
  const isFormatActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  return (
    <HighlightLogic onFormatText={onFormatText}>
      {({
        activeHighlight,
        activeFontColor,
        handleHighlightClick,
        handleClearHighlight,
        handleFontColorClick,
        handleKeyboardHighlight
      }) => (
        <>
          <KeyboardShortcutsHandler
            onFormatText={onFormatText}
            activeHighlight={activeHighlight}
            onKeyboardHighlight={handleKeyboardHighlight}
          />
          
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
            
            <ShortcutsLegend />
          </div>
        </>
      )}
    </HighlightLogic>
  );
};

export default NoteFormattingToolbar;
