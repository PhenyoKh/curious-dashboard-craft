
import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSearch } from '@/hooks/useSearch';
import { useNoteState } from '@/hooks/useNoteState';
import { useNoteEditor } from '@/hooks/useNoteEditor';
import { useHighlightSystem } from '@/hooks/useHighlightSystem';
import { useCardNavigation } from '@/hooks/useCardNavigation';
import FloatingActionButtons from './FloatingActionButtons';
import NoteTopBar from './NoteTopBar';
import NoteMetadataBar from './NoteMetadataBar';
import NoteFormattingToolbar from './NoteFormattingToolbar';
import NoteEditor from './NoteEditor';
import SearchBar from './SearchBar';
import TableStyles from './formatting/TableStyles';
import HighlightsPanel from './highlighting/HighlightsPanel';
import HighlightingNoteEditor from './highlighting/HighlightingNoteEditor';

const NoteContainer: React.FC = () => {
  const [activeFontColor, setActiveFontColor] = useState('#000000');
  
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
    performAutoSave,
    isLoading,
    noteId
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

  // Highlighting system
  const {
    highlights,
    showPanel,
    setShowPanel,
    categories,
    addHighlight,
    removeHighlightsByText,
    updateCommentary,
    toggleExpanded
  } = useHighlightSystem();

  // Card navigation hook
  const { handleScrollToCard, registerScrollToCard } = useCardNavigation();

  // Cleanup auto-save on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-focus editor when page loads
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [editorRef]);

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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TableStyles />
      
      {/* Fixed Header - will not scroll */}
      <div className="flex-shrink-0 bg-white shadow-sm z-50">
        <NoteTopBar
          title={title}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          wordCount={wordCount}
          isAutoSaved={isAutoSaved}
          showHighlightsPanel={showPanel}
          setShowHighlightsPanel={setShowPanel}
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
          onActiveFontColorChange={setActiveFontColor}
          categories={categories}
          addHighlight={addHighlight}
          removeHighlightsByText={removeHighlightsByText}
          onContentChange={handleContentChange}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className={`flex-1 overflow-y-auto ${showPanel ? 'pb-[40vh]' : ''}`}>
        <NoteEditor
          title={title}
          setTitle={setTitle}
          content={content}
          showPlaceholder={showPlaceholder}
          editorRef={editorRef}
          onContentChange={handleContentChange}
          onEditorFocus={handleEditorFocusWithPlaceholder}
          onEditorBlur={handleEditorBlurWithPlaceholder}
          activeFontColor={activeFontColor}
        />
        
        {/* Highlighting functionality */}
        <HighlightingNoteEditor
          editorRef={editorRef}
          categories={categories}
          addHighlight={addHighlight}
          onContentChange={handleContentChange}
          showPanel={showPanel}
          onScrollToCard={handleScrollToCard}
        />
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons onContentChange={handleContentChange} />
      
      {/* Highlights Panel */}
      <HighlightsPanel
        highlights={highlights}
        categories={categories}
        showPanel={showPanel}
        onUpdateCommentary={updateCommentary}
        onToggleExpanded={toggleExpanded}
        onClose={() => setShowPanel(false)}
        registerScrollToCard={registerScrollToCard}
      />
    </div>
  );
};

export default NoteContainer;
