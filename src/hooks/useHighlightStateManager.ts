import { useState, useCallback } from 'react';
import { Highlight } from '@/types/highlight';
import { logger } from '@/utils/logger';
import { useVersionedState } from './useVersionedState';

interface SaveableHighlight {
  id: string;
  commentary: string;
  isExpanded: boolean;
}

export function useHighlightStateManager(
  initialHighlights: SaveableHighlight[] = [],
  onSave: (highlights: SaveableHighlight[]) => Promise<void>
) {
  // Use versioned state for highlight management
  const {
    data: highlights,
    updateData: updateHighlights,
    isSaving,
    hasPendingChanges,
    saveError,
    currentVersion
  } = useVersionedState(initialHighlights, onSave, {
    debounceMs: 1000,
    retryAttempts: 3,
    retryDelayMs: 1000
  });

  // Update a single highlight's commentary
  const updateCommentary = useCallback((id: string, commentary: string) => {
    logger.info(`Updating commentary for highlight ${id}`);
    
    const updatedHighlights = highlights.map(h =>
      h.id === id ? { ...h, commentary } : h
    );
    
    updateHighlights(updatedHighlights);
  }, [highlights, updateHighlights]);

  // Toggle expanded state for a highlight
  const toggleExpanded = useCallback((id: string) => {
    logger.info(`Toggling expanded state for highlight ${id}`);
    
    const updatedHighlights = highlights.map(h =>
      h.id === id ? { ...h, isExpanded: !h.isExpanded } : h
    );
    
    updateHighlights(updatedHighlights);
  }, [highlights, updateHighlights]);

  // Batch update highlights (e.g., when receiving updates from editor)
  const batchUpdateHighlights = useCallback((newHighlights: Highlight[]) => {
    logger.info(`Batch updating ${newHighlights.length} highlights`);
    
    const updatedHighlights = newHighlights.map(h => ({
      id: h.id,
      commentary: h.commentary || '',
      isExpanded: h.isExpanded || false
    }));
    
    updateHighlights(updatedHighlights);
  }, [updateHighlights]);

  return {
    highlights,
    updateCommentary,
    toggleExpanded,
    batchUpdateHighlights,
    isSaving,
    hasPendingChanges,
    saveError,
    currentVersion
  };
}