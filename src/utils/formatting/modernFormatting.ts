
import { handleFormattingError, executeWithFallback } from './errorHandling';

// Modern alternative to document.execCommand for text styling
export const applyStyleToSelection = (styles: Record<string, string>): boolean => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !selection.toString().trim()) {
    return false;
  }

  return executeWithFallback(
    () => {
      const range = selection.getRangeAt(0);
      const selectedContent = range.extractContents();
      
      const span = document.createElement('span');
      Object.assign(span.style, styles);
      span.appendChild(selectedContent);
      
      range.insertNode(span);
      
      // Clear selection and place cursor after the span
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
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
      const selection = window.getSelection();
      if (!selection) return;

      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (!editor) return;

      editor.focus();
      
      // Try modern approach first
      if (document.queryCommandSupported(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`)) {
        document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`, false);
      }
    },
    () => {
      // Fallback: apply CSS directly to selected block
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      
      let blockElement = commonAncestor.nodeType === Node.TEXT_NODE 
        ? commonAncestor.parentElement 
        : commonAncestor as Element;
      
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
