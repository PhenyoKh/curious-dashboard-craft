
import { applyFontFamily, applyFontSize } from './fontFormatting';
import { applyBasicFormat } from './basicFormatting';
import { applyHighlight } from './colorFormatting';
import { applyHeading } from './headingFormatting';

export const formatText = (command: string, value?: string) => {
  try {
    switch (command) {
      case 'fontName':
        applyFontFamily(value || '');
        break;
      case 'fontSize':
        applyFontSize(value || '');
        break;
      case 'formatBlock':
        if (value && ['h1', 'h2', 'h3', 'p'].includes(value)) {
          applyHeading(value as 'h1' | 'h2' | 'h3' | 'p');
        }
        break;
      case 'foreColor':
        // For selected text, still use document.execCommand for foreColor
        if (window.getSelection()?.toString().trim()) {
          document.execCommand('foreColor', false, value || '');
        }
        break;
      case 'hiliteColor':
      case 'backColor':
        applyHighlight(value || '');
        break;
      default:
        applyBasicFormat(command, value);
    }
  } catch (error) {
    console.error('Error applying formatting:', error);
  }
};

export const insertSymbol = (symbol: string) => {
  document.execCommand('insertText', false, symbol);
};
