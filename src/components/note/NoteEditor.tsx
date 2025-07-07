
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
  activeFontColor?: string;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  title,
  setTitle,
  showPlaceholder,
  editorRef,
  onContentChange,
  onEditorFocus,
  onEditorBlur,
  activeFontColor = '#000000'
}) => {
  // Enhanced input handler that applies active font color to new text
  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0 && activeFontColor !== '#000000') {
      const range = selection.getRangeAt(0);
      
      // If we're typing and have an active color, wrap new text in a span
      if (range.collapsed) {
        // Create a colored span for new text
        const span = document.createElement('span');
        span.style.color = activeFontColor;
        
        try {
          range.insertNode(span);
          // Move cursor inside the span
          range.setStart(span, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (error) {
          console.log('Error applying color to new text:', error);
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
      
      // Normal enter behavior
      setTimeout(() => {
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
