import React, { useEffect, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import { NumberedHighlight } from '../../extensions/NumberedHighlight';
import { useTiptapHighlights } from '../../hooks/useTiptapHighlights';
import { useHighlightRestoration } from '../../hooks/useHighlightRestoration';
import TiptapToolbar from './TiptapToolbar';
import HighlightsPanel from './highlighting/HighlightsPanel';
import './TiptapEditor.css';

interface TiptapEditorProps {
  initialContent: string | null;
  onContentChange: (content: string) => void;
  onSave?: () => void;
  onDelete?: () => void;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  initialContent, 
  onContentChange, 
  onSave,
  onDelete
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        strike: false, // Disable StarterKit's strike since we want to keep it
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      TextStyle,
      Color,
      Highlight,
      Underline,
      NumberedHighlight,
    ],
    content: initialContent || '',
    editorProps: {
      handleKeyDown(view, event) {
        if (event.key === 'Enter') {
          return false;
        }
        return false;
      },
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[800px] px-16 py-12 tiptap-editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
  });

  const {
    highlights,
    setHighlights,
    showPanel,
    setShowPanel,
    categories,
    showHighlightMenu,
    updateCommentary,
    toggleExpanded,
    updateCategoryCounters
  } = useTiptapHighlights(editor, onSave);

  // Restore highlights from saved HTML when editor loads
  useHighlightRestoration(editor, setHighlights, categories, updateCategoryCounters);

  const registerScrollToCard = useCallback((scrollFunction: (category: string, number: number) => void) => {
    // Store scroll function for later use
  }, []);

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent || '', false);
    }
  }, [initialContent, editor]);

  useEffect(() => {
    if (!editor) return;

    const handleMouseUp = (event: MouseEvent) => {
      setTimeout(() => {
        const selection = editor.state.selection;
        if (!selection.empty) {
          showHighlightMenu(event);
        }
      }, 10);
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      editorElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor, showHighlightMenu]);

  if (!editor) return null;

  return (
    <div className="flex h-screen bg-gray-50">
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <TiptapToolbar editor={editor} />
          </div>

        {/* Document Container */}
        <div className="flex-1 overflow-auto bg-gray-100 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Paper-like document */}
            <div className="bg-white shadow-lg rounded-lg min-h-[11in] relative">
              {/* Page content */}
              <EditorContent 
                editor={editor} 
                className="h-full"
              />
              
              {/* Document controls */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => setShowPanel(!showPanel)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 shadow-sm"
                >
                  {showPanel ? 'Hide' : 'Show'} Highlights ({highlights.length})
                </button>
                
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm"
                  >
                    Delete Note
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Panel */}
      <HighlightsPanel
        highlights={highlights}
        categories={categories}
        showPanel={showPanel}
        onUpdateCommentary={updateCommentary}
        onToggleExpanded={toggleExpanded}
        onClose={() => setShowPanel(false)}
        registerScrollToCard={registerScrollToCard}
      />
    </div>
  );
};

export default TiptapEditor;