
import { handleFormattingError, executeWithFallback } from './errorHandling';
import { applyStyleToSelection, applyAlignmentToSelection } from './modernFormatting';
import { selectionCache } from './selectionCache';

export const applyBasicFormat = (command: string, value?: string): boolean => {
  return executeWithFallback(
    () => {
      const selection = selectionCache.getSelection();
      if (!selection) throw new Error('No selection available');

      if (!selectionCache.focusEditor()) {
        throw new Error('Could not focus editor');
      }

      if (!document.execCommand(command, false, value)) {
        throw new Error(`Command ${command} failed`);
      }
    },
    undefined,
    `basic formatting command: ${command}`
  );
};

export const applyTextStyle = (command: 'bold' | 'italic' | 'underline'): boolean => {
  // Use modern approach first, fallback to execCommand
  const styleMap: Record<string, Record<string, string>> = {
    bold: { fontWeight: 'bold' },
    italic: { fontStyle: 'italic' },
    underline: { textDecoration: 'underline' }
  };

  return applyStyleToSelection(styleMap[command]) || applyBasicFormat(command);
};

export const applyAlignment = (alignment: 'justifyLeft' | 'justifyCenter' | 'justifyRight'): boolean => {
  const alignmentMap: Record<string, string> = {
    justifyLeft: 'left',
    justifyCenter: 'center',
    justifyRight: 'right'
  };

  return applyAlignmentToSelection(alignmentMap[alignment]) || applyBasicFormat(alignment);
};

export const applyList = (listType: 'insertUnorderedList' | 'insertOrderedList'): boolean => {
  return applyBasicFormat(listType);
};
