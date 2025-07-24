
import { handleFormattingError, executeWithFallback } from './errorHandling';
import { getSelectionInfo, applyStyleToRange, clearSelectionAndMoveCursor } from './selectionUtils';

export const applyFontColor = (color: string): boolean => {
  console.log('Applying font color:', color);
  
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) {
    console.log('No selection found for font color');
    return false;
  }

  console.log('Selection found:', selectionInfo.selectedText);

  // Use a more direct approach - wrap selected text in a span with color
  try {
    const range = selectionInfo.range;
    const selectedContent = range.extractContents();
    const span = document.createElement('span');
    span.style.color = color;
    span.appendChild(selectedContent);
    range.insertNode(span);
    
    // Clear selection and move cursor
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    }
    
    console.log('Font color applied successfully');
    return true;
  } catch (error) {
    console.error('Error applying font color:', error);
    return false;
  }
};

export const applyHighlight = (color: string): boolean => {
  console.log('Applying highlight color:', color);
  
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) {
    console.log('No selection found for highlight');
    return false;
  }

  console.log('Selection found for highlight:', selectionInfo.selectedText);

  // Use a more direct approach - wrap selected text in a span with background color
  try {
    const range = selectionInfo.range;
    const selectedContent = range.extractContents();
    const span = document.createElement('span');
    span.style.backgroundColor = color;
    span.appendChild(selectedContent);
    range.insertNode(span);
    
    // Clear selection and move cursor
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    }
    
    console.log('Highlight applied successfully');
    return true;
  } catch (error) {
    console.error('Error applying highlight:', error);
    return false;
  }
};

export const clearHighlight = (): boolean => {
  console.log('Clearing highlight');
  
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) {
    console.log('No selection found for clearing highlight');
    return false;
  }

  try {
    const range = selectionInfo.range;
    const selectedContent = range.extractContents();
    const span = document.createElement('span');
    span.style.backgroundColor = 'transparent';
    span.appendChild(selectedContent);
    range.insertNode(span);
    
    // Clear selection and move cursor
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    }
    
    console.log('Highlight cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing highlight:', error);
    return false;
  }
};
