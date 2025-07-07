
import React from 'react';
import { handleListEnter } from '@/utils/formatting/listUtils';

interface NoteEditorProps {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  showPlaceholder: boolean;
  editorRef: React.RefObject<HTMLDivElement>;
  onContentChange: () => void;
  onEditorFocus: () => void;
  onEditorBlur: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  title,
  setTitle,
  showPlaceholder,
  editorRef,
  onContentChange,
  onEditorFocus,
  onEditorBlur
}) => {
  // Enhanced input handler
  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    
    // Maintain color formatting for new text
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const currentNode = range.startContainer;
      
      // If we're at the end of a colored span, create a new colored span for new text
      if (currentNode.parentElement && currentNode.parentElement.style.color) {
        const color = currentNode.parentElement.style.color;
        if (color && color !== 'rgb(0, 0, 0)' && color !== '#000000') {
          // Apply the same color to the editor for continued typing
          target.style.color = color;
        }
      }
    }
    
    onContentChange();
  };

  // Enhanced paste handler - allow rich text pasting
  const handlePaste = (e: React.ClipboardEvent) => {
    // Let the browser handle pasting naturally
    setTimeout(() => {
      onContentChange();
    }, 0);
  };

  // Enhanced key handling with list support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Check if we're in a list and handle accordingly
      if (handleListEnter(e.nativeEvent)) {
        // List enter was handled, trigger content change
        setTimeout(() => {
          onContentChange();
        }, 0);
        return;
      }
      
      // Normal enter behavior - reset color after line break
      const editor = e.currentTarget as HTMLElement;
      setTimeout(() => {
        // Reset editor color after enter
        if (editor.style.color) {
          const activeColor = editor.style.color;
          editor.style.color = '';
          // Reapply color after a brief delay to ensure new line gets the color
          setTimeout(() => {
            editor.style.color = activeColor;
          }, 10);
        }
        onContentChange();
      }, 0);
    }
    
    // Handle keyboard shortcuts for lists
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key) {
        case '7':
          e.preventDefault();
          // Trigger numbered list - this will be handled by the formatting system
          break;
        case '8':
          e.preventDefault();
          // Trigger bullet list - this will be handled by the formatting system
          break;
        case '9':
          e.preventDefault();
          // Trigger todo list - this will be handled by the formatting system
          break;
      }
    }
  };

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Large Note Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Note"
          className="w-full text-4xl font-bold border-none outline-none bg-transparent text-gray-900 placeholder-gray-400 mb-8"
        />
        
        {/* Rich Text Editor */}
        <div className="bg-white rounded-lg border border-gray-200 min-h-[600px] shadow-sm">
          <div className="relative">
            {showPlaceholder && (
              <div className="absolute top-6 left-6 text-gray-400 pointer-events-none">
                Start typing your notes here...
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              className="p-6 min-h-[600px] text-base leading-relaxed outline-none"
              style={{ 
                lineHeight: '1.7',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
              }}
              onInput={handleEditorInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              onFocus={onEditorFocus}
              onBlur={onEditorBlur}
              suppressContentEditableWarning={true}
              spellCheck={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
