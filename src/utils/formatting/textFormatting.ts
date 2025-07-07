import { applyFontFamily, applyFontSize } from './fontFormatting';
import { applyBasicFormat } from './basicFormatting';
import { applyHighlight, applyFontColor } from './colorFormatting';

export const formatText = (command: string, value?: string): void => {
  console.log('Format command:', command, 'Value:', value);

  switch (command) {
    case 'bold':
    case 'italic':
    case 'underline':
      applyBasicFormat(command);
      break;
    
    case 'fontName':
      if (value) {
        applyFontFamily(value);
      }
      break;
    
    case 'fontSize':
      if (value) {
        applyFontSize(value);
      }
      break;
    
    case 'foreColor':
      if (value) {
        // Use secure color application instead of execCommand
        applyFontColor(value);
      }
      break;
    
    case 'hiliteColor':
    case 'backColor':
      if (value) {
        applyHighlight(value);
      }
      break;
    
    default:
      console.log('Unknown formatting command:', command);
  }
};

export const insertSymbol = (symbol: string): void => {
  console.log('Inserting symbol:', symbol);
  
  // Validate and sanitize symbol input
  if (typeof symbol !== 'string' || symbol.length > 10) {
    console.error('Invalid symbol input');
    return;
  }
  
  // Only allow safe characters (alphanumeric, basic punctuation, and common symbols)
  const sanitizedSymbol = symbol.replace(/[^\w\s\.\,\!\?\-\+\=\(\)\[\]\{\}\@\#\$\%\^\&\*\|\\\:]/g, '');
  
  if (sanitizedSymbol !== symbol) {
    console.warn('Symbol was sanitized:', symbol, '->', sanitizedSymbol);
  }
  
  if (sanitizedSymbol.length === 0) {
    console.error('Symbol contains no valid characters');
    return;
  }
  
  // Use modern insertion method instead of execCommand
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(sanitizedSymbol));
    range.collapse(false);
  }
};