
import React from 'react';
import { Highlight, HighlightCategories } from '@/types/highlight';
import HighlightCard from './HighlightCard';
import { X } from 'lucide-react';

interface HighlightsPanelProps {
  highlights: Highlight[];
  categories: HighlightCategories;
  showPanel: boolean;
  onUpdateCommentary: (id: string, commentary: string) => void;
  onToggleExpanded: (id: string) => void;
  onClose: () => void;
}

const HighlightsPanel: React.FC<HighlightsPanelProps> = ({
  highlights,
  categories,
  showPanel,
  onUpdateCommentary,
  onToggleExpanded,
  onClose
}) => {
  if (!showPanel) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 shadow-lg z-40 animate-slide-in-bottom">
      <div className="h-[40vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">Highlights & Commentary</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {highlights.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No highlights yet. Select text in your notes and choose a highlight category to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlights.map(highlight => (
                <HighlightCard
                  key={highlight.id}
                  highlight={highlight}
                  categories={categories}
                  onUpdateCommentary={onUpdateCommentary}
                  onToggleExpanded={onToggleExpanded}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HighlightsPanel;
