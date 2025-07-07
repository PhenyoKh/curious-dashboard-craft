
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
    setHighlights(prev => prev.filter(highlight => highlight.id !== highlightId));
  }, []);

  const removeHighlightsByText = useCallback((text: string) => {
    console.log('Removing highlights by text:', text);
    console.log('Current highlights:', highlights);
    
    const matchingHighlights = highlights.filter(highlight => {
      const highlightText = highlight.text.trim().toLowerCase();
      const searchText = text.trim().toLowerCase();
      
      // Check for exact match or if the search text is contained within the highlight
      const isMatch = highlightText === searchText || 
                     highlightText.includes(searchText) || 
                     searchText.includes(highlightText);
      
      console.log('Comparing:', { highlightText, searchText, isMatch });
      return isMatch;
    });
    
    console.log('Matching highlights found:', matchingHighlights);
    
    if (matchingHighlights.length > 0) {
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
    }
    
    return matchingHighlights;
  }, [highlights]);

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
