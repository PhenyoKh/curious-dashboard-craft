
export const colorShortcuts = {
  '1': { color: '#ffcdd2', name: 'Red - Key Definition' },
  '2': { color: '#fff9c4', name: 'Yellow - Main Principle' },
  '3': { color: '#c8e6c9', name: 'Green - Example' },
  '4': { color: '#bbdefb', name: 'Blue - To Review' }
} as const;

export type ColorShortcutKey = keyof typeof colorShortcuts;
