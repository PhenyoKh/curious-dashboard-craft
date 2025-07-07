
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
  removeHighlightsByText?: (text: string) => any[];
  onContentChange?: () => void;
}

const NoteFormattingToolbar: React.FC<NoteFormattingToolbarProps> = ({
  onFormatText,
  wordCount,
  onActiveFontColorChange,
  categories,
  addHighlight,
  removeHighlightsByText,
  onContentChange
}) => {
  // Secure replacement for deprecated queryCommandState
  const VALID_FORMAT_COMMANDS = [
    'bold', 'italic', 'underline', 'strikeThrough',
    'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
    'insertOrderedList', 'insertUnorderedList'
  ] as const;

  type ValidFormatCommand = typeof VALID_FORMAT_COMMANDS[number];

  const isValidCommand = (command: string): command is ValidFormatCommand => {
    return VALID_FORMAT_COMMANDS.includes(command as ValidFormatCommand);
  };

  const isFormatActive = (command: string): boolean => {
    // Validate command against whitelist
    if (!isValidCommand(command)) {
      console.warn(`Invalid format command: ${command}`);
      return false;
    }

    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return false;
      }

      // Get the current selection range
      const range = selection.getRangeAt(0);
      const element = range.commonAncestorContainer;
      
      // Find the closest element node
      const targetElement = element.nodeType === Node.TEXT_NODE 
        ? element.parentElement 
        : element as Element;

      if (!targetElement) return false;

      // Check formatting based on command type
      switch (command) {
        case 'bold':
          return checkBoldState(targetElement);
        case 'italic':
          return checkItalicState(targetElement);
        case 'underline':
          return checkUnderlineState(targetElement);
        case 'strikeThrough':
          return checkStrikeThroughState(targetElement);
        case 'justifyLeft':
        case 'justifyCenter':
        case 'justifyRight':
        case 'justifyFull':
          return checkAlignmentState(targetElement, command);
        case 'insertOrderedList':
          return checkListState(targetElement, 'ol');
        case 'insertUnorderedList':
          return checkListState(targetElement, 'ul');
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking format active state:', error);
      return false;
    }
  };

  // Helper functions for checking specific formatting states
  const checkBoldState = (element: Element): boolean => {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.fontWeight === 'bold' || 
           computedStyle.fontWeight === '700' ||
           parseInt(computedStyle.fontWeight) >= 600;
  };

  const checkItalicState = (element: Element): boolean => {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.fontStyle === 'italic';
  };

  const checkUnderlineState = (element: Element): boolean => {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.textDecoration.includes('underline');
  };

  const checkStrikeThroughState = (element: Element): boolean => {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.textDecoration.includes('line-through');
  };

  const checkAlignmentState = (element: Element, command: string): boolean => {
    const computedStyle = window.getComputedStyle(element);
    const textAlign = computedStyle.textAlign;
    
    switch (command) {
      case 'justifyLeft':
        return textAlign === 'left' || textAlign === 'start';
      case 'justifyCenter':
        return textAlign === 'center';
      case 'justifyRight':
        return textAlign === 'right' || textAlign === 'end';
      case 'justifyFull':
        return textAlign === 'justify';
      default:
        return false;
    }
  };

  const checkListState = (element: Element, listType: 'ol' | 'ul'): boolean => {
    let currentElement: Element | null = element;
    
    while (currentElement && currentElement !== document.body) {
      if (currentElement.tagName.toLowerCase() === listType) {
        return true;
      }
      currentElement = currentElement.parentElement;
    }
    
    return false;
  };

  return (
    <HighlightLogic 
      onFormatText={onFormatText}
      removeHighlightsByText={removeHighlightsByText}
    >
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
