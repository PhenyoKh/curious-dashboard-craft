
import { handleFormattingError, executeWithFallback } from './errorHandling';

// Selection storage for preventing focus-loss timing issues
let storedRange: Range | null = null;

export const storeCurrentSelection = (): boolean => {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (!range.collapsed && range.toString().trim().length > 0) {
      storedRange = range.cloneRange();
      console.log("Stored selection:", storedRange.toString());
      return true;
    }
  }
  console.log("No valid selection to store");
  return false;
};


import { getSelectionInfo, applyStyleToRange, clearSelectionAndMoveCursor } from './selectionUtils';

export const applyFontColor = (color: string): boolean => {
  console.log("Applying font color:", color);

  // First try to use stored selection if available
  if (storedRange && !storedRange.collapsed) {
    return applyFontColorToStoredSelection(color);
  }

  // Fallback to current selection
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) {
    console.log("No selection found for font color");
    return false;
  }

  console.log("Selection found:", selectionInfo.selectedText);

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
    // Set typing style so new text maintains the color
    setTypingStyle({ color: color });
    return true;
  } catch (error) {
    console.error("Error applying font color:", error);
    return false;
  }
};


export const applyFontColorToStoredSelection = (color: string): boolean => {
  console.log("Applying font color to stored selection:", color);
  
  if (!storedRange || storedRange.collapsed) {
    console.log("No stored selection or selection is collapsed");
    return false;
  }

  try {
    // Restore the selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(storedRange);
    }
    
    // Apply the color using existing logic
    const selectedContent = storedRange.extractContents();
    const span = document.createElement("span");
    span.style.color = color;
    span.appendChild(selectedContent);
    storedRange.insertNode(span);

    // Clear selection and move cursor
    if (selection) {
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.addRange(newRange);
    }

    // Clear stored range
    storedRange = null;
    
    console.log("Font color applied successfully to stored selection");
    // Set typing style so new text maintains the color
    setTypingStyle({ color: color });
    return true;
  } catch (error) {
    console.error("Error applying font color to stored selection:", error);
    storedRange = null;
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

// Helper function to get current formatting styles at cursor position
export const getCurrentFormattingStyles = (): Record<string, string> => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return {};
  }

  const range = selection.getRangeAt(0);
  let element = range.commonAncestorContainer;
  
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement;
  }
  
  if (!element || !(element instanceof HTMLElement)) {
    return {};
  }

  const computedStyle = window.getComputedStyle(element);
  const styles: Record<string, string> = {};
  
  // Preserve text formatting
  if (computedStyle.color && computedStyle.color !== 'rgb(0, 0, 0)') {
    styles.color = computedStyle.color;
  }
  if (computedStyle.fontWeight && computedStyle.fontWeight !== 'normal') {
    styles.fontWeight = computedStyle.fontWeight;
  }
  
  console.log('Current formatting styles:', styles);
  return styles;
};

// Helper function to create formatted placeholder
export const createFormattedPlaceholder = (): string => {
  const styles = getCurrentFormattingStyles();
  
  if (Object.keys(styles).length === 0) {
    return '&nbsp;';
  }
  
  const styleString = Object.entries(styles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
    
  return `<span style="${styleString}">&nbsp;</span>`;
};

// Set typing style to maintain formatting
export const setTypingStyle = (styles: Record<string, string>): void => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);

  // Create a styled span with zero-width space placeholder
  const span = document.createElement('span');
  for (const [property, value] of Object.entries(styles)) {
    span.style.setProperty(property, value);
  }
  span.appendChild(document.createTextNode('\u200b')); // zero-width space

  // Insert the span at the current cursor position
  range.deleteContents();
  range.insertNode(span);

  // Move the caret inside the new span after the zero-width space
  const newRange = document.createRange();
  newRange.setStart(span.firstChild!, 1);
  newRange.collapse(true);

  selection.removeAllRanges();
  selection.addRange(newRange);
};
