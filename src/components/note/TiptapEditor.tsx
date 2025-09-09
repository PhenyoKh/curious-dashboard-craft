import React, { useEffect, useCallback, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { LineHeight } from '../../extensions/LineHeight';
import { Color } from '@tiptap/extension-color';
import { Highlight as TiptapHighlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { NumberedHighlight } from '../../extensions/NumberedHighlight';
import { useTiptapHighlights } from '../../hooks/useTiptapHighlights';
import { useHighlightRestoration } from '../../hooks/useHighlightRestoration';
import { Highlight } from '@/types/highlight';
import TiptapToolbar from './TiptapToolbar';
import EditorHeader from './EditorHeader';
import DocumentMetadata from './DocumentMetadata';
import HighlightsPanel from './highlighting/HighlightsPanel';
import SecureUploadHandler from '@/components/security/SecureUploadHandler';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/utils/logger';
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
  onHighlightsChange?: (highlights: Highlight[]) => void;
  noteId?: string;
  // Optional: sidecar highlights loaded from Supabase to merge commentary on restoration
  savedHighlightsSidecar?: Array<{ id: string; commentary?: string; isExpanded?: boolean }>;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  initialContent, 
  onContentChange, 
  onSave,
  onDelete,
  initialTitle = '',
  initialSubject = '',
  onTitleChange,
  onSubjectChange,
  onHighlightsChange,
  noteId,
  savedHighlightsSidecar
}) => {
  // Document metadata state
  const [noteTitle, setNoteTitle] = useState(initialTitle);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [characterCount, setCharacterCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  
  // Security upload dialog state
  const [showSecureUpload, setShowSecureUpload] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);


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
        underline: false, // Disable StarterKit's underline to avoid conflicts
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      TextStyle,
      Color,
      LineHeight.configure({
        types: ['textStyle'],
        defaultLineHeight: '1.6',
      }),
      TiptapHighlight,
      Underline,
      CharacterCount.configure({
        limit: 50000,
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
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'tiptap-image',
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'tiptap-youtube',
        },
      }),
      // Table extensions
      Table.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 100,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'tiptap-table-row',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'tiptap-table-header',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'tiptap-table-cell',
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
      // Update character and word count
      if (editor.storage.characterCount) {
        setCharacterCount(editor.storage.characterCount.characters());
        setWordCount(editor.storage.characterCount.words());
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
    resequenceCategory
  } = useTiptapHighlights(editor, onSave);

  // Restore highlights from saved HTML when editor loads
  // Pass saved sidecar from parent when available; parent wires it through initial load state
  // We don't have direct access here; restoration hook will rely on the passed sidecar if provided by parent integration
  useHighlightRestoration(editor, setHighlights, categories, resequenceCategory, savedHighlightsSidecar);

  // Notify parent component when highlights change
  useEffect(() => {
    if (onHighlightsChange) {
      // Ensure commentary changes propagate so autosave can persist JSONB
      onHighlightsChange(highlights);
    }
  }, [highlights, onHighlightsChange]);

  // Secure image upload handler using SecureUploadHandler
  const handleSecureImageUpload = useCallback((file?: File) => {
    if (file) {
      setPendingUploadFile(file);
    }
    setShowSecureUpload(true);
  }, []);

  // Callback when file is successfully uploaded through SecureUploadHandler
  const handleFileUploaded = useCallback((url: string, filename: string) => {
    if (editor) {
      editor.chain().focus().setImage({ 
        src: url,
        alt: `Uploaded image: ${filename}`
      }).run();
      setShowSecureUpload(false);
      setPendingUploadFile(null);
    }
  }, [editor]);

  // Handle upload errors
  const handleUploadError = useCallback((error: Error) => {
    secureLogger.logError(error, 'Secure image upload failed');
    setShowSecureUpload(false);
    setPendingUploadFile(null);
  }, []);

  // Enhanced secure YouTube embed handler
  const addYoutubeVideo = (url: string) => {
    if (!editor || !url) return;
    
    try {
      // Parse and normalize common YouTube URL formats to watch?v=VIDEOID
      const urlObj = new URL(url);

      const hostname = urlObj.hostname.replace(/^www\./, '');
      const isYouTube = (
        hostname === 'youtube.com' ||
        hostname === 'm.youtube.com' ||
        hostname === 'youtu.be' ||
        hostname === 'youtube-nocookie.com'
      );
      if (!isYouTube) {
        alert('Invalid URL. Only YouTube URLs are allowed.');
        return;
      }

      if (urlObj.protocol !== 'https:') {
        alert('Only HTTPS YouTube URLs are allowed.');
        return;
      }

      let videoId = '';
      if (hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      } else if (hostname.endsWith('youtube.com') || hostname === 'youtube-nocookie.com') {
        // /watch?v=ID
        const vParam = urlObj.searchParams.get('v');
        if (vParam) {
          videoId = vParam;
        } else {
          // /embed/ID or /shorts/ID
          const parts = urlObj.pathname.split('/').filter(Boolean);
          if (parts.length >= 2 && (parts[0] === 'embed' || parts[0] === 'shorts')) {
            videoId = parts[1];
          }
        }
      }

      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        alert('Invalid YouTube video URL format.');
        return;
      }

      const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
      editor.chain().focus().setYoutubeVideo({ src: cleanUrl }).run();
      
    } catch (error) {
      secureLogger.logError(error as Error, 'YouTube URL validation failed');
      alert('Invalid YouTube URL provided.');
    }
  };

  const registerScrollToCard = useCallback((scrollFunction: (category: string, number: number) => void) => {
    // Store scroll function for later use
  }, []);

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent || '', false);
    }
    
    // Initialize character and word count
    if (editor && editor.storage.characterCount) {
      setCharacterCount(editor.storage.characterCount.characters());
      setWordCount(editor.storage.characterCount.words());
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
              onImageUpload={handleSecureImageUpload}
              onYoutubeEmbed={addYoutubeVideo}
              noteId={noteId}
              noteTitle={noteTitle}
              highlights={highlights}
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
              
              {/* Character and word count display */}
              <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
                <div>{wordCount.toLocaleString()} words</div>
                <div>
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
      
      {/* Secure Upload Dialog */}
      <Dialog open={showSecureUpload} onOpenChange={setShowSecureUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Secure Image Upload</DialogTitle>
          </DialogHeader>
          <SecureUploadHandler
            onFileUploaded={handleFileUploaded}
            onError={handleUploadError}
            acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
            maxFileSize={10 * 1024 * 1024} // 10MB
            className="mt-4"
            initialFile={pendingUploadFile || undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TiptapEditor;