
import { handleFormattingError, executeWithFallback } from './errorHandling';

export const applyFontColor = (color: string): boolean => {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim()) return false;

  return executeWithFallback(
    () => {
      document.execCommand('styleWithCSS', false, 'true');
      if (!document.execCommand('foreColor', false, color)) {
        throw new Error('foreColor command failed');
      }
    },
    () => {
      // Fallback: apply color directly via CSS
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const selectedContent = range.extractContents();
      
      const span = document.createElement('span');
      span.style.color = color;
      span.appendChild(selectedContent);
      
      range.insertNode(span);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    },
    'font color application'
  );
};

export const applyHighlight = (color: string): boolean => {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim()) return false;

  return executeWithFallback(
    () => {
      document.execCommand('styleWithCSS', false, 'true');
      if (!document.execCommand('hiliteColor', false, color)) {
        throw new Error('hiliteColor command failed');
      }
    },
    () => {
      // Fallback: apply background color directly via CSS
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const selectedContent = range.extractContents();
      
      const span = document.createElement('span');
      span.style.backgroundColor = color;
      span.appendChild(selectedContent);
      
      range.insertNode(span);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    },
    'highlight application'
  );
};

export const clearHighlight = (): boolean => {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim()) return false;

  return executeWithFallback(
    () => {
      document.execCommand('styleWithCSS', false, 'true');
      if (!document.execCommand('hiliteColor', false, 'transparent')) {
        throw new Error('clearHighlight command failed');
      }
    },
    () => {
      // Fallback: remove background color directly
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const selectedContent = range.extractContents();
      
      const span = document.createElement('span');
      span.style.backgroundColor = 'transparent';
      span.appendChild(selectedContent);
      
      range.insertNode(span);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    },
    'highlight clearing'
  );
};
