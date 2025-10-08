
import { useState, useCallback, useEffect } from 'react';
import { Highlight, HighlightCategories } from '@/types/highlight';
import { logger } from '@/utils/logger';
import { 
  generateHighlightId, 
  getNextDisplayNumber, 
  resequenceDisplayNumbers,
  debugHighlights,
  isLegacyHighlightId,
  parseLegacyHighlightId
} from '@/utils/highlightUtils';

export const useHighlightSystem = (onHighlightsChange?: (highlights: Highlight[]) => void) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const categories: HighlightCategories = {
    red: { name: 'Key Definition', color: '#ffcdd2', prompt: 'Why is this a key definition?' },
    yellow: { name: 'Key Principle', color: '#fff9c4', prompt: 'How does this principle work?' },
    green: { name: 'Example', color: '#c8e6c9', prompt: 'What does this example demonstrate?' },
    blue: { name: 'Review Later', color: '#bbdefb', prompt: 'What should you review about this?' }
  };

  /**
   * Get the display numbers currently used for a specific category
   */
  const getUsedDisplayNumbers = useCallback((category: keyof HighlightCategories): number[] => {
    return highlights
      .filter(h => h.category === category)
      .map(h => h.number)
      .sort((a, b) => a - b);
  }, [highlights]);

  /**
   * Get the next available display number for a category
   */
  const getNextDisplayNumberForCategory = useCallback((category: keyof HighlightCategories): number => {
    const usedNumbers = getUsedDisplayNumbers(category);
    return getNextDisplayNumber(usedNumbers);
  }, [getUsedDisplayNumbers]);

  /**
   * Resequence display numbers for a category to ensure 1,2,3,4... sequence
   * Updates both state and DOM synchronously to eliminate race conditions
   */
  const resequenceCategory = useCallback((category: keyof HighlightCategories) => {
    logger.log(`🔄 Resequencing category: ${category}`);
    
    setHighlights(prev => {
      const categoryHighlights = prev.filter(h => h.category === category);
      const otherHighlights = prev.filter(h => h.category !== category);
      
      if (categoryHighlights.length === 0) {
        logger.log(`📝 No highlights in category ${category}, nothing to resequence`);
        return prev;
      }

      // Get current numbers and create resequencing map
      const currentNumbers = categoryHighlights.map(h => h.number);
      const resequenceMap = resequenceDisplayNumbers(currentNumbers);
      
      logger.log(`🔢 Resequence mapping for ${category}:`, Object.fromEntries(resequenceMap));

      // Update highlights with new sequential numbers
      const resequencedHighlights = categoryHighlights.map(highlight => {
        const newNumber = resequenceMap.get(highlight.number) || highlight.number;
        
        // Update DOM elements synchronously
        const spans = document.querySelectorAll(`[data-highlight-id="${highlight.id}"]`);
        spans.forEach(span => {
          span.setAttribute('data-highlight-number', newNumber.toString());
          span.setAttribute('data-number', newNumber.toString());
          
          // Update any badge elements if they exist
          const badge = span.querySelector('.highlight-badge');
          if (badge) {
            badge.textContent = newNumber.toString();
            badge.setAttribute('data-highlight-number', newNumber.toString());
          }
        });

        return { ...highlight, number: newNumber };
      });

      // Sort by new numbers to maintain order
      resequencedHighlights.sort((a, b) => a.number - b.number);
      
      const result = [...otherHighlights, ...resequencedHighlights];
      logger.log(`✅ Resequenced ${category}: ${resequencedHighlights.map(h => h.number).join(',')}`);
      
      return result;
    });
  }, []);

  const addHighlight = useCallback((category: keyof HighlightCategories, text: string) => {
    logger.log(`➕ Adding highlight to category: ${category}, text: "${text.substring(0, 50)}..."`);
    
    const displayNumber = getNextDisplayNumberForCategory(category);
    const uniqueId = generateHighlightId();
    
    logger.log(`🆔 Generated ID: ${uniqueId}, display number: ${displayNumber}`);

    const newHighlight: Highlight = {
      id: uniqueId,
      category,
      text,
      number: displayNumber,
      commentary: '',
      isExpanded: false
    };

    setHighlights(prev => {
      const updated = [...prev, newHighlight];
      debugHighlights(updated, 'After adding highlight');
      return updated;
    });
    
    return newHighlight;
  }, [getNextDisplayNumberForCategory]);

  const removeHighlight = useCallback((highlightId: string) => {
    logger.log(`🗑️ Removing highlight: ${highlightId}`);
    
    const highlightToRemove = highlights.find(h => h.id === highlightId);
    if (!highlightToRemove) {
      logger.log(`⚠️ Highlight not found: ${highlightId}`);
      return;
    }

    logger.log(`🗑️ Removing ${highlightToRemove.category}-${highlightToRemove.number}: "${highlightToRemove.text.substring(0, 30)}..."`);

    setHighlights(prev => {
      const filtered = prev.filter(highlight => highlight.id !== highlightId);
      debugHighlights(filtered, 'After removing highlight');
      return filtered;
    });
    
    // Resequence the affected category synchronously
    // Use setTimeout to ensure state update completes first
    setTimeout(() => {
      resequenceCategory(highlightToRemove.category);
    }, 0);
  }, [highlights, resequenceCategory]);

  const removeHighlightsByText = useCallback((text: string) => {
    logger.log('🔍 Removing highlights by text:', text);
    debugHighlights(highlights, 'Before text-based removal');
    
    const matchingHighlights = highlights.filter(highlight => {
      const highlightText = highlight.text.trim().toLowerCase();
      const searchText = text.trim().toLowerCase();
      
      const isMatch = highlightText === searchText || 
                     highlightText.includes(searchText) || 
                     searchText.includes(highlightText);
      
      logger.log('🔍 Comparing:', { highlightText, searchText, isMatch });
      return isMatch;
    });
    
    logger.log('🎯 Matching highlights found:', matchingHighlights.length);
    
    if (matchingHighlights.length > 0) {
      // Track categories that need resequencing
      const categoriesToResequence = new Set(matchingHighlights.map(h => h.category));
      
      setHighlights(prev => {
        const filtered = prev.filter(highlight => {
          const highlightText = highlight.text.trim().toLowerCase();
          const searchText = text.trim().toLowerCase();
          
          const shouldRemove = highlightText === searchText || 
                              highlightText.includes(searchText) || 
                              searchText.includes(highlightText);
          
          return !shouldRemove;
        });
        
        debugHighlights(filtered, 'After text-based removal');
        return filtered;
      });

      // Resequence affected categories
      setTimeout(() => {
        categoriesToResequence.forEach(category => {
          resequenceCategory(category as keyof HighlightCategories);
        });
      }, 0);
    }
    
    return matchingHighlights;
  }, [highlights, resequenceCategory]);

  const updateCommentary = useCallback((id: string, commentary: string) => {
    setHighlights(prev => {
      console.log('🔄 Highlight system state update:', {
        previousState: prev,
        highlightId: id,
        newCommentary: commentary
      });
      
      const updated = prev.map(highlight => 
        highlight.id === id ? { ...highlight, commentary } : highlight
      );
      
      console.log('✨ Highlight system after update:', {
        updatedState: updated,
        updatedHighlight: updated.find(h => h.id === id)
      });
      
      // Trigger highlights change after commentary update
      if (onHighlightsChange) {
        onHighlightsChange(updated);
      }
      return updated;
    });
  }, [onHighlightsChange]);

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
    toggleExpanded,
    resequenceCategory,
    getUsedDisplayNumbers,
    getNextDisplayNumberForCategory
  };
};
