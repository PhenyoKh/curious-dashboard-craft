
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
  // Handle editor input
  const handleEditorInput = (e: React.FormEvent) => {
    // Clean up zero-width spaces that might cause issues
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      const cleanContent = content.replace(/\u200B/g, '');
      if (cleanContent !== content) {
        editorRef.current.innerHTML = cleanContent;
      }
    }
    onContentChange();
  };

  // Handle paste events to normalize formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const clipboardData = e.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    
    // Insert plain text only to maintain consistent formatting
    if (pastedText) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Create a text node with the pasted content
        const textNode = document.createTextNode(pastedText);
        range.insertNode(textNode);
        
        // Move cursor to end of pasted content
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        onContentChange();
      }
    }
  };

  // Initialize editor with proper structure
  const initializeEditor = () => {
    if (editorRef.current && editorRef.current.innerHTML.trim() === '') {
      // Create initial paragraph for proper formatting
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      editorRef.current.appendChild(p);
      
      // Set cursor in the paragraph
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create a new paragraph
        e.preventDefault();
        
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        
        range.insertNode(p);
        range.setStart(p, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        onContentChange();
      }
    }
  };

  // Handle focus
  const handleFocus = () => {
    initializeEditor();
    onEditorFocus();
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
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
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
