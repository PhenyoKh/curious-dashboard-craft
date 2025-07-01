
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NoteMetadata, Subject } from '@/types/note';
import { calculateWordCount, exportAsPDF, exportAsText } from '@/utils/noteUtils';
import { formatText, handleSearch } from '@/utils/editorUtils';
import NoteHeader from '@/components/note/NoteHeader';
import EditorToolbar from '@/components/note/EditorToolbar';
import FloatingActionButtons from '@/components/note/FloatingActionButtons';

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
                onClick={() => exportAsText(title, editorRef.current?.innerText || '')}
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
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm, editorRef)}
            />
            <button
              onClick={() => handleSearch(searchTerm, editorRef)}
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
        <NoteHeader
          title={title}
          setTitle={setTitle}
          metadata={metadata}
          setMetadata={setMetadata}
          subjects={subjects}
        />

        {/* Editor */}
        <div className="bg-white rounded-xl border border-gray-200 min-h-[600px]">
          {/* Toolbar */}
          <EditorToolbar onContentChange={handleContentChange} editorRef={editorRef} />

          {/* Editor Content */}
          <div className="relative">
            {showPlaceholder && (
              <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
                Start typing your notes here...
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              className="p-6 min-h-[500px] text-base leading-relaxed outline-none"
              style={{ lineHeight: '1.7' }}
              onInput={handleContentChange}
              onFocus={handleEditorFocus}
              onBlur={handleEditorBlur}
              suppressContentEditableWarning={true}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons onContentChange={handleContentChange} />
    </div>
  );
};

export default Note;
