
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, FileText, Download, MessageSquare } from 'lucide-react';
import { exportAsPDF, exportAsText } from '@/utils/noteUtils';

interface NoteTopBarProps {
  title: string;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  wordCount: number;
  isAutoSaved: boolean;
  showHighlightsPanel?: boolean;
  setShowHighlightsPanel?: (show: boolean) => void;
}

const NoteTopBar: React.FC<NoteTopBarProps> = ({
  title,
  showSearch,
  setShowSearch,
  isAutoSaved,
  showHighlightsPanel = false,
  setShowHighlightsPanel
}) => {
  const navigate = useNavigate();

  return (
    <div className="px-6 py-3 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">Scola</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="gap-2 text-sm"
          >
            <Search className="w-4 h-4" />
            Search
          </Button>
          
          {/* Highlights Panel Toggle */}
          {setShowHighlightsPanel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHighlightsPanel(!showHighlightsPanel)}
              className={`gap-2 text-sm ${showHighlightsPanel ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <MessageSquare className="w-4 h-4" />
              Show Highlights Panel
            </Button>
          )}
          
          {/* Auto-save Indicator with smoother transition */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isAutoSaved ? 'bg-green-500' : 'bg-yellow-500'} ${!isAutoSaved ? 'animate-pulse' : ''}`}></div>
            <span className={`font-medium transition-colors duration-300 ${isAutoSaved ? 'text-green-600' : 'text-yellow-600'}`}>
              {isAutoSaved ? 'Saved' : 'Saving...'}
            </span>
          </div>
          
          {/* Export Options */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsPDF}
              className="gap-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAsText(title, '')}
              className="gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Text
            </Button>
          </div>
          
          <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoteTopBar;
