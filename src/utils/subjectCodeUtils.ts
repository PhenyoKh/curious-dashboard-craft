/**
 * Utility functions for generating subject codes from subject names
 * Used across the application for consistent subject code display
 */

/**
 * Generates a subject code from a subject name
 * @param subjectName - The full subject name (e.g., "Engineering 400", "Computer Science 101")
 * @returns The generated subject code (e.g., "ENG400", "CS101")
 */
export function generateSubjectCode(subjectName: string): string {
  if (!subjectName || typeof subjectName !== 'string') {
    return 'NO';
  }

  // Clean and normalize the subject name
  const cleanName = subjectName.trim();
  
  // Pattern 1: Subject with number (e.g., "Engineering 400" -> "ENG400", "Computer Science 101" -> "CS101")
  const subjectWithNumberMatch = cleanName.match(/^(.+?)\s+(\d+)$/);
  if (subjectWithNumberMatch) {
    const [, subjectPart, numberPart] = subjectWithNumberMatch;
    const words = subjectPart.split(' ').filter(word => word.length > 2);
    
    if (words.length >= 2) {
      // Take first letter of first two significant words + number
      return (words[0][0] + words[1][0] + numberPart).toUpperCase();
    } else if (words.length === 1) {
      // Take first 3 letters of single word + number
      return (words[0].substring(0, 3) + numberPart).toUpperCase();
    }
  }
  
  // Pattern 2: Multiple words without number (e.g., "Data Structures" -> "DS", "Machine Learning" -> "ML")
  const words = cleanName.split(' ').filter(word => word.length > 2);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  // Pattern 3: Single word or short phrase (e.g., "Mathematics" -> "MATH", "Art" -> "ART")
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  
  // Fallback: use first 2-4 characters
  return cleanName.substring(0, Math.min(4, cleanName.length)).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Gets a subject code for display in dashboard components
 * @param subjectName - The subject name from calendar items
 * @returns The subject code or 'NO' if no subject
 */
export function getDisplaySubjectCode(subjectName?: string): string {
  if (!subjectName) {
    return 'NO';
  }
  
  return generateSubjectCode(subjectName);
}