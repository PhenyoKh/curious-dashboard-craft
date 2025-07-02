
export const formatText = (command: string, value?: string) => {
  const selection = window.getSelection();
  if (!selection) return;

  try {
    // Focus the editor first
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
    }

    // Use execCommand for most formatting - it's simpler and more reliable
    if (command === 'fontName') {
      document.execCommand('fontName', false, value);
    } else if (command === 'fontSize') {
      // Simple font size handling
      let sizeValue = '3'; // Default medium size
      if (value === 'Small') sizeValue = '2';
      else if (value === 'Normal') sizeValue = '3';
      else if (value === 'Large') sizeValue = '4';
      
      document.execCommand('fontSize', false, sizeValue);
    } else if (command === 'formatBlock') {
      // Simple format block - let the browser handle it naturally
      document.execCommand('formatBlock', false, `<${value}>`);
    } else if (command === 'foreColor') {
      document.execCommand('foreColor', false, value);
    } else if (command === 'hiliteColor' || command === 'backColor') {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('hiliteColor', false, value);
    } else {
      // Handle all other formatting commands simply
      document.execCommand(command, false, value);
    }
  } catch (error) {
    console.error('Error applying formatting:', error);
  }
};

export const insertSymbol = (symbol: string) => {
  document.execCommand('insertText', false, symbol);
};
