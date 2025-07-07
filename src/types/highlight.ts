
export interface Highlight {
  id: string;
  category: 'red' | 'yellow' | 'green' | 'blue';
  text: string;
  number: number;
  commentary?: string;
  isExpanded?: boolean;
}

export interface HighlightCategories {
  red: { name: 'Key Definition'; color: '#ffcdd2'; prompt: 'Why is this a key definition?' };
  yellow: { name: 'Key Principle'; color: '#fff9c4'; prompt: 'How does this principle work?' };
  green: { name: 'Example'; color: '#c8e6c9'; prompt: 'What does this example demonstrate?' };
  blue: { name: 'Review Later'; color: '#bbdefb'; prompt: 'What should you review about this?' };
}
