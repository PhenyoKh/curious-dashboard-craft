
import React from 'react';
import { formatText } from '@/utils/formatting/textFormatting';
import KeyboardShortcutsHandler from './formatting/KeyboardShortcutsHandler';
import HighlightLogic from './formatting/HighlightLogic';
import FormattingToolbarContent from './formatting/FormattingToolbarContent';
import { HighlightCategories } from '@/types/highlight';

interface NoteFormattingToolbarProps {
  onFormatText: (command: string, value?: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  wordCount: number;
  onActiveFontColorChange?: (color: string) => void;
  categories?: HighlightCategories;
  addHighlight?: (category: keyof HighlightCategories, text: string) => any;
  onContentChange?: () => void;
}

const NoteFormattingToolbar: React.FC<NoteFormattingToolbarProps> = ({
  onFormatText,
  wordCount,
  onActiveFontColorChange,
  categories,
  addHighlight,
  onContentChange
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
      }) => {
        // Notify parent of active font color changes
        React.useEffect(() => {
          if (onActiveFontColorChange) {
            onActiveFontColorChange(activeFontColor);
          }
        }, [activeFontColor]);

        return (
          <>
            <KeyboardShortcutsHandler
              onFormatText={onFormatText}
              activeHighlight={activeHighlight}
              onKeyboardHighlight={handleKeyboardHighlight}
              categories={categories}
              addHighlight={addHighlight}
              onContentChange={onContentChange}
            />
            
            <div className="px-6 py-3 overflow-x-auto border-b-2 border-gray-200" data-toolbar="formatting">
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
            </div>
          </>
        );
      }}
    </HighlightLogic>
  );
};

export default NoteFormattingToolbar;
