
import { handleFormattingError, executeWithFallback } from './errorHandling';
import { getSelectionInfo, applyStyleToRange, clearSelectionAndMoveCursor } from './selectionUtils';
import { selectionCache } from './selectionCache';

// Modern alternative to document.execCommand for text styling
export const applyStyleToSelection = (styles: Record<string, string>): boolean => {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) {
    return false;
  }

  return executeWithFallback(
    () => {
      applyStyleToRange(selectionInfo.range, styles);
      clearSelectionAndMoveCursor(selectionInfo.range.endContainer);
    },
    () => {
      // Fallback: try with document.execCommand if available
      const firstStyleKey = Object.keys(styles)[0];
      const firstStyleValue = styles[firstStyleKey];
      
      if (firstStyleKey === 'fontWeight' && firstStyleValue === 'bold') {
        document.execCommand('bold', false);
      } else if (firstStyleKey === 'fontStyle' && firstStyleValue === 'italic') {
        document.execCommand('italic', false);
      } else if (firstStyleKey === 'textDecoration' && firstStyleValue === 'underline') {
        document.execCommand('underline', false);
      }
    },
    'modern style application'
  );
};

// Modern alternative for text alignment
export const applyAlignmentToSelection = (alignment: string): boolean => {
  return executeWithFallback(
    () => {
      if (!selectionCache.focusEditor()) {
        throw new Error('Could not focus editor');
      }
      
      // Try modern approach first
      if (document.queryCommandSupported(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`)) {
        document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`, false);
      }
    },
    () => {
      // Fallback: apply CSS directly to selected block
      const selectionInfo = getSelectionInfo();
      if (!selectionInfo) return;

      let blockElement = selectionInfo.range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? selectionInfo.range.commonAncestorContainer.parentElement 
        : selectionInfo.range.commonAncestorContainer as Element;
      
      while (blockElement && !['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockElement.tagName)) {
        blockElement = blockElement.parentElement;
      }
      
      if (blockElement) {
        (blockElement as HTMLElement).style.textAlign = alignment;
      }
    },
    'text alignment'
  );
};
