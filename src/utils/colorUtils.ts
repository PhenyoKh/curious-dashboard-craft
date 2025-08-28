/**
 * Color utilities for converting between hex values and color names
 * Maintains consistency with SubjectModal color definitions
 */

// Color mapping from SubjectModal - keep in sync!
const COLOR_MAPPINGS = [
  { name: 'blue', hex: '#3B82F6' },
  { name: 'green', hex: '#10B981' },
  { name: 'purple', hex: '#8B5CF6' },
  { name: 'red', hex: '#EF4444' },
  { name: 'yellow', hex: '#F59E0B' },
  { name: 'pink', hex: '#EC4899' }
] as const;

/**
 * Converts a hex color value to a color name
 * @param hex - The hex color value (e.g., '#3B82F6')
 * @returns The corresponding color name (e.g., 'blue') or 'blue' as fallback
 */
export function convertHexToColorName(hex: string): string {
  // Handle null/undefined/empty values
  if (!hex || typeof hex !== 'string') {
    return 'blue'; // Default fallback
  }

  // Normalize hex value (ensure uppercase and # prefix)
  const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;

  // Find matching color mapping
  const colorMapping = COLOR_MAPPINGS.find(mapping => 
    mapping.hex.toUpperCase() === normalizedHex
  );

  // Return the color name or fallback to blue
  return colorMapping?.name || 'blue';
}

/**
 * Converts a color name to a hex value
 * @param colorName - The color name (e.g., 'blue')
 * @returns The corresponding hex value (e.g., '#3B82F6') or '#3B82F6' as fallback
 */
export function convertColorNameToHex(colorName: string): string {
  // Handle null/undefined/empty values
  if (!colorName || typeof colorName !== 'string') {
    return '#3B82F6'; // Default blue
  }

  // Find matching color mapping
  const colorMapping = COLOR_MAPPINGS.find(mapping => 
    mapping.name.toLowerCase() === colorName.toLowerCase()
  );

  // Return the hex value or fallback to blue
  return colorMapping?.hex || '#3B82F6';
}

/**
 * Get all available color options
 * @returns Array of color mappings
 */
export function getAvailableColors() {
  return COLOR_MAPPINGS;
}