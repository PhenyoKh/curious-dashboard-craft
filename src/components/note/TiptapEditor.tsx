import React, { useEffect, useCallback, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Heading from '@tiptap/extension-heading';
import { NumberedHighlight } from '../../extensions/NumberedHighlight';
import { useTiptapHighlights } from '../../hooks/useTiptapHighlights';
import { useHighlightRestoration } from '../../hooks/useHighlightRestoration';
import TiptapToolbar from './TiptapToolbar';
import EditorHeader from './EditorHeader';
import DocumentMetadata from './DocumentMetadata';
import HighlightsPanel from './highlighting/HighlightsPanel';
import './TiptapEditor.css';

interface TiptapEditorProps {
  initialContent: string | null;
  onContentChange: (content: string) => void;
  onSave?: () => void;
  onDelete?: () => void;
  initialTitle?: string;
  initialSubject?: string;
  onTitleChange?: (title: string) => void;
  onSubjectChange?: (subject: string) => void;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  initialContent, 
  onContentChange, 
  onSave,
  onDelete,
  initialTitle = '',
  initialSubject = '',
  onTitleChange,
  onSubjectChange
}) => {
  // Document metadata state
  const [noteTitle, setNoteTitle] = useState(initialTitle);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [characterCount, setCharacterCount] = useState(0);

  // Handlers for metadata changes
  const handleTitleChange = (newTitle: string) => {
    setNoteTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubject(newSubject);
    onSubjectChange?.(newSubject);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        strike: false, // Disable StarterKit's strike since we want to keep it
        bulletList: false, // Disable StarterKit's bulletList
        orderedList: false, // Disable StarterKit's orderedList  
        listItem: false, // Disable StarterKit's listItem
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      TextStyle,
      Color,
      Highlight,
      Underline,
      CharacterCount.configure({
        limit: 10000, // Optional: set a character limit
      }),
      // Add explicit list extensions
      BulletList.configure({
        HTMLAttributes: {
          class: 'tiptap-bullet-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'tiptap-ordered-list',
        },
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: 'tiptap-list-item',
        },
      }),
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
      // Update character count
      if (editor.storage.characterCount) {
        setCharacterCount(editor.storage.characterCount.characters());
      }
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
    
    // Initialize character count
    if (editor && editor.storage.characterCount) {
      setCharacterCount(editor.storage.characterCount.characters());
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
          {/* Header */}
          <EditorHeader
            onBack={() => window.history.back()}
            showPanel={showPanel}
            setShowPanel={setShowPanel}
            highlightsCount={highlights.length}
            onSave={onSave}
          />

          {/* Document Metadata */}
          <DocumentMetadata
            noteTitle={noteTitle}
            onNoteTitleChange={handleTitleChange}
            selectedSubject={selectedSubject}
            onSubjectChange={handleSubjectChange}
          />
          
          {/* Formatting Toolbar */}
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <TiptapToolbar 
              editor={editor} 
              onDelete={onDelete}
            />
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
              
              {/* Character count display */}
              <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
                {characterCount.toLocaleString()} characters
                {editor?.storage.characterCount?.limit && (
                  <span className={`ml-1 ${characterCount > (editor.storage.characterCount.limit * 0.9) ? 'text-amber-600' : ''} ${characterCount >= editor.storage.characterCount.limit ? 'text-red-600' : ''}`}>
                    / {editor.storage.characterCount.limit.toLocaleString()}
                  </span>
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