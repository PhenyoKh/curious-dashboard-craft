
export interface Highlight {
  id: string;
  category: 'key-definition' | 'key-principle' | 'example' | 'review-later';
  number: number;
  text: string;
  startOffset: number;
  endOffset: number;
  commentary?: string;
  isCompleted: boolean;
}

export interface HighlightCategory {
  key: 'key-definition' | 'key-principle' | 'example' | 'review-later';
  label: string;
  color: string;
  borderColor: string;
  prompts: string[];
}

export const HIGHLIGHT_CATEGORIES: HighlightCategory[] = [
  {
    key: 'key-definition',
    label: 'Key Definition',
    color: '#ffcdd2',
    borderColor: '#f44336',
    prompts: [
      'Define this term in your own words',
      'Why is this definition important?',
      'What are the key components of this definition?'
    ]
  },
  {
    key: 'key-principle',
    label: 'Key Principle',
    color: '#fff9c4',
    borderColor: '#ffeb3b',
    prompts: [
      'Explain this principle step by step',
      'How does this principle apply in real situations?',
      'What would happen if this principle didn\'t exist?'
    ]
  },
  {
    key: 'example',
    label: 'Example',
    color: '#c8e6c9',
    borderColor: '#4caf50',
    prompts: [
      'How does this example illustrate the concept?',
      'Can you think of similar examples?',
      'What makes this a good example?'
    ]
  },
  {
    key: 'review-later',
    label: 'Review Later',
    color: '#bbdefb',
    borderColor: '#2196f3',
    prompts: [
      'What questions do you have about this?',
      'What additional research is needed?',
      'How does this connect to other topics?'
    ]
  }
];
