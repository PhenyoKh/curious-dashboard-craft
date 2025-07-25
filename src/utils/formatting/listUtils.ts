
import { createFormattedPlaceholder } from "./colorFormatting";
import { selectionCache } from './selectionCache';
import { executeWithFallback } from './errorHandling';
import { sanitizeHtml } from '../security';

export interface ListState {
  isInList: boolean;
  listType: 'ul' | 'ol' | 'todo' | null;
  level: number;
}

export const getListState = (): ListState => {
  const selection = selectionCache.getSelection();
  if (!selection || !selection.rangeCount) {
    return { isInList: false, listType: null, level: 0 };
  }

  const range = selection.getRangeAt(0);
  let element = range.commonAncestorContainer;
  
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement!;
  }

  // Check if we're inside a list
  let listElement = element as Element;
  while (listElement && listElement !== document.body) {
    if (listElement.tagName === 'UL') {
      return { isInList: true, listType: 'ul', level: getListLevel(listElement) };
    } else if (listElement.tagName === 'OL') {
      return { isInList: true, listType: 'ol', level: getListLevel(listElement) };
    } else if (listElement.classList?.contains('todo-list')) {
      return { isInList: true, listType: 'todo', level: getListLevel(listElement) };
    }
    listElement = listElement.parentElement!;
  }

  return { isInList: false, listType: null, level: 0 };
};

const getListLevel = (listElement: Element): number => {
  let level = 0;
  let parent = listElement.parentElement;
  
  while (parent && parent !== document.body) {
    if (parent.tagName === 'UL' || parent.tagName === 'OL' || parent.classList?.contains('todo-list')) {
      level++;
    }
    parent = parent.parentElement;
  }
  
  return level;
};

export const createBulletList = (): boolean => {
  return executeWithFallback(
    () => {
      const selection = selectionCache.getSelection();
      if (!selection || !selection.rangeCount) throw new Error('No selection');

      const range = selection.getRangeAt(0);
      const ul = document.createElement('ul');
      ul.style.cssText = 'margin: 8px 0; padding-left: 24px; list-style-type: disc;';
      
      const li = document.createElement('li');
      li.style.cssText = 'margin: 4px 0; line-height: 1.5;';
      li.innerHTML = sanitizeHtml(range.toString() || '&nbsp;');
      
      ul.appendChild(li);
      range.deleteContents();
      range.insertNode(ul);
      
      // Position cursor at end of list item
      const newRange = document.createRange();
      newRange.setStart(li, li.childNodes.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    },
    () => document.execCommand('insertUnorderedList', false),
    'bullet list creation'
  );
};

export const createNumberedList = (): boolean => {
  return executeWithFallback(
    () => {
      const selection = selectionCache.getSelection();
      if (!selection || !selection.rangeCount) throw new Error('No selection');

      const range = selection.getRangeAt(0);
      const ol = document.createElement('ol');
      ol.style.cssText = 'margin: 8px 0; padding-left: 24px; list-style-type: decimal;';
      
      const li = document.createElement('li');
      li.style.cssText = 'margin: 4px 0; line-height: 1.5;';
      li.innerHTML = sanitizeHtml(range.toString() || '&nbsp;');
      
      ol.appendChild(li);
      range.deleteContents();
      range.insertNode(ol);
      
      // Position cursor at end of list item
      const newRange = document.createRange();
      newRange.setStart(li, li.childNodes.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    },
    () => document.execCommand('insertOrderedList', false),
    'numbered list creation'
  );
};

export const createTodoList = (): boolean => {
  return executeWithFallback(
    () => {
      const selection = selectionCache.getSelection();
      if (!selection || !selection.rangeCount) throw new Error('No selection');

      const range = selection.getRangeAt(0);
      const ul = document.createElement('ul');
      ul.className = 'todo-list';
      ul.style.cssText = 'margin: 8px 0; padding-left: 0; list-style: none;';
      
      const li = document.createElement('li');
      li.style.cssText = 'margin: 4px 0; display: flex; align-items: center; line-height: 1.5;';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
      
      const span = document.createElement('span');
      span.contentEditable = 'true';
      span.innerHTML = sanitizeHtml(range.toString() || 'Todo item');
      span.style.cssText = 'flex: 1; outline: none;';
      
      // Handle checkbox change
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          span.style.textDecoration = 'line-through';
          span.style.opacity = '0.6';
        } else {
          span.style.textDecoration = 'none';
          span.style.opacity = '1';
        }
      });
      
      li.appendChild(checkbox);
      li.appendChild(span);
      ul.appendChild(li);
      
      range.deleteContents();
      range.insertNode(ul);
      
      // Position cursor in the span
      const newRange = document.createRange();
      newRange.setStart(span, span.childNodes.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    },
    undefined,
    'todo list creation'
  );
};

