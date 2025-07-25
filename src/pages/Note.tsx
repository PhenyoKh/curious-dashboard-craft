import React, { useCallback } from 'react';
import TiptapEditor from '../components/note/TiptapEditor';
import { useNoteState } from '../hooks/useNoteState';
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
      />
    </div>
  );
};

export default Note;