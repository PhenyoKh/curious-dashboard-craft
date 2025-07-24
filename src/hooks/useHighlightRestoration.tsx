import { useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Highlight, HighlightCategories } from '@/types/highlight';

export const useHighlightRestoration = (
  editor: Editor | null, 
  setHighlights: (highlights: Highlight[]) => void,
  categories: HighlightCategories
) => {
  useEffect(() => {
    if (!editor) return;

    const extractHighlightsFromHTML = () => {
      const highlightElements = editor.view.dom.querySelectorAll('[data-highlight-id]');
      const restoredHighlights: Highlight[] = [];

      highlightElements.forEach((element) => {
        const id = element.getAttribute('data-highlight-id');
        const category = element.getAttribute('data-highlight-category');
        const number = parseInt(element.getAttribute('data-highlight-number') || '1');
        const text = element.textContent || '';

        // Validate category exists in our categories
        if (id && category && category in categories) {
          restoredHighlights.push({
            id,
            category: category as keyof HighlightCategories,
            number,
            text,
            commentary: '', // TODO: Restore from separate storage if needed
            isExpanded: false,
          });
        }
      });

      // Sort by category and number for consistent display
      restoredHighlights.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.number - b.number;
      });

      console.log('🔄 Restored highlights from HTML:', restoredHighlights);
      if (restoredHighlights.length > 0) {
        setHighlights(restoredHighlights);
      }
    };

    // Use editor's onReady-like behavior
    const checkAndExtract = () => {
      if (editor.view.dom.children.length > 0) {
        extractHighlightsFromHTML();
      } else {
        setTimeout(checkAndExtract, 50);
      }
    };

    setTimeout(checkAndExtract, 100);
  }, [editor, setHighlights, categories]);
};