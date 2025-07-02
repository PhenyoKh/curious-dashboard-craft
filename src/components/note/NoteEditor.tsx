
import React from 'react';

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
  // Handle editor input to prevent formatting persistence
  const handleEditorInput = (e: React.FormEvent) => {
    // Clear any unwanted formatting persistence
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentElement = range.commonAncestorContainer.parentElement;
      
      // If we're at the end of a formatted element and continuing to type,
      // ensure we don't carry over unwanted formatting
      if (parentElement && range.collapsed) {
        const textContent = parentElement.textContent || '';
        const cursorPosition = range.startOffset;
        
        // If we're at the end of a formatted element
        if (cursorPosition === textContent.length) {
          // This helps prevent formatting from persisting on new content
          setTimeout(() => {
            const newSelection = window.getSelection();
            if (newSelection && newSelection.rangeCount > 0) {
              const newRange = newSelection.getRangeAt(0);
              if (newRange.collapsed) {
                // Normalize the selection to prevent formatting carryover
                newRange.collapse(true);
              }
            }
          }, 0);
        }
      }
    }
    
    onContentChange();
  };

  return (
    <div className="pt-44 px-6 py-8">
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
              onFocus={onEditorFocus}
              onBlur={onEditorBlur}
              suppressContentEditableWarning={true}
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
