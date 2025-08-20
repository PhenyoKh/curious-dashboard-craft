import { getSelectionInfo } from './selectionUtils';
import { handleFormattingError } from './errorHandling';
import { logger } from '@/utils/logger';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'p';

export const applyHeading = (tag: HeadingTag): boolean => {
  logger.log('Applying heading:', tag);

  // Validate tag input (TypeScript provides compile-time safety, but add runtime check)
  const validTags: HeadingTag[] = ['h1', 'h2', 'h3', 'p'];
  if (!validTags.includes(tag)) {
    logger.error('Invalid heading tag:', tag);
    return false;
  }

  const selectionInfo = getSelectionInfo();
  
  if (selectionInfo && selectionInfo.hasSelection) {
    // Handle selected text by wrapping in heading element
    try {
      const range = selectionInfo.range;
      const selectedText = range.toString();
      
      // Create new heading element
      const headingElement = document.createElement(tag);
      
      // Apply consistent styling based on tag
      switch (tag) {
        case 'h1':
          headingElement.style.fontSize = '2em';
          headingElement.style.fontWeight = 'bold';
          headingElement.style.marginTop = '0.67em';
          headingElement.style.marginBottom = '0.67em';
          break;
        case 'h2':
          headingElement.style.fontSize = '1.5em';
          headingElement.style.fontWeight = 'bold';
          headingElement.style.marginTop = '0.83em';
          headingElement.style.marginBottom = '0.83em';
          break;
        case 'h3':
          headingElement.style.fontSize = '1.17em';
          headingElement.style.fontWeight = 'bold';
          headingElement.style.marginTop = '1em';
          headingElement.style.marginBottom = '1em';
          break;
        case 'p':
          headingElement.style.fontSize = '1em';
          headingElement.style.marginTop = '1em';
          headingElement.style.marginBottom = '1em';
          break;
      }
      
      // Use textContent for security (prevents HTML injection)
      headingElement.textContent = selectedText;
      
      // Replace selection with heading element
      range.deleteContents();
      range.insertNode(headingElement);
      
      // Clear selection and position cursor after heading
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartAfter(headingElement);
        newRange.collapse(true);
        selection.addRange(newRange);
      }
      
      logger.log('Heading applied successfully to selection');
      return true;
    } catch (error) {
      return handleFormattingError('heading to selection', error);
    }
  } else {
    // Handle no selection case using modern DOM methods instead of execCommand
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        logger.log('No selection or cursor position found');
        return false;
      }

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      // Find the current block element to convert
      let blockElement = container.nodeType === Node.TEXT_NODE 
        ? container.parentElement 
        : container as Element;
      
      // Traverse up to find a block-level element
      while (blockElement && !['P', 'H1', 'H2', 'H3', 'DIV'].includes(blockElement.tagName)) {
        blockElement = blockElement.parentElement;
      }
      
      if (blockElement) {
        // Create new heading element
        const newHeading = document.createElement(tag);
        
        // Apply styling
        switch (tag) {
          case 'h1':
            newHeading.style.fontSize = '2em';
            newHeading.style.fontWeight = 'bold';
            newHeading.style.marginTop = '0.67em';
            newHeading.style.marginBottom = '0.67em';
            break;
          case 'h2':
            newHeading.style.fontSize = '1.5em';
            newHeading.style.fontWeight = 'bold';
            newHeading.style.marginTop = '0.83em';
            newHeading.style.marginBottom = '0.83em';
            break;
          case 'h3':
            newHeading.style.fontSize = '1.17em';
            newHeading.style.fontWeight = 'bold';
            newHeading.style.marginTop = '1em';
            newHeading.style.marginBottom = '1em';
            break;
          case 'p':
            newHeading.style.fontSize = '1em';
            newHeading.style.marginTop = '1em';
            newHeading.style.marginBottom = '1em';
            break;
        }
        
        // Copy text content safely
        newHeading.textContent = blockElement.textContent || '';
        
        // Replace old element with new heading
        blockElement.parentNode?.replaceChild(newHeading, blockElement);
        
        logger.log('Block element converted to heading successfully');
        return true;
      } else {
        logger.log('No suitable block element found to convert');
        return false;
      }
    } catch (error) {
      return handleFormattingError('heading conversion', error);
    }
  }
};