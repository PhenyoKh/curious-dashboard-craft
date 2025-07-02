export const formatText = (command: string, value?: string) => {
  const selection = window.getSelection();
  if (!selection) return;

  try {
    if (command === 'fontName') {
      if (selection.toString().trim()) {
        // Apply font to selected text
        document.execCommand('fontName', false, value);
      } else {
        // Set font for future typing without inserting spaces
        document.execCommand('fontName', false, value);
      }
    } else if (command === 'fontSize') {
      if (selection.toString().trim()) {
        // For selected text, use execCommand with size mapping
        const sizeMap: { [key: string]: string } = {
          '14px': '2',
          '16px': '3', 
          '18px': '4',
          '20px': '5'
        };
        const size = sizeMap[value || '16px'] || '3';
        document.execCommand('fontSize', false, size);
      } else {
        // For cursor position, set the font size for future typing
        const sizeMap: { [key: string]: string } = {
          '14px': '2',
          '16px': '3', 
          '18px': '4',
          '20px': '5'
        };
        const size = sizeMap[value || '16px'] || '3';
        document.execCommand('fontSize', false, size);
      }
    } else if (command === 'formatBlock') {
      // Improved heading formatting
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editor && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Find the current block element
        let blockElement = range.commonAncestorContainer;
        while (blockElement && blockElement.nodeType !== Node.ELEMENT_NODE) {
          blockElement = blockElement.parentNode;
        }
        
        // If we're in a text node, get its parent
        if (blockElement && blockElement.nodeType === Node.TEXT_NODE) {
          blockElement = blockElement.parentNode;
        }
        
        // Find the containing block (p, div, h1, h2, etc.)
        while (blockElement && blockElement !== editor && 
               !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes((blockElement as Element).tagName)) {
          blockElement = blockElement.parentNode;
        }
        
        if (blockElement && blockElement !== editor) {
          // Store current content and selection info
          const currentContent = (blockElement as HTMLElement).innerHTML;
          const rangeStartOffset = range.startOffset;
          
          // Create new element
          const newElement = document.createElement(value || 'p');
          newElement.innerHTML = currentContent;
          
          // Apply styles based on element type
          if (value === 'h1') {
            newElement.style.fontSize = '2rem';
            newElement.style.fontWeight = 'bold';
            newElement.style.lineHeight = '1.2';
            newElement.style.marginTop = '1.5rem';
            newElement.style.marginBottom = '1rem';
          } else if (value === 'h2') {
            newElement.style.fontSize = '1.5rem';
            newElement.style.fontWeight = 'bold';
            newElement.style.lineHeight = '1.3';
            newElement.style.marginTop = '1.25rem';
            newElement.style.marginBottom = '0.75rem';
          } else {
            // Regular paragraph
            newElement.style.fontSize = '1rem';
            newElement.style.fontWeight = 'normal';
            newElement.style.lineHeight = '1.7';
            newElement.style.margin = '0';
          }
          
          // Replace the element
          (blockElement as HTMLElement).parentNode?.replaceChild(newElement, blockElement as HTMLElement);
          
          // Restore cursor position
          const newRange = document.createRange();
          const textNode = newElement.firstChild;
          if (textNode) {
            newRange.setStart(textNode, Math.min(rangeStartOffset, textNode.textContent?.length || 0));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } else {
          // Fallback to execCommand if we can't find a proper block
          document.execCommand('formatBlock', false, value);
        }
      }
    } else if (command === 'foreColor') {
      if (selection.toString().trim()) {
        // Apply to selected text
        document.execCommand('foreColor', false, value);
      } else {
        // Set color for future typing
        document.execCommand('foreColor', false, value);
      }
    } else if (command === 'hiliteColor' || command === 'backColor') {
      // Handle highlighting - only apply if text is selected
      if (selection.toString().trim()) {
        document.execCommand('hiliteColor', false, value);
      }
    } else {
      // Handle other formatting (bold, italic, underline, etc.)
      document.execCommand(command, false, value);
    }
  } catch (error) {
    console.error('Error applying formatting:', error);
  }
};

export const insertCheckbox = () => {
  const checkbox = '<div contenteditable="false" style="display: inline-flex; align-items: center; margin: 4px 0;"><input type="checkbox" style="margin-right: 8px;"><span contenteditable="true">Task item</span></div><br>';
  document.execCommand('insertHTML', false, checkbox);
};

export const insertTable = () => {
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
  document.execCommand('insertHTML', false, table);
};

export const insertHorizontalRule = () => {
  const hr = '<hr style="margin: 16px 0; border: none; border-top: 2px solid #dee2e6;">';
  document.execCommand('insertHTML', false, hr);
};

export const insertBlockQuote = () => {
  const quote = '<blockquote style="border-left: 4px solid #4f7cff; padding-left: 16px; margin: 16px 0; color: #6c757d; font-style: italic;">Quote text here</blockquote>';
  document.execCommand('insertHTML', false, quote);
};

export const insertCodeBlock = () => {
  const code = '<pre style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; overflow-x: auto; margin: 10px 0; border: 1px solid #dee2e6;"><code>// Your code here</code></pre>';
  document.execCommand('insertHTML', false, code);
};

export const insertSymbol = (symbol: string) => {
  document.execCommand('insertText', false, symbol);
};

export const handleSearch = (searchTerm: string, editorRef: React.RefObject<HTMLDivElement>) => {
  if (!searchTerm || !editorRef.current) return;
  
  const selection = window.getSelection();
  const range = document.createRange();
  
  if (selection) {
    selection.removeAllRanges();
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.toLowerCase() || '';
      const searchLower = searchTerm.toLowerCase();
      const index = text.indexOf(searchLower);
      
      if (index !== -1) {
        range.setStart(node, index);
        range.setEnd(node, index + searchTerm.length);
        selection.addRange(range);
        break;
      }
    }
  }
};
