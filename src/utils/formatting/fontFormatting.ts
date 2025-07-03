
export const applyFontFamily = (fontFamily: string) => {
  const selection = window.getSelection();
  if (!selection) return;

  const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
  if (editor) {
    editor.focus();
    document.execCommand('fontName', false, fontFamily);
  }
};

export const applyFontSize = (sizeValue: string) => {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim() || !selection.rangeCount) return;

  // Map size names to actual CSS font sizes
  let fontSize = '16px'; // Default
  
  switch (sizeValue) {
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
  
  // Get the range and selected content
  const range = selection.getRangeAt(0);
  const selectedContent = range.extractContents();
  
  // Create span with font size
  const span = document.createElement('span');
  span.style.fontSize = fontSize;
  span.appendChild(selectedContent);
  
  // Insert the styled span
  range.insertNode(span);
  
  // Clear selection and place cursor after the span
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.setStartAfter(span);
  newRange.collapse(true);
  selection.addRange(newRange);
};
