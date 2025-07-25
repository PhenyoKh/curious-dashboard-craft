import React, { useCallback } from 'react';
import TiptapEditor from '../components/note/TiptapEditor';
import { useNoteState } from '../hooks/useNoteState';
import debounce from 'lodash.debounce';

const Note = () => {
  const {
    content,
    updateContent,
    performAutoSave,
    isLoading,
    deleteNote,
    noteId
  } = useNoteState();

  // Debounced autosave function to reduce save frequency
  const debouncedSave = useCallback(
    debounce(() => {
      performAutoSave();
    }, 1000),
    [performAutoSave]
  );

  // Handle content changes from the editor
  const handleContentChange = (updatedContent: string) => {
    updateContent(updatedContent);
    debouncedSave();
  };

  // Handle highlight saves (immediate save for highlights)
  const handleHighlightSave = useCallback(() => {
    performAutoSave();
  }, [performAutoSave]);

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
      />
    </div>
  );
};

export default Note;