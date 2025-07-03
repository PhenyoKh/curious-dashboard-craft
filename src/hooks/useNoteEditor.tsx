
import { useRef, useCallback } from 'react';
import { formatText } from '@/utils/formatting/textFormatting';
import { selectionCache } from '@/utils/formatting/selectionCache';

export const useNoteEditor = (onContentChange: () => void) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleContentChange = useCallback(() => {
    // Invalidate cache when content changes
    selectionCache.invalidate();
    onContentChange();
  }, [onContentChange]);

  const handleEditorFocus = useCallback(() => {
    // Focus handling logic can be added here if needed
  }, []);

  const handleEditorBlur = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML.trim();
      // Invalidate cache when editor loses focus
      selectionCache.invalidate();
      // Additional blur logic can be handled by parent component
    }
  }, []);

  const handleFormatText = useCallback((command: string, value?: string) => {
    formatText(command, value);
    editorRef.current?.focus();
    handleContentChange();
  }, [handleContentChange]);

  return {
    editorRef,
    handleContentChange,
    handleEditorFocus,
    handleEditorBlur,
    handleFormatText
  };
};
