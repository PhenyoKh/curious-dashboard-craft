
import { useRef, useCallback } from 'react';
import { formatText } from '@/utils/formatting/textFormatting';

export const useNoteEditor = (onContentChange: () => void) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleContentChange = useCallback(() => {
    onContentChange();
  }, [onContentChange]);

  const handleEditorFocus = useCallback(() => {
    // Focus handling logic can be added here if needed
  }, []);

  const handleEditorBlur = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML.trim();
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
