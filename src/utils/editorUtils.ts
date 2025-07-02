export const formatText = (command: string, value?: string) => {
  const selection = window.getSelection();
  if (!selection) return;

  try {
    // Focus the editor first
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
    }

    if (command === 'fontName') {
      if (selection.toString().trim()) {
        // Apply font to selected text
        document.execCommand('fontName', false, value);
      } else {
        // For cursor position, store the current range
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (range) {
          // Apply font formatting using execCommand to maintain cursor position
          document.execCommand('fontName', false, value);
        }
      }
    } else if (command === 'fontSize') {
      if (selection.toString().trim()) {
        // Apply size to selected text using CSS
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = value || '16px';
        
        try {
          range.surroundContents(span);
        } catch (e) {
          // If surroundContents fails, extract and wrap contents
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
      } else {
        // For cursor position, create a temporary span but maintain cursor
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (range) {
          const span = document.createElement('span');
          span.style.fontSize = value || '16px';
          span.innerHTML = '\u200B';
          
          range.insertNode(span);
          range.setStartAfter(span);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else if (command === 'formatBlock') {
      // Improved heading and paragraph formatting
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        
        // Find the paragraph or block element
        while (container && container.nodeType !== Node.ELEMENT_NODE) {
          container = container.parentNode;
        }
        
        // If we're in a text node, get the containing block
        if (container && container.nodeType === Node.TEXT_NODE) {
          container = container.parentNode;
        }
        
        // Find the actual block element
        while (container && container !== editor && 
               !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes((container as Element).tagName)) {
          container = container.parentNode;
        }
        
        if (container && container !== editor) {
          // Store cursor position before transformation
          const cursorOffset = range.startOffset;
          const startContainer = range.startContainer;
          
          // Get the current content
          const currentContent = (container as HTMLElement).innerHTML;
          
          // Create new element
          const newElement = document.createElement(value || 'p');
          newElement.innerHTML = currentContent;
          
          // Apply appropriate styles
          if (value === 'h1') {
            newElement.style.fontSize = '2rem';
            newElement.style.fontWeight = 'bold';
            newElement.style.lineHeight = '1.2';
            newElement.style.margin = '1.5rem 0 1rem 0';
          } else if (value === 'h2') {
            newElement.style.fontSize = '1.5rem';
            newElement.style.fontWeight = 'bold';
            newElement.style.lineHeight = '1.3';
            newElement.style.margin = '1.25rem 0 0.75rem 0';
          } else if (value === 'p') {
            // Regular paragraph - clear any heading styles
            newElement.style.fontSize = '1rem';
            newElement.style.fontWeight = 'normal';
            newElement.style.lineHeight = '1.7';
            newElement.style.margin = '0.5rem 0';
          }
          
          // Replace the element
          (container as HTMLElement).parentNode?.replaceChild(newElement, container as HTMLElement);
          
          // Restore cursor position
          try {
            const newRange = document.createRange();
            const textNode = newElement.firstChild || newElement;
            if (textNode.nodeType === Node.TEXT_NODE) {
              newRange.setStart(textNode, Math.min(cursorOffset, textNode.textContent?.length || 0));
            } else {
              newRange.setStart(newElement, 0);
            }
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch (e) {
            // Fallback: set cursor at beginning of element
            const newRange = document.createRange();
            newRange.selectNodeContents(newElement);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
    } else if (command === 'foreColor') {
      if (selection.toString().trim()) {
        // Apply color to selected text
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.color = value || '#000000';
        
        try {
          range.surroundContents(span);
        } catch (e) {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
      } else {
        // For cursor position, use execCommand to maintain position
        document.execCommand('foreColor', false, value);
      }
    } else if (command === 'hiliteColor' || command === 'backColor') {
      // Handle highlighting - apply to selected text or prepare for next typing
      if (selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.backgroundColor = value === 'transparent' ? 'transparent' : (value || 'yellow');
        
        try {
          range.surroundContents(span);
        } catch (e) {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
        
        // Clear selection after highlighting
        selection.removeAllRanges();
      } else {
        // For cursor position, use execCommand to set background color for next typing
        document.execCommand('hiliteColor', false, value);
      }
    } else if (command === 'bold' || command === 'italic' || command === 'underline') {
      // Handle bold, italic, underline with proper cursor positioning
      document.execCommand(command, false);
    } else {
      // Handle other formatting commands
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
