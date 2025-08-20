import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useHighlightSystem } from './useHighlightSystem';
import { HighlightCategories } from '@/types/highlight';
import { logger } from '@/utils/logger';
import { 
  analyzeSelection, 
  getHighlightIdsFromSelection, 
  getAffectedCategories,
  SelectionAnalysis 
} from '@/utils/highlightUtils';

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
  }, [editor, highlightSystem]);

  const removeTiptapHighlight = useCallback((highlightId: string) => {
    if (!editor) return;
    highlightSystem.removeHighlight(highlightId);
    
    // Force immediate save to ensure persistence for single highlight removal
    if (onSave) {
      logger.log('💾 Triggering immediate save after single highlight removal');
      setTimeout(() => {
        onSave();
      }, 100); // Small delay to ensure state updates complete
    }
  }, [editor, highlightSystem, onSave]);

  const removeHighlightsFromSelection = useCallback((analysis: SelectionAnalysis) => {
    if (!editor || !analysis.hasHighlights) return;

    logger.log('🗑️ Removing highlights from selection:', analysis);

    // Remove highlight marks from the current selection using TipTap command
    editor.chain().focus().unsetNumberedHighlight().run();

    // Remove highlights from state
    const highlightIds = getHighlightIdsFromSelection(analysis);
    highlightIds.forEach(id => {
      highlightSystem.removeHighlight(id);
    });

    logger.log('✅ Removed highlights:', highlightIds);

    // Force immediate save to ensure persistence
    // This ensures changes are saved even if user refreshes quickly
    if (onSave) {
      logger.log('💾 Triggering immediate save after highlight removal');
      setTimeout(() => {
        onSave();
      }, 100); // Small delay to ensure DOM updates complete
    }
  }, [editor, highlightSystem, onSave]);

  const updateHighlightCommentary = useCallback((id: string, commentary: string) => {
    highlightSystem.updateCommentary(id, commentary);
    
    // Save is now handled by onHighlightsChange, no need for manual save trigger
    // if (onSave) {
    //   setTimeout(onSave, 300);
    // }
  }, [highlightSystem]);

  const showHighlightMenu = useCallback((event: MouseEvent) => {
    if (!editor) return;

    const selection = editor.state.selection;
    if (selection.empty) return;

    const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
    if (!selectedText.trim()) return;

    // Analyze the selection to detect existing highlights
    const analysis = analyzeSelection(editor, selection.from, selection.to);
    
    logger.log('🎯 Selection analysis for menu:', analysis);

    const menu = document.createElement('div');
    menu.className = 'absolute bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]';
    menu.style.position = 'fixed';
    menu.style.top = `${event.clientY + 5}px`;
    menu.style.left = `${event.clientX}px`;

    const menuContent = document.createElement('div');
    menuContent.className = 'p-2';

    // Add removal options if highlights are detected
    if (analysis.canRemove && analysis.hasHighlights) {
      const removeSection = document.createElement('div');
      removeSection.className = 'mb-2 pb-2 border-b border-gray-200';

      const removeTitle = document.createElement('div');
      removeTitle.className = 'text-xs font-medium text-gray-500 uppercase tracking-wide mb-1';
      removeTitle.textContent = 'Remove Highlights';
      removeSection.appendChild(removeTitle);

      const removeButton = document.createElement('button');
      removeButton.className = 'w-full px-3 py-2 text-sm font-medium rounded border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center gap-2';
      
      if (analysis.selectionType === 'multiple') {
        removeButton.innerHTML = `🗑️ Remove All Highlights (${analysis.highlights.length})`;
      } else if (analysis.selectionType === 'complete') {
        const highlight = analysis.highlights[0];
        removeButton.innerHTML = `🗑️ Remove ${highlightSystem.categories[highlight.category as keyof HighlightCategories]?.name || highlight.category} Highlight`;
      } else {
        removeButton.innerHTML = `🗑️ Remove Highlight${analysis.highlights.length > 1 ? 's' : ''}`;
      }

      removeButton.onclick = () => {
        removeHighlightsFromSelection(analysis);
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
      };

      removeSection.appendChild(removeButton);
      menuContent.appendChild(removeSection);
    }

    // Add highlight category options if applicable
    if (analysis.canAdd) {
      if (analysis.canRemove) {
        const addTitle = document.createElement('div');
        addTitle.className = 'text-xs font-medium text-gray-500 uppercase tracking-wide mb-1';
        addTitle.textContent = analysis.selectionType === 'mixed' ? 'Add Highlights' : 'Highlight As';
        menuContent.appendChild(addTitle);
      }

      const categoriesContainer = document.createElement('div');
      categoriesContainer.className = 'flex gap-2 flex-wrap';

      Object.entries(highlightSystem.categories).forEach(([key, category]) => {
        const button = document.createElement('button');
        button.className = 'px-3 py-1 text-xs font-medium rounded border hover:bg-gray-50 transition-colors';
        button.style.borderColor = category.color;
        button.style.backgroundColor = category.color + '20'; // Add transparency
        button.style.color = '#374151';
        button.textContent = category.name;

        button.onclick = () => {
          addTiptapHighlight(key as keyof HighlightCategories, selectedText);
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
        };

        categoriesContainer.appendChild(button);
      });

      menuContent.appendChild(categoriesContainer);
    }

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
    };

    menu.appendChild(menuContent);
    menu.appendChild(closeBtn);
    document.body.appendChild(menu);

    const handleClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && document.body.contains(menu)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', handleClickOutside);
      }
    };
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
  }, [editor, addTiptapHighlight, removeHighlightsFromSelection, highlightSystem.categories]);

  return {
    ...highlightSystem,
    setHighlights: highlightSystem.setHighlights, // Expose setHighlights for restoration
    addTiptapHighlight,
    removeTiptapHighlight,
    showHighlightMenu,
    updateCommentary: updateHighlightCommentary,
  };
};