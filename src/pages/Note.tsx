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

  if (isLoading) {
    return <div>Loading note...</div>;
  }

  return (
    <div>
      <TiptapEditor 
        initialContent={content} 
        onContentChange={handleContentChange}
        onSave={handleHighlightSave}
      />
    </div>
  );
};

export default Note;
