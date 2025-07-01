
import React from 'react';
import { formatText, insertCheckbox, insertTable, insertHorizontalRule, insertBlockQuote, insertCodeBlock, insertSymbol } from '@/utils/editorUtils';

interface EditorToolbarProps {
  onContentChange: () => void;
  editorRef: React.RefObject<HTMLDivElement>;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onContentChange, editorRef }) => {
  const handleFormatText = (command: string, value?: string) => {
    formatText(command, value);
    editorRef.current?.focus();
    onContentChange();
  };

  const handleInsert = (insertFn: () => void) => {
    insertFn();
    onContentChange();
  };

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
          <button
            onClick={() => handleFormatText('bold')}
            className="p-2 hover:bg-gray-100 rounded text-sm font-bold"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => handleFormatText('italic')}
            className="p-2 hover:bg-gray-100 rounded text-sm italic"
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => handleFormatText('underline')}
            className="p-2 hover:bg-gray-100 rounded text-sm underline"
            title="Underline (Ctrl+U)"
          >
            U
          </button>
          <button
            onClick={() => handleFormatText('strikeThrough')}
            className="p-2 hover:bg-gray-100 rounded text-sm line-through"
            title="Strikethrough"
          >
            S
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
          <button
            onClick={() => handleFormatText('formatBlock', 'h1')}
            className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold"
          >
            H1
          </button>
          <button
            onClick={() => handleFormatText('formatBlock', 'h2')}
            className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold"
          >
            H2
          </button>
          <button
            onClick={() => handleFormatText('formatBlock', 'h3')}
            className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold"
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
          <button
            onClick={() => handleFormatText('insertUnorderedList')}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Bullet List"
          >
            • List
          </button>
          <button
            onClick={() => handleFormatText('insertOrderedList')}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Numbered List"
          >
            1. List
          </button>
          <button
            onClick={() => handleInsert(insertCheckbox)}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Checklist"
          >
            ☑ Todo
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
          <button
            onClick={() => handleFormatText('justifyLeft')}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Align Left"
          >
            ⬅
          </button>
          <button
            onClick={() => handleFormatText('justifyCenter')}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Align Center"
          >
            ⬌
          </button>
          <button
            onClick={() => handleFormatText('justifyRight')}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Align Right"
          >
            ➡
          </button>
        </div>

        {/* Indentation */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
          <button
            onClick={() => handleFormatText('outdent')}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Decrease Indent"
          >
            ⬅ Outdent
          </button>
          <button
            onClick={() => handleFormatText('indent')}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Increase Indent"
          >
            ➡ Indent
          </button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
          <button
            onClick={() => handleFormatText('foreColor', '#e74c3c')}
            className="w-6 h-6 bg-red-500 rounded hover:scale-110 transition-transform"
            title="Red Text"
          ></button>
          <button
            onClick={() => handleFormatText('foreColor', '#3498db')}
            className="w-6 h-6 bg-blue-500 rounded hover:scale-110 transition-transform"
            title="Blue Text"
          ></button>
          <button
            onClick={() => handleFormatText('foreColor', '#27ae60')}
            className="w-6 h-6 bg-green-500 rounded hover:scale-110 transition-transform"
            title="Green Text"
          ></button>
          <button
            onClick={() => handleFormatText('hiliteColor', '#ffeb3b')}
            className="w-6 h-6 bg-yellow-400 rounded hover:scale-110 transition-transform"
            title="Highlight Yellow"
          ></button>
          <button
            onClick={() => handleFormatText('hiliteColor', '#ff9800')}
            className="w-6 h-6 bg-orange-400 rounded hover:scale-110 transition-transform"
            title="Highlight Orange"
          ></button>
        </div>

        {/* Insert Elements */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleInsert(insertTable)}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Insert Table"
          >
            📊 Table
          </button>
          <button
            onClick={() => handleInsert(insertBlockQuote)}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Block Quote"
          >
            💬 Quote
          </button>
          <button
            onClick={() => handleInsert(insertHorizontalRule)}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Horizontal Line"
          >
            ➖ Line
          </button>
          <button
            onClick={() => handleInsert(insertCodeBlock)}
            className="p-2 hover:bg-gray-100 rounded text-sm"
            title="Code Block"
          >
            &lt;/&gt; Code
          </button>
        </div>
      </div>
      
      {/* Second Row - Symbols */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <span className="text-sm text-gray-500 mr-2">Quick Symbols:</span>
        {['→', '←', '↑', '↓', '✓', '✗', '★', '•', '◆', '▲', '∞', '±', '≈', '≠'].map(symbol => (
          <button
            key={symbol}
            onClick={() => handleInsert(() => insertSymbol(symbol))}
            className="px-2 py-1 hover:bg-gray-100 rounded text-sm"
            title={`Insert ${symbol}`}
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EditorToolbar;
