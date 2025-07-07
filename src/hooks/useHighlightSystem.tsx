
import { useState, useCallback, useRef } from 'react';
import { Highlight, HIGHLIGHT_CATEGORIES } from '@/types/highlight';

export const useHighlightSystem = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const highlightIdCounter = useRef(1);

  const getNextNumberForCategory = useCallback((category: string) => {
    const categoryHighlights = highlights.filter(h => h.category === category);
    return categoryHighlights.length + 1;
  }, [highlights]);

  const addHighlight = useCallback((category: 'key-definition' | 'key-principle' | 'example' | 'review-later', text: string, startOffset: number, endOffset: number) => {
    const id = `highlight-${highlightIdCounter.current++}`;
    const number = getNextNumberForCategory(category);
    
    const newHighlight: Highlight = {
      id,
      category,
      number,
      text,
      startOffset,
      endOffset,
      commentary: '',
      isCompleted: false
    };

    setHighlights(prev => [...prev, newHighlight]);
    setShowHighlightsPanel(true);
    
    return id;
  }, [getNextNumberForCategory]);

  const updateHighlightCommentary = useCallback((id: string, commentary: string) => {
    setHighlights(prev => prev.map(highlight => 
      highlight.id === id 
        ? { ...highlight, commentary, isCompleted: commentary.trim().length > 20 }
        : highlight
    ));
  }, []);

  const scrollToHighlight = useCallback((id: string) => {
    setSelectedHighlight(id);
    // Clear selection after animation
    setTimeout(() => setSelectedHighlight(null), 2000);
  }, []);

  const getCategoryColor = useCallback((category: string) => {
    return HIGHLIGHT_CATEGORIES.find(cat => cat.key === category)?.color || '#ffffff';
  }, []);

  const getCategoryLabel = useCallback((category: string) => {
    return HIGHLIGHT_CATEGORIES.find(cat => cat.key === category)?.label || 'Unknown';
  }, []);

  return {
    highlights,
    showHighlightsPanel,
    setShowHighlightsPanel,
    selectedHighlight,
    addHighlight,
    updateHighlightCommentary,
    scrollToHighlight,
    getCategoryColor,
    getCategoryLabel
  };
};
