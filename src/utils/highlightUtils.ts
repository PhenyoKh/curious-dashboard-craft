/**
 * Utility functions for the highlight system
 */

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
export const debugHighlights = (highlights: any[], context: string) => {
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