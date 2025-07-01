
import React from 'react';
import { Image, Link, Table, Maximize } from 'lucide-react';

interface NoteFormattingToolbarProps {
  onFormatText: (command: string, value?: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  wordCount: number;
}

const NoteFormattingToolbar: React.FC<NoteFormattingToolbarProps> = ({
  onFormatText,
  wordCount
}) => {
  const handleHighlightClick = (color: string) => {
    // Check if the current selection already has this highlight color
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentElement = range.commonAncestorContainer.parentElement;
      
      // If already highlighted with this color, remove the highlight
      if (parentElement && parentElement.style.backgroundColor === color) {
        onFormatText('hiliteColor', 'transparent');
        return;
      }
    }
    
    // Apply the highlight color
    onFormatText('hiliteColor', color);
  };

  const isFormatActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  return (
    <div className="px-6 py-3 overflow-x-auto">
      <div className="flex items-center gap-16 min-w-max">
        {/* Group 1: Text Formatting */}
        <div className="flex items-center gap-1 pr-16 border-r border-gray-200">
          <button
            onClick={() => onFormatText('bold')}
            className={`p-2 hover:bg-gray-100 rounded text-sm font-bold transition-colors ${
              isFormatActive('bold') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => onFormatText('italic')}
            className={`p-2 hover:bg-gray-100 rounded text-sm italic transition-colors ${
              isFormatActive('italic') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => onFormatText('underline')}
            className={`p-2 hover:bg-gray-100 rounded text-sm underline transition-colors ${
              isFormatActive('underline') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Underline (Ctrl+U)"
          >
            U
          </button>
          <button
            onClick={() => onFormatText('strikeThrough')}
            className={`p-2 hover:bg-gray-100 rounded text-sm line-through transition-colors ${
              isFormatActive('strikeThrough') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Strikethrough"
          >
            S
          </button>
        </div>

        {/* Group 2: Headings */}
        <div className="flex items-center gap-1 pr-16 border-r border-gray-200">
          <button
            onClick={() => onFormatText('formatBlock', 'h1')}
            className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
          >
            H1
          </button>
          <button
            onClick={() => onFormatText('formatBlock', 'h2')}
            className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
          >
            H2
          </button>
          <button
            onClick={() => onFormatText('formatBlock', 'h3')}
            className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
          >
            H3
          </button>
        </div>

        {/* Group 3: Lists */}
        <div className="flex items-center gap-1 pr-16 border-r border-gray-200">
          <button
            onClick={() => onFormatText('insertUnorderedList')}
            className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
              isFormatActive('insertUnorderedList') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Bullet List"
          >
            • List
          </button>
          <button
            onClick={() => onFormatText('insertOrderedList')}
            className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
              isFormatActive('insertOrderedList') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Numbered List"
          >
            1. List
          </button>
          <button
            onClick={() => onFormatText('insertHTML', '<input type="checkbox"> ')}
            className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
            title="Checklist"
          >
            ☑ Todo
          </button>
        </div>

        {/* Group 4: Alignment */}
        <div className="flex items-center gap-1 pr-16 border-r border-gray-200">
          <button
            onClick={() => onFormatText('justifyLeft')}
            className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
              isFormatActive('justifyLeft') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Align Left"
          >
            ⬅
          </button>
          <button
            onClick={() => onFormatText('justifyCenter')}
            className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
              isFormatActive('justifyCenter') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Align Center"
          >
            ⬌
          </button>
          <button
            onClick={() => onFormatText('justifyRight')}
            className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
              isFormatActive('justifyRight') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="Align Right"
          >
            ➡
          </button>
        </div>

        {/* Group 5: Text Colors */}
        <div className="flex items-center gap-2 pr-16 border-r border-gray-200">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Text:</span>
            <button
              onClick={() => onFormatText('foreColor', '#000000')}
              className="w-6 h-6 bg-black rounded-full hover:scale-110 transition-transform border border-gray-300"
              title="Black Text"
            ></button>
            <button
              onClick={() => onFormatText('foreColor', '#e74c3c')}
              className="w-6 h-6 bg-red-500 rounded-full hover:scale-110 transition-transform"
              title="Red Text"
            ></button>
            <button
              onClick={() => onFormatText('foreColor', '#3498db')}
              className="w-6 h-6 bg-blue-500 rounded-full hover:scale-110 transition-transform"
              title="Blue Text"
            ></button>
            <button
              onClick={() => onFormatText('foreColor', '#27ae60')}
              className="w-6 h-6 bg-green-500 rounded-full hover:scale-110 transition-transform"
              title="Green Text"
            ></button>
          </div>
          <div className="flex items-center gap-1 ml-3">
            <span className="text-xs text-gray-500 mr-1">Highlight:</span>
            <button
              onClick={() => handleHighlightClick('#ffcdd2')}
              className="w-6 h-6 bg-red-200 rounded-full hover:scale-110 transition-transform border border-red-300"
              title="Red Highlight"
            ></button>
            <button
              onClick={() => handleHighlightClick('#bbdefb')}
              className="w-6 h-6 bg-blue-200 rounded-full hover:scale-110 transition-transform border border-blue-300"
              title="Blue Highlight"
            ></button>
            <button
              onClick={() => handleHighlightClick('#c8e6c9')}
              className="w-6 h-6 bg-green-200 rounded-full hover:scale-110 transition-transform border border-green-300"
              title="Green Highlight"
            ></button>
            <button
              onClick={() => handleHighlightClick('#fff9c4')}
              className="w-6 h-6 bg-yellow-200 rounded-full hover:scale-110 transition-transform border border-yellow-300"
              title="Yellow Highlight"
            ></button>
          </div>
        </div>

        {/* Group 6: Insert Elements */}
        <div className="flex items-center gap-1 pr-16 border-r border-gray-200">
          <button
            className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
            title="Insert Image"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
            title="Insert Link"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
            title="Insert Table"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>

        {/* Group 7: View Options with Word Count */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">
            {wordCount} words
          </span>
          <button
            className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
            title="Full Screen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteFormattingToolbar;
