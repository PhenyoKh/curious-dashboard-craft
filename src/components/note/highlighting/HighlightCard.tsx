
import React from 'react';
import { Highlight, HighlightCategories } from '@/types/highlight';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface HighlightCardProps {
  highlight: Highlight;
  categories: HighlightCategories;
  onUpdateCommentary: (id: string, commentary: string) => void;
  onToggleExpanded: (id: string) => void;
}

const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  categories,
  onUpdateCommentary,
  onToggleExpanded
}) => {
  const category = categories[highlight.category];
  const hasCommentary = highlight.commentary && highlight.commentary.trim().length > 0;

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
    >
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => onToggleExpanded(highlight.id)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              {category.name} {highlight.number}
            </span>
            {hasCommentary && (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">
            {highlight.text.substring(0, 100)}
            {highlight.text.length > 100 && '...'}
          </p>
        </div>
        {highlight.isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </div>
      
      {highlight.isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Original Text:</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-3">
              {highlight.text}
            </p>
            
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {category.prompt}
            </h4>
            <Textarea
              value={highlight.commentary || ''}
              onChange={(e) => onUpdateCommentary(highlight.id, e.target.value)}
              placeholder="Add your commentary..."
              className="min-h-[80px] text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightCard;
