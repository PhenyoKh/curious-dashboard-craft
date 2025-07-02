
export const formatText = (command: string, value?: string) => {
  const selection = window.getSelection();
  if (!selection) return;

  try {
    // Focus the editor first
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
    }

    // Handle different formatting commands
    if (command === 'fontName') {
      document.execCommand('fontName', false, value);
    } else if (command === 'fontSize') {
      // Convert size names to actual pixel values for better control
      let pixelSize = '16px'; // Default
      if (value === 'Small') pixelSize = '12px';
      else if (value === 'Normal') pixelSize = '16px';
      else if (value === 'Large') pixelSize = '20px';
      
      // Use styleWithCSS for better control
      document.execCommand('styleWithCSS', false, 'true');
      
      if (selection.toString().trim()) {
        // Apply to selected text
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = pixelSize;
        
        try {
          range.surroundContents(span);
        } catch {
          // Fallback if surroundContents fails
          span.innerHTML = range.toString();
          range.deleteContents();
          range.insertNode(span);
        }
      } else {
        // Apply to cursor position for future typing
        document.execCommand('fontSize', false, '7'); // Reset
        document.execCommand('insertHTML', false, `<span style="font-size: ${pixelSize};">&nbsp;</span>`);
      }
    } else if (command === 'formatBlock') {
      document.execCommand('formatBlock', false, `<${value}>`);
    } else if (command === 'foreColor') {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, value);
    } else if (command === 'hiliteColor' || command === 'backColor') {
      document.execCommand('styleWithCSS', false, 'true');
      
      if (selection.toString().trim()) {
        // Apply to selected text
        document.execCommand('hiliteColor', false, value);
      } else {
        // For cursor position, insert a styled span that will capture future typing
        const span = document.createElement('span');
        span.style.backgroundColor = value || 'transparent';
        span.innerHTML = '&nbsp;'; // Non-breaking space to make it visible
        
        const range = selection.getRangeAt(0);
        range.insertNode(span);
        
        // Position cursor inside the span
        const newRange = document.createRange();
        newRange.setStart(span, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // Handle all other formatting commands
      document.execCommand(command, false, value);
    }
  } catch (error) {
    console.error('Error applying formatting:', error);
  }
};

export const insertSymbol = (symbol: string) => {
  document.execCommand('insertText', false, symbol);
};
