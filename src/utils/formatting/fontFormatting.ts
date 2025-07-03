
import { handleFormattingError, executeWithFallback } from './errorHandling';
import { getSelectionInfo, applyStyleToRange, clearSelectionAndMoveCursor } from './selectionUtils';
import { selectionCache } from './selectionCache';

export const applyFontFamily = (fontFamily: string): boolean => {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo) return false;

  return executeWithFallback(
    () => {
      if (!selectionCache.focusEditor()) {
        throw new Error('Could not focus editor');
      }
      
      if (!document.execCommand('fontName', false, fontFamily)) {
        throw new Error('fontName command failed');
      }
    },
    () => {
      // Fallback: apply font family directly via CSS
      if (!selectionInfo.hasSelection) return;
      
      applyStyleToRange(selectionInfo.range, { fontFamily });
      clearSelectionAndMoveCursor(selectionInfo.range.endContainer);
    },
    'font family application'
  );
};

export const applyFontSize = (sizeValue: string): boolean => {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) return false;

  return executeWithFallback(
    () => {
      // Map size names to actual CSS font sizes
      let fontSize = '16px'; // Default
      
      switch (sizeValue) {
        case 'Small':
          fontSize = '12px';
          break;
        case 'Normal':
          fontSize = '16px';
          break;
        case 'Large':
          fontSize = '24px';
          break;
        default:
          fontSize = '16px';
      }
      
      applyStyleToRange(selectionInfo.range, { fontSize });
      clearSelectionAndMoveCursor(selectionInfo.range.endContainer);
    },
    undefined,
    'font size application'
  );
};
