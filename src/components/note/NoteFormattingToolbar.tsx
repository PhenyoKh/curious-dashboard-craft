
import React from 'react';
import { formatText } from '@/utils/formatting/textFormatting';
import KeyboardShortcutsHandler from './formatting/KeyboardShortcutsHandler';
import ShortcutsLegend from './formatting/ShortcutsLegend';
import HighlightLogic from './formatting/HighlightLogic';
import FormattingToolbarContent from './formatting/FormattingToolbarContent';

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
            <FormattingToolbarContent
              onFormatText={onFormatText}
              isFormatActive={isFormatActive}
              wordCount={wordCount}
              activeHighlight={activeHighlight}
              activeFontColor={activeFontColor}
              onHighlightClick={handleHighlightClick}
              onClearHighlight={handleClearHighlight}
              onFontColorClick={handleFontColorClick}
            />
            
            <ShortcutsLegend />
          </div>
        </>
      )}
    </HighlightLogic>
  );
};

export default NoteFormattingToolbar;
