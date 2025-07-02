
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
      let fontSize = '16px';
      if (value === 'Small') fontSize = '14px';
      else if (value === 'Normal') fontSize = '16px';
      else if (value === 'Large') fontSize = '18px';
      
      // Check if there's selected text
      const selectedText = selection.toString();
      if (selectedText) {
        // Apply font size to selected text
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('fontSize', false, '7'); // Use max size first
        
        // Then override with CSS
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = fontSize;
        
        try {
          range.surroundContents(span);
        } catch {
          // If we can't surround contents, create new span with text
          span.textContent = selectedText;
          range.deleteContents();
          range.insertNode(span);
        }
        
        // Clear selection and move cursor after span
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartAfter(span);
        newRange.collapse(true);
        selection.addRange(newRange);
      }
    } else if (command === 'formatBlock') {
      // Only format selected text or current line, not entire document
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        
        // Find the closest block element containing the selection
        while (container && container.nodeType === Node.TEXT_NODE) {
          container = container.parentNode;
        }
        
        if (container && container.nodeType === Node.ELEMENT_NODE) {
          const element = container as HTMLElement;
          
          // Only proceed if the element is within the editor
          const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editor && editor.contains(element)) {
            const newElement = document.createElement(value || 'p');
            
            // Copy all content and preserve selection
            newElement.innerHTML = element.innerHTML;
            
            // Apply appropriate styling based on tag
            if (value === 'h1') {
              newElement.style.fontSize = '32px';
              newElement.style.fontWeight = 'bold';
              newElement.style.marginTop = '24px';
              newElement.style.marginBottom = '16px';
              newElement.style.lineHeight = '1.2';
            } else if (value === 'h2') {
              newElement.style.fontSize = '24px';
              newElement.style.fontWeight = 'bold';
              newElement.style.marginTop = '20px';
              newElement.style.marginBottom = '12px';
              newElement.style.lineHeight = '1.3';
            } else if (value === 'p') {
              newElement.style.fontSize = '16px';
              newElement.style.fontWeight = 'normal';
              newElement.style.marginTop = '0px';
              newElement.style.marginBottom = '8px';
              newElement.style.lineHeight = '1.7';
            }
            
            // Replace the element
            if (element.parentNode) {
              element.parentNode.replaceChild(newElement, element);
              
              // Restore cursor position to end of new element
              const newRange = document.createRange();
              newRange.selectNodeContents(newElement);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        }
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
