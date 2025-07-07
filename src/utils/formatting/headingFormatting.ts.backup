
import { handleFormattingError, executeWithFallback } from './errorHandling';

export const applyHeading = (tag: 'h1' | 'h2' | 'h3' | 'p'): boolean => {
  const selection = window.getSelection();
  if (!selection) return false;

  return executeWithFallback(
    () => {
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editor) {
        editor.focus();
      }

      if (selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        const headingElement = document.createElement(tag);
        headingElement.textContent = selectedText;
        
        // Apply appropriate styling based on heading level
        switch (tag) {
          case 'h1':
            headingElement.style.fontSize = '2rem';
            headingElement.style.fontWeight = 'bold';
            headingElement.style.marginTop = '1rem';
            headingElement.style.marginBottom = '0.5rem';
            break;
          case 'h2':
            headingElement.style.fontSize = '1.5rem';
            headingElement.style.fontWeight = 'bold';
            headingElement.style.marginTop = '0.75rem';
            headingElement.style.marginBottom = '0.5rem';
            break;
          case 'h3':
            headingElement.style.fontSize = '1.25rem';
            headingElement.style.fontWeight = 'bold';
            headingElement.style.marginTop = '0.5rem';
            headingElement.style.marginBottom = '0.25rem';
            break;
          case 'p':
            headingElement.style.fontSize = '1rem';
            headingElement.style.fontWeight = 'normal';
            headingElement.style.marginTop = '0.25rem';
            headingElement.style.marginBottom = '0.25rem';
            break;
        }
        
        range.deleteContents();
        range.insertNode(headingElement);
        
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartAfter(headingElement);
        newRange.collapse(true);
        selection.addRange(newRange);
      } else {
        if (!document.execCommand('formatBlock', false, `<${tag}>`)) {
          throw new Error(`formatBlock command failed for ${tag}`);
        }
      }
    },
    undefined,
    `heading formatting: ${tag}`
  );
};
