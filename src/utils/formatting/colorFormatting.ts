
export const applyFontColor = (color: string) => {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim()) return;

  try {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
  } catch (error) {
    console.error('Error applying font color:', error);
  }
};

export const applyHighlight = (color: string) => {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim()) return;

  try {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('hiliteColor', false, color);
  } catch (error) {
    console.error('Error applying highlight:', error);
  }
};

export const clearHighlight = () => {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim()) return;

  try {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('hiliteColor', false, 'transparent');
  } catch (error) {
    console.error('Error clearing highlight:', error);
  }
};
