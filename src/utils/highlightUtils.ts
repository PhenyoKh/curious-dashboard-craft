/**
 * Utility functions for the highlight system
 */

import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode, Mark } from '@tiptap/pm/model';

/**
 * Generate a simple UUID for highlights
 * Uses crypto.randomUUID if available, fallback to timestamp-based ID
 */
export const generateHighlightId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  return 'highlight-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

/**
 * Extract category and number from legacy highlight IDs (e.g., "red-1" -> {category: "red", number: 1})
 * For backward compatibility with existing highlights
 */
export const parseLegacyHighlightId = (id: string): { category: string; number: number } | null => {
  const match = id.match(/^(red|yellow|green|blue)-(\d+)$/);
  if (match) {
    return {
      category: match[1],
      number: parseInt(match[2], 10)
    };
  }
  return null;
};

/**
 * Check if an ID follows the legacy format (category-number)
 */
export const isLegacyHighlightId = (id: string): boolean => {
  return /^(red|yellow|green|blue)-\d+$/.test(id);
};

/**
 * Get the next available display number for a category
 * Ensures sequential numbering (1, 2, 3, 4...) by filling gaps
 */
export const getNextDisplayNumber = (existingNumbers: number[]): number => {
  if (existingNumbers.length === 0) return 1;
  
  // Sort numbers and find the first gap
  const sorted = [...existingNumbers].sort((a, b) => a - b);
  
  for (let i = 1; i <= sorted.length + 1; i++) {
    if (!sorted.includes(i)) {
      return i;
    }
  }
  
  // This should never be reached, but fallback to max + 1
  return Math.max(...sorted) + 1;
};

/**
 * Resequence display numbers to ensure 1,2,3,4... sequence
 * Returns a mapping of old number to new number
 */
export const resequenceDisplayNumbers = (existingNumbers: number[]): Map<number, number> => {
  const mapping = new Map<number, number>();
  const sorted = [...existingNumbers].sort((a, b) => a - b);
  
  sorted.forEach((oldNumber, index) => {
    const newNumber = index + 1;
    mapping.set(oldNumber, newNumber);
  });
  
  return mapping;
};

/**
 * Validate highlight ID format (either UUID or legacy)
 */
export const isValidHighlightId = (id: string): boolean => {
  // Check for UUID format (simple pattern)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Check for our fallback format
  const fallbackPattern = /^highlight-\d+-[a-z0-9]+$/;
  
  // Check for legacy format
  const legacyPattern = /^(red|yellow|green|blue)-\d+$/;
  
  return uuidPattern.test(id) || fallbackPattern.test(id) || legacyPattern.test(id);
};

/**
 * Debug utility to log highlight state
 */
export const debugHighlights = (highlights: { id: string; category: string; number: number; text: string }[], context: string) => {
  console.log(`🔍 [${context}] Highlights debug:`, {
    count: highlights.length,
    byCategory: highlights.reduce((acc, h) => {
      acc[h.category] = (acc[h.category] || 0) + 1;
      return acc;
    }, {}),
    details: highlights.map(h => ({
      id: h.id,
      category: h.category,
      number: h.number,
      text: h.text.substring(0, 30) + '...'
    }))
  });
};

/**
 * Types for selection analysis
 */
export interface HighlightInSelection {
  id: string;
  category: string;
  number: number;
  from: number;
  to: number;
  text: string;
  isComplete: boolean; // true if selection covers the entire highlight
  isPartial: boolean;  // true if selection covers only part of the highlight
}

export interface SelectionAnalysis {
  hasHighlights: boolean;
  highlights: HighlightInSelection[];
  selectionType: 'none' | 'complete' | 'partial' | 'multiple' | 'mixed';
  canRemove: boolean;
  canAdd: boolean;
}

/**
 * Analyze a TipTap selection to detect existing highlights
 */
