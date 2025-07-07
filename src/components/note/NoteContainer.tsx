
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useHighlightSystem } from '@/hooks/useHighlightSystem';
import HighlightingNoteEditor from './highlighting/HighlightingNoteEditor';
import HighlightsPanel from './highlighting/HighlightsPanel';

const NoteContainer: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('Biology 101 - Cellular Respiration');
  const [content, setContent] = useState('');
  const [isAutoSaved, setIsAutoSaved] = useState(true);

  const {
    highlights,
    showHighlightsPanel,
    setShowHighlightsPanel,
    selectedHighlight,
    updateHighlightCommentary
  } = useHighlightSystem();

  const { debouncedSave, cleanup } = useAutoSave({ 
    onSave: () => {
      setIsAutoSaved(false);
      setTimeout(() => setIsAutoSaved(true), 1000);
    }, 
    delay: 800 
  });

  // Cleanup auto-save on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    debouncedSave();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Header */}
      <div className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">StudyFlow</h1>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isAutoSaved ? 'bg-green-500' : 'bg-yellow-500'} ${!isAutoSaved ? 'animate-pulse' : ''}`}></div>
              <span className={`font-medium transition-colors duration-300 ${isAutoSaved ? 'text-green-600' : 'text-yellow-600'}`}>
                {isAutoSaved ? 'Saved' : 'Saving...'}
              </span>
            </div>

            {/* Highlights panel toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHighlightsPanel(!showHighlightsPanel)}
              className="gap-2"
            >
              {showHighlightsPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showHighlightsPanel ? 'Hide' : 'Show'} Highlights Panel
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Notes Editor */}
        <HighlightingNoteEditor
          title={title}
          setTitle={setTitle}
          content={content}
          onContentChange={handleContentChange}
        />

        {/* Highlights Panel */}
        <HighlightsPanel
          highlights={highlights}
          selectedHighlight={selectedHighlight}
          onUpdateCommentary={updateHighlightCommentary}
          isVisible={showHighlightsPanel}
        />
      </div>
    </div>
  );
};

export default NoteContainer;
