import React, { useEffect, useCallback, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, LineHeight } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { NumberedHighlight } from '../../extensions/NumberedHighlight';
import { useTiptapHighlights } from '../../hooks/useTiptapHighlights';
import { useHighlightRestoration } from '../../hooks/useHighlightRestoration';
import TiptapToolbar from './TiptapToolbar';
import EditorHeader from './EditorHeader';
import DocumentMetadata from './DocumentMetadata';
import HighlightsPanel from './highlighting/HighlightsPanel';
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
  const [wordCount, setWordCount] = useState(0);

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
      LineHeight.configure({
        types: ['textStyle'],
      }),
      Highlight,
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
    updateCategoryCounters
  } = useTiptapHighlights(editor, onSave);

  // Restore highlights from saved HTML when editor loads
  useHighlightRestoration(editor, setHighlights, categories, updateCategoryCounters);

  // Enhanced secure image upload handler
  const uploadImage = async (file: File) => {
    try {
      // Comprehensive file validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      const minSize = 1024; // 1KB
      
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
        return;
      }
      
      // Validate file size
      if (file.size > maxSize) {
        alert('File too large. Maximum size is 10MB.');
        return;
      }
      
      if (file.size < minSize) {
        alert('File too small. Minimum size is 1KB.');
        return;
      }
      
      // Validate file extension against MIME type
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const mimeToExt: { [key: string]: string[] } = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/gif': ['gif'],
        'image/webp': ['webp']
      };
      
      if (!fileExt || !mimeToExt[file.type]?.includes(fileExt)) {
        alert('File extension does not match file type.');
        return;
      }
      
      // Generate secure filename with timestamp and random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const fileName = `img_${timestamp}_${randomStr}.${fileExt}`;
      
      // Upload to Supabase storage bucket 'images'
      const { data, error } = await supabase.storage
        .from('images')
        .upload(`public/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false // Prevent overwriting existing files
        });
      
      if (error) {
        secureLogger.logError(error, 'Image upload failed');
        if (error.message.includes('Bucket not found')) {
          alert('Storage bucket not configured. Please contact support.');
        } else {
          alert('Upload failed. Please try again.');
        }
        return;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(data.path);
      
      if (publicUrl && editor) {
        // Insert image with security attributes
        editor.chain().focus().setImage({ 
          src: publicUrl,
          alt: `Uploaded image ${fileName}`
        }).run();
      }
    } catch (error) {
      secureLogger.logError(error as Error, 'Unexpected image upload error');
      alert('Upload failed due to an unexpected error.');
    }
  };

  // Enhanced secure YouTube embed handler
  const addYoutubeVideo = (url: string) => {
    if (!editor || !url) return;
    
    try {
      // Comprehensive YouTube URL validation
      const youtubeDomains = [
        'youtube.com',
        'www.youtube.com',
        'youtu.be',
        'm.youtube.com'
      ];
      
      // Parse URL to validate
      const urlObj = new URL(url);
      
      // Check if it's a valid YouTube domain
      if (!youtubeDomains.includes(urlObj.hostname)) {
        alert('Invalid URL. Only YouTube URLs are allowed.');
        return;
      }
      
      // Check protocol (only HTTPS allowed)
      if (urlObj.protocol !== 'https:') {
        alert('Only HTTPS YouTube URLs are allowed.');
        return;
      }
      
      // Extract video ID for validation
      let videoId = '';
      
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || '';
      }
      
      // Validate video ID format (YouTube video IDs are 11 characters)
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        alert('Invalid YouTube video URL format.');
        return;
      }
      
      // Construct clean YouTube URL
      const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Insert the video
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
              onImageUpload={uploadImage}
              onYoutubeEmbed={addYoutubeVideo}
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
    </div>
  );
};

export default TiptapEditor;