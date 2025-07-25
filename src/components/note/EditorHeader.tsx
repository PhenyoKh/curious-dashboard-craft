import React from 'react';
import { ArrowLeft, Search, Eye, FileText, Download, Save } from 'lucide-react';

interface EditorHeaderProps {
  onBack?: () => void;
  onSearch?: () => void;
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
  highlightsCount: number;
  onPdfExport?: () => void;
  onTextExport?: () => void;
  onSave?: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  onBack,
  onSearch,
  showPanel,
  setShowPanel,
  highlightsCount,
  onPdfExport,
  onTextExport,
  onSave
}) => {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Back arrow + StudyFlow branding */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="flex items-center">
            <span className="text-xl font-semibold text-gray-900">StudyFlow</span>
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {/* Search */}
          {onSearch && (
            <button
              onClick={onSearch}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Show Highlights Panel */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showPanel
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            title={`${showPanel ? 'Hide' : 'Show'} highlights panel`}
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">
              Highlights ({highlightsCount})
            </span>
          </button>

          {/* PDF Export */}
          {onPdfExport && (
            <button
              onClick={onPdfExport}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export as PDF"
            >
              <FileText className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Text Export */}
          {onTextExport && (
            <button
              onClick={onTextExport}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export as Text"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Save - Prominent blue button */}
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              title="Save document"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">Save</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorHeader;