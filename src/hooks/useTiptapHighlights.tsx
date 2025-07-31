import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useHighlightSystem } from './useHighlightSystem';
import { HighlightCategories } from '@/types/highlight';

export const useTiptapHighlights = (editor: Editor | null, onSave?: () => void) => {
  const highlightSystem = useHighlightSystem();

  const addTiptapHighlight = useCallback((category: keyof HighlightCategories, selectedText: string) => {
    if (!editor) return null;

    const highlight = highlightSystem.addHighlight(category, selectedText);
    const categoryData = highlightSystem.categories[category];

    editor.chain().focus().setNumberedHighlight({
      category,
      id: highlight.id,
      number: highlight.number,
      color: categoryData.color,
    }).run();

    // Save is now handled by onHighlightsChange, no need for manual save trigger
    // if (onSave) {
    //   setTimeout(onSave, 300);
    // }

    return highlight;
  }, [editor, highlightSystem, onSave]);

  const removeTiptapHighlight = useCallback((highlightId: string) => {
    if (!editor) return;
    highlightSystem.removeHighlight(highlightId);
    
    // Save is now handled by onHighlightsChange, no need for manual save trigger
    // if (onSave) {
    //   setTimeout(onSave, 300);
    // }
  }, [editor, highlightSystem, onSave]);

  const updateHighlightCommentary = useCallback((id: string, commentary: string) => {
    highlightSystem.updateCommentary(id, commentary);
    
    // Save is now handled by onHighlightsChange, no need for manual save trigger
    // if (onSave) {
    //   setTimeout(onSave, 300);
    // }
  }, [highlightSystem, onSave]);

  const showHighlightMenu = useCallback((event: MouseEvent) => {
    if (!editor) return;

    const selection = editor.state.selection;
    if (selection.empty) return;

    const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
    if (!selectedText.trim()) return;

    const menu = document.createElement('div');
    menu.className = 'absolute bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 flex gap-2';
    menu.style.position = 'fixed';
    menu.style.top = `${event.clientY + 5}px`;
    menu.style.left = `${event.clientX}px`;

    Object.entries(highlightSystem.categories).forEach(([key, category]) => {
      const button = document.createElement('button');
      button.className = 'px-3 py-1 text-xs font-medium rounded border hover:bg-gray-50 transition-colors';
      button.style.borderColor = category.color;
      button.style.color = '#374151';
      button.textContent = category.name;

      button.onclick = () => {
        addTiptapHighlight(key as keyof HighlightCategories, selectedText);
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
      };

      menu.appendChild(button);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'px-2 py-1 text-xs text-gray-500 hover:text-gray-700';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
    };
    menu.appendChild(closeBtn);

    document.body.appendChild(menu);

    const handleClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && document.body.contains(menu)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', handleClickOutside);
      }
    };
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
  }, [editor, addTiptapHighlight, highlightSystem.categories]);

  return {
    ...highlightSystem,
    setHighlights: highlightSystem.setHighlights, // Expose setHighlights for restoration
    addTiptapHighlight,
    removeTiptapHighlight,
    showHighlightMenu,
    updateCommentary: updateHighlightCommentary,
  };
};