export const handleListEnter = (e: KeyboardEvent): boolean => {
  const listState = getListState();
  if (!listState.isInList) return false;

  e.preventDefault();
  
  const selection = selectionCache.getSelection();
  if (!selection || !selection.rangeCount) return false;

  const range = selection.getRangeAt(0);
  let currentLi = range.commonAncestorContainer;
  
  // Find the current list item
  while (currentLi && currentLi.nodeType !== Node.ELEMENT_NODE || (currentLi as Element).tagName !== 'LI') {
    currentLi = currentLi.parentNode;
  }
  
  if (!currentLi) return false;
  
  const currentElement = currentLi as HTMLElement;
  const listParent = currentElement.parentElement!;
  
  // Check if current item is empty (double enter to exit list)
  const isEmpty = currentElement.textContent?.trim() === '' || 
                  (listState.listType === 'todo' && currentElement.querySelector('span')?.textContent?.trim() === '');
  
  if (isEmpty) {
    // Exit list mode
    const p = document.createElement('p');
    p.innerHTML = sanitizeHtml(createFormattedPlaceholder());
    p.style.cssText = 'margin: 8px 0; line-height: 1.5;';
    
    if (currentElement.nextSibling) {
      listParent.parentNode!.insertBefore(p, listParent.nextSibling);
    } else {
      listParent.parentNode!.appendChild(p);
    }
    
    // Remove empty list item
    currentElement.remove();
    
    // Remove list if it's empty
    if (listParent.children.length === 0) {
      listParent.remove();
    }
    
    // Position cursor in new paragraph
    const newRange = document.createRange();
    newRange.setStart(p, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    return true;
  }
  
  // Create new list item
  const newLi = document.createElement('li');
  
  if (listState.listType === 'todo') {
    newLi.style.cssText = 'margin: 4px 0; display: flex; align-items: center; line-height: 1.5;';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
    
    const span = document.createElement('span');
    span.contentEditable = 'true';
      span.innerHTML = sanitizeHtml(createFormattedPlaceholder());
    span.style.cssText = 'flex: 1; outline: none;';
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        span.style.textDecoration = 'line-through';
        span.style.opacity = '0.6';
      } else {
        span.style.textDecoration = 'none';
        span.style.opacity = '1';
      }
    });
    
    newLi.appendChild(checkbox);
    newLi.appendChild(span);
  } else {
    newLi.style.cssText = 'margin: 4px 0; line-height: 1.5;';
        newLi.innerHTML = sanitizeHtml(createFormattedPlaceholder());
  }
  
  // Insert new list item after current one
  if (currentElement.nextSibling) {
    listParent.insertBefore(newLi, currentElement.nextSibling);
  } else {
    listParent.appendChild(newLi);
  }
  
  // Position cursor in new item
  const newRange = document.createRange();
  if (listState.listType === 'todo') {
    const span = newLi.querySelector('span')!;
    newRange.setStart(span, 0);
  } else {
    newRange.setStart(newLi, 0);
  }
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
  
  return true;
};

export const exitListMode = (): void => {
  const selection = selectionCache.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const p = document.createElement('p');
  p.innerHTML = sanitizeHtml(createFormattedPlaceholder());
  p.style.cssText = 'margin: 8px 0; line-height: 1.5;';
  
  range.insertNode(p);
  
  const newRange = document.createRange();
  newRange.setStart(p, 0);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
};
