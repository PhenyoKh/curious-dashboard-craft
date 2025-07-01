
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NoteMetadata, Subject } from '@/types/note';
import { calculateWordCount, exportAsPDF, exportAsText } from '@/utils/noteUtils';
import { formatText, handleSearch } from '@/utils/editorUtils';
import EditorToolbar from '@/components/note/EditorToolbar';
import FloatingActionButtons from '@/components/note/FloatingActionButtons';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, FileText, Download, Maximize, Image, Link, Table } from 'lucide-react';

const Note: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Get initial data from navigation state
  const initialNoteData = location.state as { subject: string; date: Date; title: string } | null;
  
  const [title, setTitle] = useState<string>(initialNoteData?.title || '');
  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<NoteMetadata>({
    subject: initialNoteData?.subject || '',
    createdAt: initialNoteData?.date || new Date(),
    modifiedAt: new Date()
  });
  const [isAutoSaved, setIsAutoSaved] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [showPlaceholder, setShowPlaceholder] = useState<boolean>(true);
  
  const subjects: Subject[] = [
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

  // Handle content changes
  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      setWordCount(calculateWordCount(newContent));
      setShowPlaceholder(newContent.trim() === '' || newContent === '<br>');
      autoSave();
    }
  };

  // Handle focus to hide placeholder
  const handleEditorFocus = () => {
    if (editorRef.current && showPlaceholder) {
      setShowPlaceholder(false);
    }
  };

  // Handle blur to show placeholder if empty
  const handleEditorBlur = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML.trim();
      if (content === '' || content === '<br>') {
        setShowPlaceholder(true);
      }
    }
  };

  // Formatting functions
  const handleFormatText = (command: string, value?: string) => {
    formatText(command, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'b':
            e.preventDefault();
            handleFormatText('bold');
            break;
          case 'i':
            e.preventDefault();
            handleFormatText('italic');
            break;
          case 'u':
            e.preventDefault();
            handleFormatText('underline');
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Fixed Header Ribbon */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
        {/* Top Navigation Bar */}
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
              <h1 className="text-xl font-semibold text-gray-900">StudyFlow</h1>
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
              
              {/* Word Count */}
              <span className="text-sm text-gray-600 font-medium">
                {wordCount} words
              </span>
              
              {/* Auto-save Indicator */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isAutoSaved ? 'bg-green-500' : 'bg-yellow-500'} ${!isAutoSaved ? 'animate-pulse' : ''}`}></div>
                <span className={`font-medium ${isAutoSaved ? 'text-green-600' : 'text-yellow-600'}`}>
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
                  onClick={() => exportAsText(title, editorRef.current?.innerText || '')}
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
          
          {/* Search Bar */}
          {showSearch && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search in document..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm, editorRef)}
              />
              <Button
                onClick={() => handleSearch(searchTerm, editorRef)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                Find
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSearch(false)}
                className="text-sm"
              >
                ✕
              </Button>
            </div>
          )}
        </div>

        {/* Metadata Row */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mini Title */}
              <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                {title || 'Untitled Note'}
              </div>
              
              {/* Subject Dropdown */}
              <select
                value={metadata.subject}
                onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
                className="text-sm bg-white border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {subjects.map(subject => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Timestamps */}
            <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500">
              <span>Created: {formatDate(metadata.createdAt)}</span>
              <span>Modified: {formatDate(metadata.modifiedAt)}</span>
            </div>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="px-6 py-3 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {/* Group 1: Text Formatting */}
            <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
              <button
                onClick={() => handleFormatText('bold')}
                className="p-2 hover:bg-gray-100 rounded text-sm font-bold transition-colors"
                title="Bold (Ctrl+B)"
              >
                B
              </button>
              <button
                onClick={() => handleFormatText('italic')}
                className="p-2 hover:bg-gray-100 rounded text-sm italic transition-colors"
                title="Italic (Ctrl+I)"
              >
                I
              </button>
              <button
                onClick={() => handleFormatText('underline')}
                className="p-2 hover:bg-gray-100 rounded text-sm underline transition-colors"
                title="Underline (Ctrl+U)"
              >
                U
              </button>
              <button
                onClick={() => handleFormatText('strikeThrough')}
                className="p-2 hover:bg-gray-100 rounded text-sm line-through transition-colors"
                title="Strikethrough"
              >
                S
              </button>
            </div>

            {/* Group 2: Headings */}
            <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
              <button
                onClick={() => handleFormatText('formatBlock', 'h1')}
                className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
              >
                H1
              </button>
              <button
                onClick={() => handleFormatText('formatBlock', 'h2')}
                className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
              >
                H2
              </button>
              <button
                onClick={() => handleFormatText('formatBlock', 'h3')}
                className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
              >
                H3
              </button>
            </div>

            {/* Group 3: Lists */}
            <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
              <button
                onClick={() => handleFormatText('insertUnorderedList')}
                className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                title="Bullet List"
              >
                • List
              </button>
              <button
                onClick={() => handleFormatText('insertOrderedList')}
                className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                title="Numbered List"
              >
                1. List
              </button>
              <button
                onClick={() => handleFormatText('insertHTML', '<input type="checkbox"> ')}
                className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                title="Checklist"
              >
                ☑ Todo
              </button>
            </div>

            {/* Group 4: Alignment */}
            <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
              <button
                onClick={() => handleFormatText('justifyLeft')}
                className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                title="Align Left"
              >
                ⬅
              </button>
              <button
                onClick={() => handleFormatText('justifyCenter')}
                className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                title="Align Center"
              >
                ⬌
              </button>
              <button
                onClick={() => handleFormatText('justifyRight')}
                className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                title="Align Right"
              >
                ➡
              </button>
            </div>

            {/* Group 5: Colors */}
            <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
              <button
                onClick={() => handleFormatText('foreColor', '#e74c3c')}
                className="w-6 h-6 bg-red-500 rounded-full hover:scale-110 transition-transform"
                title="Red Text"
              ></button>
              <button
                onClick={() => handleFormatText('foreColor', '#3498db')}
                className="w-6 h-6 bg-blue-500 rounded-full hover:scale-110 transition-transform"
                title="Blue Text"
              ></button>
              <button
                onClick={() => handleFormatText('foreColor', '#27ae60')}
                className="w-6 h-6 bg-green-500 rounded-full hover:scale-110 transition-transform"
                title="Green Text"
              ></button>
              <button
                onClick={() => handleFormatText('hiliteColor', '#ffeb3b')}
                className="w-6 h-6 bg-yellow-400 rounded-full hover:scale-110 transition-transform"
                title="Highlight Yellow"
              ></button>
            </div>

            {/* Group 6: Insert Elements */}
            <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
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

            {/* Group 7: View Options */}
            <div className="flex items-center gap-1">
              <button
                className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                title="Full Screen"
              >
                <Maximize className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - with top margin to account for fixed header */}
      <div className="pt-44 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Large Note Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="w-full text-4xl font-bold border-none outline-none bg-transparent text-gray-900 placeholder-gray-400 mb-8"
          />
          
          {/* Rich Text Editor */}
          <div className="bg-white rounded-lg border border-gray-200 min-h-[600px] shadow-sm">
            <div className="relative">
              {showPlaceholder && (
                <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
                  Start typing your notes here...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                className="p-6 min-h-[600px] text-base leading-relaxed outline-none"
                style={{ lineHeight: '1.7' }}
                onInput={handleContentChange}
                onFocus={handleEditorFocus}
                onBlur={handleEditorBlur}
                suppressContentEditableWarning={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons onContentChange={handleContentChange} />
    </div>
  );
};

export default Note;
