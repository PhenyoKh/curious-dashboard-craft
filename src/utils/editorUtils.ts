
export const formatText = (command: string, value?: string) => {
  // Ensure the editor is focused before applying formatting
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  try {
    // Special handling for different formatting commands
    if (command === 'fontName') {
      // Apply font to selection or set for future typing
      if (selection.toString().trim()) {
        document.execCommand('fontName', false, value);
      } else {
        // For future typing, we need to create a temporary span
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
          const span = document.createElement('span');
          span.style.fontFamily = value || 'Inter';
          span.innerHTML = '&nbsp;';
          
          const range = selection.getRangeAt(0);
          range.insertNode(span);
          range.setStartAfter(span);
          range.setEndAfter(span);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else if (command === 'fontSize') {
      // Handle font size with pixel values
      if (selection.toString().trim()) {
        // For selected text, wrap it in a span with the font size
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = value || '16px';
        
        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);
          selection.removeAllRanges();
        } catch (e) {
          // Fallback to execCommand
          const sizeMap: { [key: string]: string } = {
            '14px': '2',
            '16px': '3', 
            '18px': '4'
          };
          const size = sizeMap[value || '16px'] || '3';
          document.execCommand('fontSize', false, size);
        }
      } else {
        // For future typing
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
          const span = document.createElement('span');
          span.style.fontSize = value || '16px';
          span.innerHTML = '&nbsp;';
          
          const range = selection.getRangeAt(0);
          range.insertNode(span);
          range.setStartAfter(span);
          range.setEndAfter(span);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else if (command === 'formatBlock') {
      // Handle heading formatting with proper styles
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editor && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let element = range.commonAncestorContainer;
        
        // Find the containing block element
        while (element && element.nodeType !== Node.ELEMENT_NODE) {
          element = element.parentNode;
        }
        
        if (element && element !== editor) {
          // Create new element with proper tag and styles
          const newElement = document.createElement(value || 'p');
          
          // Apply appropriate styles
          if (value === 'h1') {
            newElement.style.fontSize = '32px';
            newElement.style.fontWeight = 'bold';
            newElement.style.lineHeight = '1.2';
            newElement.style.marginTop = '24px';
            newElement.style.marginBottom = '16px';
          } else if (value === 'h2') {
            newElement.style.fontSize = '24px';
            newElement.style.fontWeight = 'bold';
            newElement.style.lineHeight = '1.3';
            newElement.style.marginTop = '20px';
            newElement.style.marginBottom = '12px';
          } else {
            newElement.style.fontSize = '16px';
            newElement.style.fontWeight = 'normal';
            newElement.style.lineHeight = '1.7';
            newElement.style.marginTop = '0';
            newElement.style.marginBottom = '0';
          }
          
          newElement.innerHTML = (element as HTMLElement).innerHTML;
          (element as HTMLElement).parentNode?.replaceChild(newElement, element as HTMLElement);
          
          // Restore selection
          const newRange = document.createRange();
          newRange.selectNodeContents(newElement);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else if (command === 'foreColor') {
      // Handle text color
      if (selection.toString().trim()) {
        // Apply to selected text
        document.execCommand('foreColor', false, value);
      } else {
        // For future typing
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
        if (editor) {
          const span = document.createElement('span');
          span.style.color = value || '#000000';
          span.innerHTML = '&nbsp;';
          
          const range = selection.getRangeAt(0);
          range.insertNode(span);
          range.setStartAfter(span);
          range.setEndAfter(span);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else if (command === 'hiliteColor' || command === 'backColor') {
      // Handle highlighting
      document.execCommand('hiliteColor', false, value);
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
