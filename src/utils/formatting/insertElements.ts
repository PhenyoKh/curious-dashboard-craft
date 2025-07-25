
import { handleFormattingError, executeWithFallback } from './errorHandling';
import { sanitizeHtml } from '../security';

export const insertCheckbox = (): boolean => {
  const checkbox = '<div contenteditable="false" style="display: inline-flex; align-items: center; margin: 4px 0;"><input type="checkbox" style="margin-right: 8px;"><span contenteditable="true">Task item</span></div><br>';
  
  return executeWithFallback(
    () => {
      if (!document.execCommand('insertHTML', false, checkbox)) {
        throw new Error('insertHTML command failed for checkbox');
      }
    },
    () => {
      // Fallback: insert via DOM manipulation (secure)
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = sanitizeHtml(checkbox);
      
      range.insertNode(div.firstChild!);
    },
    'checkbox insertion'
  );
};

export const insertTable = (): boolean => {
  const table = `
    <table style="border-collapse: collapse; margin: 10px 0; width: 100%; max-width: 600px;">
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6; background: #f8f9fa;">Header 1</td>
        <td style="padding: 8px; border: 1px solid #dee2e6; background: #f8f9fa;">Header 2</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6;">Cell 1</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">Cell 2</td>
      </tr>
    </table>
  `;
  
  return executeWithFallback(
    () => {
      if (!document.execCommand('insertHTML', false, table)) {
        throw new Error('insertHTML command failed for table');
      }
    },
    () => {
      // Fallback: insert via DOM manipulation (secure)
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = sanitizeHtml(table);
      
      range.insertNode(div.firstChild!);
    },
    'table insertion'
  );
};

export const insertHorizontalRule = (): boolean => {
  const hr = '<hr style="margin: 16px 0; border: none; border-top: 2px solid #dee2e6;">';
  
  return executeWithFallback(
    () => {
      if (!document.execCommand('insertHTML', false, hr)) {
        throw new Error('insertHTML command failed for horizontal rule');
      }
    },
    () => {
      // Fallback: insert via DOM manipulation
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const hrElement = document.createElement('hr');
      hrElement.style.cssText = 'margin: 16px 0; border: none; border-top: 2px solid #dee2e6;';
      
      range.insertNode(hrElement);
    },
    'horizontal rule insertion'
  );
};

export const insertBlockQuote = (): boolean => {
  const quote = '<blockquote style="border-left: 4px solid #4f7cff; padding-left: 16px; margin: 16px 0; color: #6c757d; font-style: italic;">Quote text here</blockquote>';
  
  return executeWithFallback(
    () => {
      if (!document.execCommand('insertHTML', false, quote)) {
        throw new Error('insertHTML command failed for blockquote');
      }
    },
    () => {
      // Fallback: insert via DOM manipulation (secure)
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = sanitizeHtml(quote);
      
      range.insertNode(div.firstChild!);
    },
    'blockquote insertion'
  );
};

export const insertCodeBlock = (): boolean => {
  const code = '<pre style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; overflow-x: auto; margin: 10px 0; border: 1px solid #dee2e6;"><code>// Your code here</code></pre>';
  
  return executeWithFallback(
    () => {
      if (!document.execCommand('insertHTML', false, code)) {
        throw new Error('insertHTML command failed for code block');
      }
    },
    () => {
      // Fallback: insert via DOM manipulation (secure)
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = sanitizeHtml(code);
      
      range.insertNode(div.firstChild!);
    },
    'code block insertion'
  );
};
