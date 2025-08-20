import { getSelectionInfo, applyStyleToRange } from './selectionUtils';
import { handleFormattingError } from './errorHandling';
import { logger } from '@/utils/logger';

// Whitelist of safe font families to prevent CSS injection
const SAFE_FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Times',
  'Courier New',
  'Courier',
  'Verdana',
  'Georgia',
  'Palatino',
  'Garamond',
  'Bookman',
  'Comic Sans MS',
  'Trebuchet MS',
  'Arial Black',
  'Impact',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy'
];

export const applyFontFamily = (fontFamily: string): boolean => {
  logger.log('Applying font family:', fontFamily);

  // Validate and sanitize font family input
  if (typeof fontFamily !== 'string' || fontFamily.length === 0) {
    logger.error('Invalid font family input');
    return false;
  }

  // Check if font family is in our safe whitelist
  const safeFontFamily = SAFE_FONT_FAMILIES.find(
    safe => safe.toLowerCase() === fontFamily.toLowerCase()
  );

  if (!safeFontFamily) {
    logger.error('Font family not in safe whitelist:', fontFamily);
    return false;
  }

  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) {
    logger.log('No selection found for font family');
    return false;
  }

  try {
    // Use modern DOM method instead of execCommand
    const range = selectionInfo.range;
    const selectedContent = range.extractContents();
    const span = document.createElement('span');
    span.style.fontFamily = safeFontFamily;
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

    logger.log('Font family applied successfully');
    return true;
  } catch (error) {
    return handleFormattingError('font family', error);
  }
};

// Font size whitelist for security
const SAFE_FONT_SIZES = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '72px'];

export const applyFontSize = (fontSize: string): boolean => {
  logger.log('Applying font size:', fontSize);

  // Validate font size input
  if (typeof fontSize !== 'string' || !SAFE_FONT_SIZES.includes(fontSize)) {
    logger.error('Invalid or unsafe font size:', fontSize);
    return false;
  }

  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) {
    logger.log('No selection found for font size');
    return false;
  }

  try {
    // Use modern DOM method instead of execCommand
    const range = selectionInfo.range;
    const selectedContent = range.extractContents();
    const span = document.createElement('span');
    span.style.fontSize = fontSize;
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

    logger.log('Font size applied successfully');
    return true;
  } catch (error) {
    return handleFormattingError('font size', error);
  }
};