export const analyzeSelection = (editor: Editor, from: number, to: number): SelectionAnalysis => {
  const highlights: HighlightInSelection[] = [];
  const doc = editor.state.doc;
  
  console.log(`🔍 Analyzing selection range: ${from}-${to}`);

  // Track all highlight marks found in the selection
  const highlightRanges = new Map<string, {
    id: string;
    category: string;
    number: number;
    ranges: Array<{ from: number; to: number }>;
  }>();

  // Step through the document and find highlight marks within selection
  doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    if (node.marks) {
      node.marks.forEach((mark: Mark) => {
        if (mark.type.name === 'numberedHighlight') {
          const { id, category, number } = mark.attrs;
          
          if (id && category) {
            if (!highlightRanges.has(id)) {
              highlightRanges.set(id, {
                id,
                category,
                number: Number(number) || 1,
                ranges: []
              });
            }
            
            const nodeFrom = pos;
            const nodeTo = pos + node.nodeSize;
            
            // Only include ranges that overlap with selection
            const overlapFrom = Math.max(nodeFrom, from);
            const overlapTo = Math.min(nodeTo, to);
            
            if (overlapFrom < overlapTo) {
              highlightRanges.get(id)!.ranges.push({ 
                from: overlapFrom, 
                to: overlapTo 
              });
              
              console.log(`📍 Found highlight mark in selection:`, { 
                id, 
                category, 
                number,
                nodeRange: `${nodeFrom}-${nodeTo}`,
                overlapRange: `${overlapFrom}-${overlapTo}`
              });
            }
          }
        }
      });
    }
  });

  // Process each highlight to determine selection coverage
  highlightRanges.forEach((data, id) => {
    // Get the complete text of this highlight from the document
    const completeHighlightRanges: Array<{ from: number; to: number }> = [];
    
    // Find all instances of this highlight in the entire document
    doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.marks) {
        node.marks.forEach((mark: Mark) => {
          if (mark.type.name === 'numberedHighlight' && mark.attrs.id === id) {
            completeHighlightRanges.push({
              from: pos,
              to: pos + node.nodeSize
            });
          }
        });
      }
    });

    // Merge overlapping ranges to get complete highlight bounds
    const sortedCompleteRanges = completeHighlightRanges.sort((a, b) => a.from - b.from);
    const mergedCompleteRanges: Array<{ from: number; to: number }> = [];
    
    for (const range of sortedCompleteRanges) {
      const lastRange = mergedCompleteRanges[mergedCompleteRanges.length - 1];
      if (lastRange && range.from <= lastRange.to) {
        lastRange.to = Math.max(lastRange.to, range.to);
      } else {
        mergedCompleteRanges.push({ ...range });
      }
    }

    // Calculate selection coverage
    const totalHighlightLength = mergedCompleteRanges.reduce((sum, range) => sum + (range.to - range.from), 0);
    const selectedLength = data.ranges.reduce((sum, range) => sum + (range.to - range.from), 0);
    
    const isComplete = selectedLength >= totalHighlightLength * 0.95; // 95% threshold for "complete"
    const isPartial = selectedLength > 0 && !isComplete;
    
    // Get the text content
    const selectedText = data.ranges
      .map(range => doc.textBetween(range.from, range.to))
      .join('');

    const highlightBounds = mergedCompleteRanges.length > 0 ? mergedCompleteRanges[0] : data.ranges[0];
    
    highlights.push({
      id,
      category: data.category,
      number: data.number,
      from: highlightBounds.from,
      to: highlightBounds.to,
      text: selectedText,
      isComplete,
      isPartial
    });

    console.log(`🏷️ Processed highlight ${id}:`, {
      category: data.category,
      totalLength: totalHighlightLength,
      selectedLength,
      isComplete,
      isPartial,
      textPreview: selectedText.substring(0, 30) + '...'
    });
  });

  // Determine selection type
  let selectionType: SelectionAnalysis['selectionType'] = 'none';
  let canRemove = false;
  let canAdd = true;

  if (highlights.length === 0) {
    selectionType = 'none';
    canRemove = false;
    canAdd = true;
  } else if (highlights.length === 1) {
    const highlight = highlights[0];
    if (highlight.isComplete) {
      selectionType = 'complete';
      canRemove = true;
      canAdd = false; // Don't allow adding highlights over existing ones
    } else {
      selectionType = 'partial';
      canRemove = true;
      canAdd = true; // Allow adding to non-highlighted portions
    }
  } else {
    selectionType = 'multiple';
    canRemove = true;
    canAdd = true; // Might be mixed content
  }

  // Check if selection contains non-highlighted text
  const hasUnhighlightedText = checkForUnhighlightedText(editor, from, to, highlights);
  if (hasUnhighlightedText && highlights.length > 0) {
    selectionType = 'mixed';
    canAdd = true;
  }

  const analysis: SelectionAnalysis = {
    hasHighlights: highlights.length > 0,
    highlights,
    selectionType,
    canRemove,
    canAdd
  };

  console.log(`✅ Selection analysis complete:`, {
    type: selectionType,
    highlightCount: highlights.length,
    canRemove,
    canAdd
  });

  return analysis;
};

/**
 * Check if selection contains any non-highlighted text
 */
const checkForUnhighlightedText = (editor: Editor, from: number, to: number, highlights: HighlightInSelection[]): boolean => {
  const doc = editor.state.doc;
  const selectionText = doc.textBetween(from, to);
  
  if (highlights.length === 0) return true;
  
  // Simple heuristic: if total highlighted text is less than selection text, there's unhighlighted content
  const totalHighlightedLength = highlights.reduce((sum, h) => sum + h.text.length, 0);
  const hasGaps = totalHighlightedLength < selectionText.length * 0.95;
  
  console.log(`🔍 Checking for unhighlighted text:`, {
    selectionLength: selectionText.length,
    highlightedLength: totalHighlightedLength,
    hasGaps
  });
  
  return hasGaps;
};

/**
 * Get unique highlight IDs from selection analysis
 */
export const getHighlightIdsFromSelection = (analysis: SelectionAnalysis): string[] => {
  return analysis.highlights.map(h => h.id);
};

/**
 * Get categories affected by selection
 */
export const getAffectedCategories = (analysis: SelectionAnalysis): string[] => {
  const categories = new Set(analysis.highlights.map(h => h.category));
  return Array.from(categories);
};