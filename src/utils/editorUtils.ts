
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
      // Use execCommand for font size to maintain cursor position
      document.execCommand('fontSize', false, value);
    } else if (command === 'formatBlock') {
      // Simplified heading formatting
      document.execCommand('formatBlock', false, `<${value}>`);
    } else if (command === 'foreColor') {
      document.execCommand('foreColor', false, value);
    } else if (command === 'hiliteColor' || command === 'backColor') {
      document.execCommand('hiliteColor', false, value);
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
