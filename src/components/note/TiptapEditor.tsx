import React, { useEffect, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import Heading from '@tiptap/extension-heading';
import { NumberedHighlight } from '../../extensions/NumberedHighlight';
import { useTiptapHighlights } from '../../hooks/useTiptapHighlights';
import { useHighlightRestoration } from '../../hooks/useHighlightRestoration';
import TiptapToolbar from './TiptapToolbar';
import HighlightsPanel from './highlighting/HighlightsPanel';

interface TiptapEditorProps {
  initialContent: string | null;
  onContentChange: (content: string) => void;
  onSave?: () => void;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ initialContent, onContentChange, onSave }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      TextStyle,
      Color,
      Highlight,
      NumberedHighlight,
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
    ],
    content: initialContent || '',
    editorProps: {
      handleKeyDown(view, event) {
        if (event.key === 'Enter') {
          return false;
        }
        return false;
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
    toggleExpanded
  } = useTiptapHighlights(editor, onSave);

  // Restore highlights from saved HTML when editor loads
  useHighlightRestoration(editor, setHighlights, categories);

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
    <>
      <div className="tiptap-editor-container" style={{ border: '1px solid #ddd', borderRadius: 6 }}>
        <TiptapToolbar editor={editor} />
        <div style={{ minHeight: 300, padding: 12, caretColor: 'auto', outline: 'none' }}>
          <EditorContent editor={editor} />
        </div>
        
        <div style={{ padding: '8px 12px', borderTop: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {showPanel ? 'Hide' : 'Show'} Highlights ({highlights.length})
          </button>
        </div>
      </div>

      <HighlightsPanel
        highlights={highlights}
        categories={categories}
        showPanel={showPanel}
        onUpdateCommentary={updateCommentary}
        onToggleExpanded={toggleExpanded}
        onClose={() => setShowPanel(false)}
        registerScrollToCard={registerScrollToCard}
      />
    </>
  );
};

export default TiptapEditor;