import React, { useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import TiptapEditor from '../components/note/TiptapEditor';
import { useNoteState } from '../hooks/useNoteState';
import debounce from 'lodash.debounce';
import { logger } from '@/utils/logger';
import { Highlight } from '@/types/highlight';

const Note = () => {
  const {
    title,
    setTitle,
    content,
    metadata,
    setMetadata,
    subjects,
    updateContent,
    performAutoSave,
    isLoading,
    deleteNote,
    noteId,
    highlightsSidecar,
    updateHighlightsFromEditor,
  } = useNoteState();

  // Debounced autosave function for academic note-taking reliability
  // Optimized to 150ms for immediate persistence expectations
  const debouncedSave = useCallback(() => {
    const debouncedFn = debounce(() => {
      performAutoSave();
    }, 150);
    return debouncedFn();
  }, [performAutoSave]);

  // Handle content changes from the editor
  const handleContentChange = (updatedContent: string) => {
    updateContent(updatedContent);
    debouncedSave();
  };

  // Handle title changes
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    debouncedSave();
  }, [setTitle, debouncedSave]);

  // Handle subject changes  
  const handleSubjectChange = useCallback((newSubjectId: string) => {
    setMetadata(prev => ({ ...prev, subject: newSubjectId }));
    debouncedSave();
  }, [setMetadata, debouncedSave]);

  // Handle highlight changes: update sidecar and trigger autosave
  const handleHighlightsChange = useCallback((highlights: Highlight[]) => {
    logger.log('🔄 Highlights changed, updating sidecar and triggering save');
    updateHighlightsFromEditor(highlights);
  }, [updateHighlightsFromEditor]);

  // Handle note deletion
  const handleDeleteNote = useCallback(async () => {
    if (noteId && window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(noteId);
    }
  }, [deleteNote, noteId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your note...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TiptapEditor
        initialContent={content}
        onContentChange={handleContentChange}
        onSave={debouncedSave}
        onDelete={handleDeleteNote}
        initialTitle={title}
        initialSubject={metadata.subject} // Pass the subject ID, not label
        onTitleChange={handleTitleChange}
        onSubjectChange={handleSubjectChange}
        onHighlightsChange={handleHighlightsChange}
        noteId={noteId}
        savedHighlightsSidecar={highlightsSidecar}
      />
    </div>
  );
};

export default Note;