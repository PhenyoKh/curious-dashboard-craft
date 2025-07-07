
import React, { useRef, useCallback } from 'react';
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
  onScrollToCard?: (category: string, number: number) => void;
}

const HighlightsPanel: React.FC<HighlightsPanelProps> = ({
  highlights,
  categories,
  showPanel,
  onUpdateCommentary,
  onToggleExpanded,
  onClose,
  onScrollToCard
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const scrollToCard = useCallback((category: string, number: number) => {
    // Find the matching highlight
    const targetHighlight = highlights.find(h => 
      categories[h.category].name === category && h.number === number
    );
    
    if (!targetHighlight) return;
    
    const cardElement = cardRefs.current.get(targetHighlight.id);
    if (!cardElement || !panelRef.current) return;

    // Scroll to the card
    cardElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    // Add visual feedback
    cardElement.style.backgroundColor = '#fff3cd';
    cardElement.style.transition = 'background-color 0.3s ease';
    
    // Remove highlight after 1 second
    setTimeout(() => {
      cardElement.style.backgroundColor = 'white';
    }, 1000);
  }, [highlights, categories]);

  // Expose scrollToCard function to parent
  React.useEffect(() => {
    if (onScrollToCard) {
      // This is a bit of a hack, but we need to pass the function up
      (onScrollToCard as any).current = scrollToCard;
    }
  }, [scrollToCard, onScrollToCard]);

  const setCardRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      cardRefs.current.set(id, element);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

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
        <div ref={panelRef} className="flex-1 overflow-y-auto p-4">
          {highlights.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No highlights yet. Select text in your notes and choose a highlight category to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {highlights.map(highlight => (
                <div
                  key={highlight.id}
                  ref={(el) => setCardRef(highlight.id, el)}
                >
                  <HighlightCard
                    highlight={highlight}
                    categories={categories}
                    onUpdateCommentary={onUpdateCommentary}
                    onToggleExpanded={onToggleExpanded}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HighlightsPanel;
