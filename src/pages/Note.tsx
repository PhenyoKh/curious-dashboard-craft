import React, { useCallback, useState } from 'react';
import TiptapEditor from '../components/note/TiptapEditor';
import { useNoteState } from '../hooks/useNoteState';
import { Highlight } from '@/types/highlight';
import debounce from 'lodash.debounce';

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
    noteId
  } = useNoteState();

  // Track current highlights
  const [currentHighlights, setCurrentHighlights] = useState<Highlight[]>([]);

  // Debounced autosave function to reduce save frequency
  const debouncedSave = useCallback(
    debounce(() => {
      performAutoSave(currentHighlights);
    }, 1000),
    [performAutoSave, currentHighlights]
  );

  // Handle content changes from the editor
  const handleContentChange = (updatedContent: string) => {
    updateContent(updatedContent);
    debouncedSave();
  };

  // Handle highlight saves (immediate save for highlights)
  const handleHighlightSave = useCallback(() => {
    performAutoSave(currentHighlights);
  }, [performAutoSave, currentHighlights]);

  // Handle highlights changes from the editor
  const handleHighlightsChange = useCallback((highlights: Highlight[]) => {
    setCurrentHighlights(highlights);
  }, []);

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

  // Handle note deletion
  const handleDeleteNote = useCallback(async () => {
    if (noteId && window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(noteId);
    }
  }, [deleteNote, noteId]);

  if (isLoading) {
    return <div>Loading note...</div>;
  }

  return (
    <div>
      <TiptapEditor
        initialContent={content}
        onContentChange={handleContentChange}
        onSave={handleHighlightSave}
        onDelete={handleDeleteNote}
        initialTitle={title}
        initialSubject={metadata.subject} // Pass the subject ID, not label
        onTitleChange={handleTitleChange}
        onSubjectChange={handleSubjectChange}
        onHighlightsChange={handleHighlightsChange}
        noteId={noteId}
      />
    </div>
  );
};

export default Note;