
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
      document.execCommand('fontName', false, value);
    } else if (command === 'fontSize') {
      // Convert size labels to actual pixel values
      let fontSize = value;
      if (value === 'Small') fontSize = '14px';
      else if (value === 'Normal') fontSize = '16px';
      else if (value === 'Large') fontSize = '18px';
      
      // Use styleWithCSS for better font size control
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontSize', false, '7'); // Max size first
      
      // Then apply custom size via CSS
      const selectedText = selection.toString();
      if (selectedText) {
        const span = document.createElement('span');
        span.style.fontSize = fontSize || value || '16px';
        span.textContent = selectedText;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);
        
        // Clear selection
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartAfter(span);
        newRange.collapse(true);
        selection.addRange(newRange);
      }
    } else if (command === 'formatBlock') {
      // Improved heading formatting
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;
      
      // Find the paragraph or block element to format
      while (container && container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
      }
      
      if (container && container.nodeType === Node.ELEMENT_NODE) {
        const element = container as HTMLElement;
        const newElement = document.createElement(value || 'p');
        
        // Copy content and attributes
        newElement.innerHTML = element.innerHTML;
        
        // Apply appropriate styling
        if (value === 'h1') {
          newElement.style.fontSize = '32px';
          newElement.style.fontWeight = 'bold';
          newElement.style.marginTop = '24px';
          newElement.style.marginBottom = '16px';
        } else if (value === 'h2') {
          newElement.style.fontSize = '24px';
          newElement.style.fontWeight = 'bold';
          newElement.style.marginTop = '20px';
          newElement.style.marginBottom = '12px';
        } else if (value === 'p') {
          newElement.style.fontSize = '16px';
          newElement.style.fontWeight = 'normal';
          newElement.style.marginTop = '0px';
          newElement.style.marginBottom = '8px';
        }
        
        // Replace the element
        if (element.parentNode) {
          element.parentNode.replaceChild(newElement, element);
        }
        
        // Restore cursor position
        const newRange = document.createRange();
        newRange.selectNodeContents(newElement);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else if (command === 'foreColor') {
      document.execCommand('foreColor', false, value);
    } else if (command === 'hiliteColor' || command === 'backColor') {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('hiliteColor', false, value);
    } else {
      // Handle other formatting commands
      document.execCommand(command, false, value);
    }
  } catch (error) {
    console.error('Error applying formatting:', error);
  }
};

export const insertSymbol = (symbol: string) => {
  document.execCommand('insertText', false, symbol);
};
