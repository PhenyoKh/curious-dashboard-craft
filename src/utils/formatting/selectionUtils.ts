
import { selectionCache } from './selectionCache';

export interface SelectionInfo {
  selection: Selection;
  range: Range;
  selectedText: string;
  hasSelection: boolean;
}

export const getSelectionInfo = (): SelectionInfo | null => {
  const selection = selectionCache.getSelection();
  
  if (!selection || !selection.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();
  
  return {
    selection,
    range,
    selectedText,
    hasSelection: selectedText.length > 0
  };
};

export const applyStyleToRange = (
  range: Range, 
  styles: Record<string, string>,
  tagName: string = 'span'
): void => {
  const selectedContent = range.extractContents();
  const element = document.createElement(tagName);
  
  Object.assign(element.style, styles);
  element.appendChild(selectedContent);
  
  range.insertNode(element);
};

export const clearSelectionAndMoveCursor = (afterElement: Node): void => {
  const selection = selectionCache.getSelection();
  if (!selection) return;
  
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.setStartAfter(afterElement);
  newRange.collapse(true);
  selection.addRange(newRange);
};
