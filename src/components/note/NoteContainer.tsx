
import React, { useEffect } from 'react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSearch } from '@/hooks/useSearch';
import { useNoteState } from '@/hooks/useNoteState';
import { useNoteEditor } from '@/hooks/useNoteEditor';
import FloatingActionButtons from './FloatingActionButtons';
import NoteTopBar from './NoteTopBar';
import NoteMetadataBar from './NoteMetadataBar';
import NoteFormattingToolbar from './NoteFormattingToolbar';
import NoteEditor from './NoteEditor';
import SearchBar from './SearchBar';
import TableStyles from './formatting/TableStyles';

const NoteContainer: React.FC = () => {
  const {
    title,
    setTitle,
    content,
    metadata,
    setMetadata,
    isAutoSaved,
    showSearch,
    setShowSearch,
    wordCount,
    showPlaceholder,
    setShowPlaceholder,
    subjects,
    updateContent,
    performAutoSave
  } = useNoteState();

  const { debouncedSave, cleanup } = useAutoSave({ 
    onSave: performAutoSave, 
    delay: 800 
  });

  const {
    editorRef,
    handleContentChange,
    handleEditorFocus,
    handleEditorBlur,
    handleFormatText
  } = useNoteEditor(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      updateContent(newContent);
      debouncedSave();
    }
  });

  const {
    performSearch,
    clearHighlights,
    nextResult,
    previousResult,
    currentResultIndex,
    totalResults,
    hasResults
  } = useSearch({ editorRef });

  // Cleanup auto-save on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-focus editor when page loads
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  // Handle focus to hide placeholder
  const handleEditorFocusWithPlaceholder = () => {
    if (editorRef.current && showPlaceholder) {
      setShowPlaceholder(false);
    }
    handleEditorFocus();
  };

  // Handle blur to show placeholder if empty
  const handleEditorBlurWithPlaceholder = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML.trim();
      if (content === '' || content === '<br>') {
        setShowPlaceholder(true);
      }
    }
    handleEditorBlur();
  };

  // Search handlers
  const handleSearchClose = () => {
    setShowSearch(false);
    clearHighlights();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'f':
            e.preventDefault();
            setShowSearch(true);
            break;
          case 's':
            e.preventDefault();
            debouncedSave();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [debouncedSave, setShowSearch]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <TableStyles />
      
      {/* Fixed Header Ribbon - positioned absolutely to stay at top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <NoteTopBar
          title={title}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          wordCount={wordCount}
          isAutoSaved={isAutoSaved}
        />

        <SearchBar
          show={showSearch}
          onClose={handleSearchClose}
          onSearch={performSearch}
          onNext={nextResult}
          onPrevious={previousResult}
          onClear={clearHighlights}
          currentResult={currentResultIndex}
          totalResults={totalResults}
          hasResults={hasResults}
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

      {/* Main Content - with top padding to account for fixed header height */}
      <div className="pt-56">
        <NoteEditor
          title={title}
          setTitle={setTitle}
          content={content}
          showPlaceholder={showPlaceholder}
          editorRef={editorRef}
          onContentChange={handleContentChange}
          onEditorFocus={handleEditorFocusWithPlaceholder}
          onEditorBlur={handleEditorBlurWithPlaceholder}
        />
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons onContentChange={handleContentChange} />
    </div>
  );
};

export default NoteContainer;
