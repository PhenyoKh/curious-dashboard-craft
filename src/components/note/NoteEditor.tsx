
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
  // Handle editor input to prevent formatting persistence and handle pasted content
  const handleEditorInput = (e: React.FormEvent) => {
    // Clear any unwanted formatting persistence
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // If we're at the end of a formatted element and continuing to type,
      // ensure we don't carry over unwanted formatting
      if (range.collapsed) {
        const parentElement = range.commonAncestorContainer.parentElement;
        if (parentElement && parentElement !== editorRef.current) {
          const textContent = parentElement.textContent || '';
          const cursorPosition = range.startOffset;
          
          // If we're at the end of a formatted element, break out of it
          if (cursorPosition === textContent.length) {
            const newTextNode = document.createTextNode(' ');
            const parentOfParent = parentElement.parentNode;
            
            if (parentOfParent) {
              parentOfParent.insertBefore(newTextNode, parentElement.nextSibling);
              range.setStartAfter(newTextNode);
              range.setEndAfter(newTextNode);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    }
    
    onContentChange();
  };

  // Handle paste events to normalize formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const clipboardData = e.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    
    if (pastedText) {
      // Insert plain text and apply default formatting
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create a span with default note formatting
        const span = document.createElement('span');
        span.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
        span.style.fontSize = '16px';
        span.style.color = '#000000';
        span.textContent = pastedText;
        
        range.deleteContents();
        range.insertNode(span);
        
        // Move cursor to end of pasted content
        range.setStartAfter(span);
        range.setEndAfter(span);
        selection.removeAllRanges();
        selection.addRange(range);
        
        onContentChange();
      }
    }
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
              onPaste={handlePaste}
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
