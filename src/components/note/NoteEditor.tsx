
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
    onContentChange();
  };

  // Handle paste events to preserve formatting while normalizing structure
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const clipboardData = e.clipboardData;
    const pastedHTML = clipboardData.getData('text/html');
    const pastedText = clipboardData.getData('text/plain');
    
    if (pastedHTML) {
      // Try to preserve some formatting from HTML
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create a temporary div to clean the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = pastedHTML;
        
        // Clean unwanted elements but preserve basic formatting
        const cleanHTML = tempDiv.innerHTML
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/style="[^"]*"/gi, '') // Remove inline styles except colors
          .replace(/<(span|div|p)[^>]*>/gi, '<span>')
          .replace(/<\/(span|div|p)>/gi, '</span>');
        
        range.deleteContents();
        
        // Insert the cleaned HTML
        const fragment = range.createContextualFragment(cleanHTML);
        range.insertNode(fragment);
        
        // Move cursor to end of pasted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        onContentChange();
      }
    } else if (pastedText) {
      // Insert plain text with basic formatting
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(pastedText));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        onContentChange();
      }
    }
  };

  // Handle key events to prevent unwanted behavior
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent issues with Enter key in certain formatted contexts
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.parentElement;
        
        // If we're in a heavily formatted element, break out cleanly
        if (parentElement && parentElement !== editorRef.current) {
          const tagName = parentElement.tagName.toLowerCase();
          if (['h1', 'h2', 'h3'].includes(tagName)) {
            e.preventDefault();
            
            // Create a new paragraph after the heading
            const br = document.createElement('br');
            const p = document.createElement('p');
            p.appendChild(br);
            
            range.insertNode(p);
            range.setStart(p, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            onContentChange();
          }
        }
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
              onKeyDown={handleKeyDown}
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
