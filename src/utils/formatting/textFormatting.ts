
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
      
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontSize', false, '3');
      
      // Apply the pixel size to the selection
      const selectedElement = selection.anchorNode?.parentElement;
      if (selectedElement && selectedElement.tagName === 'FONT') {
        selectedElement.style.fontSize = pixelSize;
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
