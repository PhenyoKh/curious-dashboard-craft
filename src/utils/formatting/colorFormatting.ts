
import { handleFormattingError, executeWithFallback } from './errorHandling';
import { getSelectionInfo, applyStyleToRange, clearSelectionAndMoveCursor } from './selectionUtils';

export const applyFontColor = (color: string): boolean => {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) return false;

  return executeWithFallback(
    () => {
      document.execCommand('styleWithCSS', false, 'true');
      if (!document.execCommand('foreColor', false, color)) {
        throw new Error('foreColor command failed');
      }
    },
    () => {
      applyStyleToRange(selectionInfo.range, { color });
      clearSelectionAndMoveCursor(selectionInfo.range.endContainer);
    },
    'font color application'
  );
};

export const applyHighlight = (color: string): boolean => {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) return false;

  return executeWithFallback(
    () => {
      document.execCommand('styleWithCSS', false, 'true');
      if (!document.execCommand('hiliteColor', false, color)) {
        throw new Error('hiliteColor command failed');
      }
    },
    () => {
      applyStyleToRange(selectionInfo.range, { backgroundColor: color });
      clearSelectionAndMoveCursor(selectionInfo.range.endContainer);
    },
    'highlight application'
  );
};

export const clearHighlight = (): boolean => {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) return false;

  return executeWithFallback(
    () => {
      document.execCommand('styleWithCSS', false, 'true');
      if (!document.execCommand('hiliteColor', false, 'transparent')) {
        throw new Error('clearHighlight command failed');
      }
    },
    () => {
      applyStyleToRange(selectionInfo.range, { backgroundColor: 'transparent' });
      clearSelectionAndMoveCursor(selectionInfo.range.endContainer);
    },
    'highlight clearing'
  );
};
