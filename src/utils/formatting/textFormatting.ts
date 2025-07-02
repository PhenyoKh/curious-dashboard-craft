
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
      console.log('Font size command triggered with value:', value);
      
      // Only apply to selected text
      if (selection.toString().trim()) {
        console.log('Selected text found:', selection.toString());
        
        // Map size names to actual CSS font sizes
        let fontSize = '16px'; // Default
        
        switch (value) {
          case 'Small':
            fontSize = '12px';
            break;
          case 'Normal':
            fontSize = '16px';
            break;
          case 'Large':
            fontSize = '24px';
            break;
          default:
            fontSize = '16px';
        }
        
        console.log('Applying font size:', fontSize);
        
        // Simple approach: wrap selected text in span with font size
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        // Create span with font size
        const span = document.createElement('span');
        span.style.fontSize = fontSize;
        span.textContent = selectedText;
        
        console.log('Created span element:', span);
        
        // Replace selected content with styled span
        range.deleteContents();
        range.insertNode(span);
        
        // Clear selection
        selection.removeAllRanges();
        
        console.log('Font size applied successfully');
      } else {
        console.log('No text selected - font size not applied');
      }
    } else if (command === 'formatBlock') {
      document.execCommand('formatBlock', false, `<${value}>`);
    } else if (command === 'foreColor') {
      // Only apply font color if there's selected text
      if (selection.toString().trim()) {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, value);
      }
    } else if (command === 'hiliteColor' || command === 'backColor') {
      // Only apply highlighting if there's selected text
      if (selection.toString().trim()) {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('hiliteColor', false, value);
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
