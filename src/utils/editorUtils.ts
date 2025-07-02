
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
        // For cursor position, create a temporary span to set the font
        const span = document.createElement('span');
        span.style.fontFamily = value || 'Inter';
        span.innerHTML = '\u200B'; // Zero-width space
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.insertNode(span);
          range.setStartAfter(span);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
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
        // For cursor position, set up for next typing
        const span = document.createElement('span');
        span.style.fontSize = value || '16px';
        span.innerHTML = '\u200B';
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.insertNode(span);
          range.setStartAfter(span);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else if (command === 'formatBlock') {
      // Improved heading formatting
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
          } else {
            // Regular paragraph
            newElement.style.fontSize = '1rem';
            newElement.style.fontWeight = 'normal';
            newElement.style.lineHeight = '1.7';
            newElement.style.margin = '0';
          }
          
          // Replace the element
          (container as HTMLElement).parentNode?.replaceChild(newElement, container as HTMLElement);
          
          // Set cursor to end of new element
          const newRange = document.createRange();
          newRange.selectNodeContents(newElement);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Handle case where we're at the very beginning or in an empty editor
          const newElement = document.createElement(value || 'p');
          
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
          } else {
            newElement.style.fontSize = '1rem';
            newElement.style.fontWeight = 'normal';
            newElement.style.lineHeight = '1.7';
            newElement.style.margin = '0';
          }
          
          newElement.innerHTML = '\u200B'; // Zero-width space
          
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(newElement);
            range.selectNodeContents(newElement);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
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
        // For cursor position
        const span = document.createElement('span');
        span.style.color = value || '#000000';
        span.innerHTML = '\u200B';
        
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.insertNode(span);
          range.setStartAfter(span);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else if (command === 'hiliteColor' || command === 'backColor') {
      // Handle highlighting - only apply if text is selected
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
      }
    } else if (command === 'bold' || command === 'italic' || command === 'underline') {
      // Handle bold, italic, underline with proper toggling
      const isActive = document.queryCommandState(command);
      
      if (selection.toString().trim()) {
        // Apply to selected text
        document.execCommand(command, false);
      } else {
        // For cursor position, create a temporary element if turning on
        if (!isActive) {
          const element = document.createElement(command === 'bold' ? 'strong' : command === 'italic' ? 'em' : 'u');
          element.innerHTML = '\u200B';
          
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(element);
            range.setStartAfter(element);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else {
          // Turn off formatting by moving cursor outside formatted element
          document.execCommand(command, false);
        }
      }
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
