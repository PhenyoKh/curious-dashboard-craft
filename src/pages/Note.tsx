
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface NoteMetadata {
  subject: string;
  createdAt: Date;
  modifiedAt: Date;
}

const Note: React.FC = () => {
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<NoteMetadata>({
    subject: '',
    createdAt: new Date(),
    modifiedAt: new Date()
  });
  const [isAutoSaved, setIsAutoSaved] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  
  const subjects = [
    { value: '', label: 'Select subject' },
    { value: 'cs301', label: 'Computer Science 301' },
    { value: 'bio101', label: 'Biology 101' },
    { value: 'stats301', label: 'Statistics 301' },
    { value: 'psych201', label: 'Psychology 201' },
    { value: 'chem200', label: 'Chemistry 200' }
  ];

  // Auto-save functionality
  const autoSave = useCallback(() => {
    setIsAutoSaved(false);
    setTimeout(() => {
      setMetadata(prev => ({ ...prev, modifiedAt: new Date() }));
      setIsAutoSaved(true);
    }, 1000);
  }, []);

  // Word count calculation
  const calculateWordCount = useCallback((text: string) => {
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    const words = plainText.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, []);

  // Handle content changes
  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      calculateWordCount(newContent);
      autoSave();
    }
  };

  // Formatting functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  // Insert functions
  const insertCheckbox = () => {
    const checkbox = '<div contenteditable="false" style="display: inline-flex; align-items: center; margin: 4px 0;"><input type="checkbox" style="margin-right: 8px;"><span contenteditable="true">Task item</span></div><br>';
    document.execCommand('insertHTML', false, checkbox);
    handleContentChange();
  };

  const insertTable = () => {
    const table = `
      <table style="border-collapse: collapse; margin: 10px 0; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #dee2e6; background: #f8f9fa;">Header 1</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; background: #f8f9fa;">Header 2</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #dee2e6;">Cell 1</td>
          <td style="padding: 8px; border: 1px solid #dee2e6;">Cell 2</td>
        </tr>
      </table>
    `;
    document.execCommand('insertHTML', false, table);
    handleContentChange();
  };

  const insertHorizontalRule = () => {
    const hr = '<hr style="margin: 16px 0; border: none; border-top: 2px solid #dee2e6;">';
    document.execCommand('insertHTML', false, hr);
    handleContentChange();
  };

  const insertBlockQuote = () => {
    const quote = '<blockquote style="border-left: 4px solid #4f7cff; padding-left: 16px; margin: 16px 0; color: #6c757d; font-style: italic;">Quote text here</blockquote>';
    document.execCommand('insertHTML', false, quote);
    handleContentChange();
  };

  const insertCodeBlock = () => {
    const code = '<pre style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; overflow-x: auto; margin: 10px 0; border: 1px solid #dee2e6;"><code>// Your code here</code></pre>';
    document.execCommand('insertHTML', false, code);
    handleContentChange();
  };

  const insertSymbol = (symbol: string) => {
    document.execCommand('insertText', false, symbol);
    handleContentChange();
  };

  // Search functionality
  const handleSearch = () => {
    if (!searchTerm || !editorRef.current) return;
    
    const selection = window.getSelection();
    const range = document.createRange();
    
    if (selection) {
      selection.removeAllRanges();
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();
        const index = text.indexOf(searchLower);
        
        if (index !== -1) {
          range.setStart(node, index);
          range.setEnd(node, index + searchTerm.length);
          selection.addRange(range);
          break;
        }
      }
    }
  };

  // Export functionality
  const exportAsPDF = () => {
    window.print();
  };

  const exportAsText = () => {
    const plainText = editorRef.current?.innerText || '';
    const blob = new Blob([`${title}\n\n${plainText}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'b':
            e.preventDefault();
            formatText('bold');
            break;
          case 'i':
            e.preventDefault();
            formatText('italic');
            break;
          case 'u':
            e.preventDefault();
            formatText('underline');
            break;
          case 'f':
            e.preventDefault();
            setShowSearch(true);
            break;
          case 's':
            e.preventDefault();
            autoSave();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [autoSave]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-gray-900">StudyFlow</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              🔍 Search
            </button>
            
            {/* Word Count */}
            <span className="text-sm text-gray-500">
              {wordCount} words
            </span>
            
            {/* Auto-save Indicator */}
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className={`w-2 h-2 rounded-full ${isAutoSaved ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
              <span>{isAutoSaved ? 'Saved' : 'Saving...'}</span>
            </div>
            
            {/* Export Options */}
            <div className="flex gap-2">
              <button
                onClick={exportAsPDF}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                📄 PDF
              </button>
              <button
                onClick={exportAsText}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                📝 Text
              </button>
            </div>
            
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              💾 Save
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in document..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Find
            </button>
            <button
              onClick={() => setShowSearch(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Note Header */}
        <div className="bg-white rounded-xl p-6 mb-5 border border-gray-200">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="w-full text-3xl font-semibold border-none outline-none bg-transparent text-gray-900 placeholder-gray-400 mb-4"
          />
          
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Subject:</span>
              <select
                value={metadata.subject}
                onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
                className="bg-gray-100 border-none px-3 py-1 rounded-full text-gray-700 cursor-pointer"
              >
                {subjects.map(subject => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Created:</span>
              <span className="text-gray-600">{formatDate(metadata.createdAt)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Modified:</span>
              <span className="text-gray-600">{formatDate(metadata.modifiedAt)}</span>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-xl border border-gray-200 min-h-[600px]">
          {/* Toolbar */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Text Formatting */}
              <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                <button
                  onClick={() => formatText('bold')}
                  className="p-2 hover:bg-gray-100 rounded text-sm font-bold"
                  title="Bold (Ctrl+B)"
                >
                  B
                </button>
                <button
                  onClick={() => formatText('italic')}
                  className="p-2 hover:bg-gray-100 rounded text-sm italic"
                  title="Italic (Ctrl+I)"
                >
                  I
                </button>
                <button
                  onClick={() => formatText('underline')}
                  className="p-2 hover:bg-gray-100 rounded text-sm underline"
                  title="Underline (Ctrl+U)"
                >
                  U
                </button>
                <button
                  onClick={() => formatText('strikeThrough')}
                  className="p-2 hover:bg-gray-100 rounded text-sm line-through"
                  title="Strikethrough"
                >
                  S
                </button>
              </div>

              {/* Headings */}
              <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                <button
                  onClick={() => formatText('formatBlock', 'h1')}
                  className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold"
                >
                  H1
                </button>
                <button
                  onClick={() => formatText('formatBlock', 'h2')}
                  className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold"
                >
                  H2
                </button>
                <button
                  onClick={() => formatText('formatBlock', 'h3')}
                  className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold"
                >
                  H3
                </button>
              </div>

              {/* Lists */}
              <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                <button
                  onClick={() => formatText('insertUnorderedList')}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Bullet List"
                >
                  • List
                </button>
                <button
                  onClick={() => formatText('insertOrderedList')}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Numbered List"
                >
                  1. List
                </button>
                <button
                  onClick={insertCheckbox}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Checklist"
                >
                  ☑ Todo
                </button>
              </div>

              {/* Alignment */}
              <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                <button
                  onClick={() => formatText('justifyLeft')}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Align Left"
                >
                  ⬅
                </button>
                <button
                  onClick={() => formatText('justifyCenter')}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Align Center"
                >
                  ⬌
                </button>
                <button
                  onClick={() => formatText('justifyRight')}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Align Right"
                >
                  ➡
                </button>
              </div>

              {/* Indentation */}
              <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                <button
                  onClick={() => formatText('outdent')}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Decrease Indent"
                >
                  ⬅ Outdent
                </button>
                <button
                  onClick={() => formatText('indent')}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Increase Indent"
                >
                  ➡ Indent
                </button>
              </div>

              {/* Colors */}
              <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                <button
                  onClick={() => formatText('foreColor', '#e74c3c')}
                  className="w-6 h-6 bg-red-500 rounded hover:scale-110 transition-transform"
                  title="Red Text"
                ></button>
                <button
                  onClick={() => formatText('foreColor', '#3498db')}
                  className="w-6 h-6 bg-blue-500 rounded hover:scale-110 transition-transform"
                  title="Blue Text"
                ></button>
                <button
                  onClick={() => formatText('foreColor', '#27ae60')}
                  className="w-6 h-6 bg-green-500 rounded hover:scale-110 transition-transform"
                  title="Green Text"
                ></button>
                <button
                  onClick={() => formatText('hiliteColor', '#ffeb3b')}
                  className="w-6 h-6 bg-yellow-400 rounded hover:scale-110 transition-transform"
                  title="Highlight Yellow"
                ></button>
                <button
                  onClick={() => formatText('hiliteColor', '#ff9800')}
                  className="w-6 h-6 bg-orange-400 rounded hover:scale-110 transition-transform"
                  title="Highlight Orange"
                ></button>
              </div>

              {/* Insert Elements */}
              <div className="flex items-center gap-1">
                <button
                  onClick={insertTable}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Insert Table"
                >
                  📊 Table
                </button>
                <button
                  onClick={insertBlockQuote}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Block Quote"
                >
                  💬 Quote
                </button>
                <button
                  onClick={insertHorizontalRule}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                  title="Horizontal Line"
                >
                  ➖ Line
                </button>
                <button
                  onClick={insertCodeBlock}
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
                  onClick={() => insertSymbol(symbol)}
                  className="px-2 py-1 hover:bg-gray-100 rounded text-sm"
                  title={`Insert ${symbol}`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Editor Content */}
          <div
            ref={editorRef}
            contentEditable
            className="p-6 min-h-[500px] text-base leading-relaxed outline-none"
            style={{ lineHeight: '1.7' }}
            onInput={handleContentChange}
            placeholder="Start typing your notes here..."
            suppressContentEditableWarning={true}
          />
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <button
          onClick={() => formatText('undo')}
          className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all flex items-center justify-center"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={() => formatText('redo')}
          className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all flex items-center justify-center"
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
      </div>
    </div>
  );
};

export default Note;
