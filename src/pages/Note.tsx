
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { NoteMetadata, Subject } from '@/types/note';
import { calculateWordCount } from '@/utils/noteUtils';
import { formatText, handleSearch } from '@/utils/editorUtils';
import FloatingActionButtons from '@/components/note/FloatingActionButtons';
import NoteTopBar from '@/components/note/NoteTopBar';
import NoteMetadataBar from '@/components/note/NoteMetadataBar';
import NoteFormattingToolbar from '@/components/note/NoteFormattingToolbar';
import NoteEditor from '@/components/note/NoteEditor';

const Note: React.FC = () => {
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

  // Auto-save functionality with smoother transition
  const autoSave = useCallback(() => {
    setIsAutoSaved(false);
    setTimeout(() => {
      setMetadata(prev => ({ ...prev, modifiedAt: new Date() }));
      // Add a slight delay before showing "Saved" to make transition smoother
      setTimeout(() => {
        setIsAutoSaved(true);
      }, 200);
    }, 800);
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

  // Search function
  const handleSearchClick = () => {
    handleSearch(searchTerm, editorRef);
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

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Fixed Header Ribbon */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <NoteTopBar
          title={title}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          wordCount={wordCount}
          isAutoSaved={isAutoSaved}
          editorRef={editorRef}
          onSearch={handleSearchClick}
        />

        <NoteMetadataBar
          title={title}
          metadata={metadata}
          setMetadata={setMetadata}
          subjects={subjects}
        />

        <NoteFormattingToolbar
          onFormatText={handleFormatText}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          wordCount={wordCount}
        />
      </div>

      {/* Main Content - with top margin to account for fixed header */}
      <NoteEditor
        title={title}
        setTitle={setTitle}
        content={content}
        showPlaceholder={showPlaceholder}
        editorRef={editorRef}
        onContentChange={handleContentChange}
        onEditorFocus={handleEditorFocus}
        onEditorBlur={handleEditorBlur}
      />

      {/* Floating Action Buttons */}
      <FloatingActionButtons onContentChange={handleContentChange} />
    </div>
  );
};

export default Note;
