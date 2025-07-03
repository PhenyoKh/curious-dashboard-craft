
import { handleFormattingError, executeWithFallback } from './errorHandling';

export const applyFontFamily = (fontFamily: string): boolean => {
  const selection = window.getSelection();
  if (!selection) return false;

  return executeWithFallback(
    () => {
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editor) {
        editor.focus();
        if (!document.execCommand('fontName', false, fontFamily)) {
          throw new Error('fontName command failed');
        }
      }
    },
    () => {
      // Fallback: apply font family directly via CSS
      if (!selection.rangeCount || !selection.toString().trim()) return;
      
      const range = selection.getRangeAt(0);
      const selectedContent = range.extractContents();
      
      const span = document.createElement('span');
      span.style.fontFamily = fontFamily;
      span.appendChild(selectedContent);
      
      range.insertNode(span);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    },
    'font family application'
  );
};

export const applyFontSize = (sizeValue: string): boolean => {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim() || !selection.rangeCount) return false;

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
      
      // Get the range and selected content
      const range = selection.getRangeAt(0);
      const selectedContent = range.extractContents();
      
      // Create span with font size
      const span = document.createElement('span');
      span.style.fontSize = fontSize;
      span.appendChild(selectedContent);
      
      // Insert the styled span
      range.insertNode(span);
      
      // Clear selection and place cursor after the span
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    },
    undefined,
    'font size application'
  );
};
