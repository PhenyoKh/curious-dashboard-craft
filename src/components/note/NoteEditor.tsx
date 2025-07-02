
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
  // Simple input handler - let the browser handle most of the work
  const handleEditorInput = () => {
    onContentChange();
  };

  // Simple paste handler - allow rich text pasting
  const handlePaste = (e: React.ClipboardEvent) => {
    // Let the browser handle pasting naturally
    setTimeout(() => {
      onContentChange();
    }, 0);
  };

  // Simplified key handling - minimal intervention
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Let the browser handle Enter naturally
      setTimeout(() => {
        onContentChange();
      }, 0);
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
              spellCheck={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
