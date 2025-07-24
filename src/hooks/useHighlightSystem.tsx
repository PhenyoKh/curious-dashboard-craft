
import { useState, useCallback } from 'react';
import { Highlight, HighlightCategories } from '@/types/highlight';

export const useHighlightSystem = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [categoryCounters, setCategoryCounters] = useState({
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0
  });

  const categories: HighlightCategories = {
    red: { name: 'Key Definition', color: '#ffcdd2', prompt: 'Why is this a key definition?' },
    yellow: { name: 'Key Principle', color: '#fff9c4', prompt: 'How does this principle work?' },
    green: { name: 'Example', color: '#c8e6c9', prompt: 'What does this example demonstrate?' },
    blue: { name: 'Review Later', color: '#bbdefb', prompt: 'What should you review about this?' }
  };

  const updateHighlightNumbers = useCallback((category: keyof HighlightCategories) => {
    // Update DOM elements for this category
    const highlightsInCategory = highlights
      .filter(h => h.category === category)
      .sort((a, b) => a.number - b.number);

    highlightsInCategory.forEach((highlight, index) => {
      const newNumber = index + 1;
      
      // Update badge in DOM
      const spans = document.querySelectorAll(`[data-highlight-id="${highlight.id}"]`);
      spans.forEach(span => {
        const badge = span.querySelector('.highlight-badge');
        if (badge) {
          badge.textContent = newNumber.toString();
          badge.setAttribute('data-highlight-number', newNumber.toString());
        }
      });
    });

    // Update state
    setHighlights(prev => {
      const updated = prev.map(highlight => {
        if (highlight.category === category) {
          const categoryHighlights = prev
            .filter(h => h.category === category)
            .sort((a, b) => a.number - b.number);
          const newNumber = categoryHighlights.findIndex(h => h.id === highlight.id) + 1;
          return { ...highlight, number: newNumber };
        }
        return highlight;
      });
      return updated;
    });
  }, [highlights]);

  const addHighlight = useCallback((category: keyof HighlightCategories, text: string) => {
    const newCounter = categoryCounters[category] + 1;
    
    setCategoryCounters(prev => ({
      ...prev,
      [category]: newCounter
    }));

    const newHighlight: Highlight = {
      id: `${category}-${newCounter}`,
      category,
      text,
      number: newCounter,
      commentary: '',
      isExpanded: false
    };

    setHighlights(prev => [...prev, newHighlight]);
    return newHighlight;
  }, [categoryCounters]);

  const removeHighlight = useCallback((highlightId: string) => {
    const highlightToRemove = highlights.find(h => h.id === highlightId);
    if (!highlightToRemove) return;

    setHighlights(prev => prev.filter(highlight => highlight.id !== highlightId));
    
    // Renumber remaining highlights in the same category
    setTimeout(() => {
      updateHighlightNumbers(highlightToRemove.category);
    }, 0);
  }, [highlights, updateHighlightNumbers]);

  const removeHighlightsByText = useCallback((text: string) => {
    console.log('Removing highlights by text:', text);
    console.log('Current highlights:', highlights);
    
    const matchingHighlights = highlights.filter(highlight => {
      const highlightText = highlight.text.trim().toLowerCase();
      const searchText = text.trim().toLowerCase();
      
      const isMatch = highlightText === searchText || 
                     highlightText.includes(searchText) || 
                     searchText.includes(highlightText);
      
      console.log('Comparing:', { highlightText, searchText, isMatch });
      return isMatch;
    });
    
    console.log('Matching highlights found:', matchingHighlights);
    
    if (matchingHighlights.length > 0) {
      // Track categories that need renumbering
      const categoriesToUpdate = new Set(matchingHighlights.map(h => h.category));
      
      setHighlights(prev => {
        const filtered = prev.filter(highlight => {
          const highlightText = highlight.text.trim().toLowerCase();
          const searchText = text.trim().toLowerCase();
          
          const shouldRemove = highlightText === searchText || 
                              highlightText.includes(searchText) || 
                              searchText.includes(highlightText);
          
          return !shouldRemove;
        });
        
        console.log('Highlights after removal:', filtered);
        return filtered;
      });

      // Renumber affected categories
      setTimeout(() => {
        categoriesToUpdate.forEach(category => {
          updateHighlightNumbers(category);
        });
      }, 0);
    }
    
    return matchingHighlights;
  }, [highlights, updateHighlightNumbers]);

  const updateCommentary = useCallback((id: string, commentary: string) => {
    setHighlights(prev => 
      prev.map(highlight => 
        highlight.id === id ? { ...highlight, commentary } : highlight
      )
    );
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setHighlights(prev => 
      prev.map(highlight => 
        highlight.id === id ? { ...highlight, isExpanded: !highlight.isExpanded } : highlight
      )
    );
  }, []);

  return {
    highlights,
    setHighlights,
    showPanel,
    setShowPanel,
    categories,
    addHighlight,
    removeHighlight,
    removeHighlightsByText,
    updateCommentary,
    toggleExpanded
  };
};
