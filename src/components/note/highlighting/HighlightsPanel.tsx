
import React from 'react';
import { Highlight } from '@/types/highlight';
import HighlightCard from './HighlightCard';

interface HighlightsPanelProps {
  highlights: Highlight[];
  selectedHighlight: string | null;
  onUpdateCommentary: (id: string, commentary: string) => void;
  isVisible: boolean;
}

const HighlightsPanel: React.FC<HighlightsPanelProps> = ({
  highlights,
  selectedHighlight,
  onUpdateCommentary,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="border-t bg-gray-50 flex-shrink-0 animate-slide-in-bottom" style={{ maxHeight: '40vh' }}>
      <div className="p-6 h-full overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Highlights & Commentary</h3>
        
        {highlights.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No highlights yet. Select text and choose a highlight category to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {highlights.map((highlight) => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                isSelected={selectedHighlight === highlight.id}
                onUpdateCommentary={onUpdateCommentary}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HighlightsPanel;
