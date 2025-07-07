
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Highlight, HIGHLIGHT_CATEGORIES } from '@/types/highlight';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface HighlightCardProps {
  highlight: Highlight;
  isSelected: boolean;
  onUpdateCommentary: (id: string, commentary: string) => void;
}

const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  isSelected,
  onUpdateCommentary
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentary, setCommentary] = useState(highlight.commentary || '');

  const category = HIGHLIGHT_CATEGORIES.find(cat => cat.key === highlight.category);
  if (!category) return null;

  const handleCommentaryChange = (value: string) => {
    setCommentary(value);
    // Auto-save after a short delay
    setTimeout(() => {
      onUpdateCommentary(highlight.id, value);
    }, 500);
  };

  const truncatedText = highlight.text.length > 100 
    ? `${highlight.text.substring(0, 100)}...` 
    : highlight.text;

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border-l-4 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
      style={{ borderLeftColor: category.borderColor }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium text-gray-700"
              style={{ backgroundColor: category.color }}
            >
              {category.label} {highlight.number}
            </span>
            {highlight.isCompleted && (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 h-6 w-6"
          >
            {isExpanded ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
            }
          </Button>
        </div>

        {/* Preview text */}
        <p className="text-sm text-gray-600 mb-2">
          "{truncatedText}"
        </p>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 space-y-3 animate-accordion-down">
            {/* Full text if truncated */}
            {highlight.text.length > 100 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Full Text:</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  "{highlight.text}"
                </p>
              </div>
            )}

            {/* Commentary prompts */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Commentary Prompts:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {category.prompts.map((prompt, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{prompt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Commentary textarea */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Your Commentary:</h4>
              <Textarea
                value={commentary}
                onChange={(e) => handleCommentaryChange(e.target.value)}
                placeholder="Add your thoughts, explanations, or questions here..."
                className="min-h-[100px] text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {commentary.length > 20 ? '✓ Sufficient commentary' : 'Add more detail for completion'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HighlightCard;
