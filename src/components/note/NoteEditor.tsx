
import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleListEnter } from '@/utils/formatting/listUtils';
import { getCurrentFormattingStyles, setTypingStyle } from '@/utils/formatting/colorFormatting';
import { sanitizeHtml, sanitizeText } from '@/utils/security';
import { useSecureForm } from '@/hooks/useSecureForm';
import { noteSchema } from '@/schemas/validation';
import { useNoteState } from '@/hooks/useNoteState';

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
  const navigate = useNavigate();
  const { deleteNote, noteId } = useNoteState();

  // Add delete handler
  const handleDeleteNote = async () => {
    if (!noteId) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this note?');
    if (confirmed) {
      const success = await deleteNote(noteId);
      if (success) {
        // Redirect to dashboard
        navigate('/');
      }
    }
  };
  // Set initial content when component mounts or content prop changes
  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content;
    }
  }, [content, editorRef]);
  // Secure input handler with sanitization
  const handleEditorInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const content = target.innerHTML;
    
    // Sanitize HTML content to prevent XSS attacks
    const sanitizedContent = sanitizeHtml(content);
    
    // Only update if content changed after sanitization
    if (content !== sanitizedContent) {
      target.innerHTML = sanitizedContent;
      // Move cursor to end after sanitization
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(target);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    onContentChange();
  }, [onContentChange]);

  // Secure paste handler with sanitization
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const target = e.target as HTMLDivElement;
    const clipboardData = e.clipboardData;
    
    // Get pasted content
    const pastedHTML = clipboardData.getData('text/html');
    const pastedText = clipboardData.getData('text/plain');
    
    // Sanitize the pasted content
    const sanitizedContent = pastedHTML ? sanitizeHtml(pastedHTML) : sanitizeText(pastedText);
    
    // Insert sanitized content at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      if (pastedHTML) {
        // Insert as HTML
        const div = document.createElement('div');
        div.innerHTML = sanitizedContent;
        const fragment = document.createDocumentFragment();
        while (div.firstChild) {
          fragment.appendChild(div.firstChild);
        }
        range.insertNode(fragment);
      } else {
        // Insert as plain text
        const textNode = document.createTextNode(sanitizedContent);
        range.insertNode(textNode);
      }
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    setTimeout(() => {
      onContentChange();
    }, 0);
  }, [onContentChange]);

  // Enhanced key handling with list support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent editing of highlight badges
    const target = e.target as HTMLElement;
    if (target.classList.contains('highlight-badge') || 
        target.closest('.highlight-badge')) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();

      // Get current styles via your helper
      const currentStyles = getCurrentFormattingStyles();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);

      // Identify the current block element (e.g., <div> or <p>)
      let currentBlock = range.startContainer.parentElement;
      while (currentBlock && !['DIV', 'P', 'LI'].includes(currentBlock.tagName)) {
        currentBlock = currentBlock.parentElement;
      }
      if (!currentBlock || !currentBlock.parentNode) return;

      // Create a new block element for the new line
      const newBlock = document.createElement(currentBlock.tagName);

      // Inside new block, create a span with captured styles and zero-width space
      if (Object.keys(currentStyles).length > 0) {
        const styledSpan = document.createElement('span');
        for (const [prop, val] of Object.entries(currentStyles)) {
          styledSpan.style.setProperty(prop, val);
        }
        styledSpan.appendChild(document.createTextNode('\u200b'));
        newBlock.appendChild(styledSpan);
      } else {
        newBlock.appendChild(document.createTextNode('\u200b'));
      }

      // Insert new block right after current block
      currentBlock.parentNode.insertBefore(newBlock, currentBlock.nextSibling);

      // Move cursor to inside the styled span (or text node) in new block
      const newRange = document.createRange();
      if (newBlock.firstChild instanceof HTMLElement) {
        newRange.setStart(newBlock.firstChild.firstChild!, 1);
      } else {
        newRange.setStart(newBlock.firstChild!, 1);
      }
      newRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(newRange);

      // Trigger content change
      setTimeout(() => {
        onContentChange();
      }, 0);
      return;
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

  // Prevent mouse events on highlight badges
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('highlight-badge') || 
        target.closest('.highlight-badge')) {
      e.preventDefault();
    }
  };

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with title and delete button */}
        <div className="flex justify-between items-start mb-8">
          {/* Large Note Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(sanitizeText(e.target.value))}
            placeholder="Untitled Note"
            className="flex-1 text-4xl font-bold border-none outline-none bg-transparent text-gray-900 placeholder-gray-400"
          />
          
          {/* Delete Button - only show if we have a noteId */}
          {noteId && (
            <button 
              onClick={handleDeleteNote}
              className="ml-4 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              title="Delete this note"
            >
              🗑️ Delete Note
            </button>
          )}
        </div>
        
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
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                color: activeFontColor
              }}
              onInput={handleEditorInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              onMouseDown={handleMouseDown}
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
