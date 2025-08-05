import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/core';
import { Highlight } from '@/types/highlight';
import ExportButton from './ExportButton';

interface TiptapToolbarProps {
  editor: Editor | null;
  onDelete?: () => void;
  onImageUpload?: (file: File) => void;
  onYoutubeEmbed?: (url: string) => void;
  noteId?: string;
  noteTitle?: string;
  highlights?: Highlight[];
}

const TiptapToolbar: React.FC<TiptapToolbarProps> = ({ 
  editor, 
  onDelete,
  onImageUpload,
  onYoutubeEmbed,
  noteId,
  noteTitle,
  highlights
}) => {
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const tableDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableDropdownRef.current && !tableDropdownRef.current.contains(event.target as Node)) {
        setIsTableDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="border-b border-gray-200 p-2 flex gap-1 bg-gray-50 flex-wrap items-center justify-between">
      <div className="flex gap-1 flex-wrap items-center">
      {/* Text formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('bold')
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        <strong>B</strong>
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('italic')
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        <em>I</em>
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('underline')
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        <u>U</u>
      </button>

      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('strike')
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        <s>S</s>
      </button>

      {/* Divider */}
      <div className="w-px bg-gray-300 mx-1"></div>

      {/* Line Height */}
      <select
        onChange={(e) => {
          if (e.target.value === 'unset') {
            editor.chain().focus().unsetLineHeight().run();
          } else {
            editor.chain().focus().setLineHeight(e.target.value).run();
          }
        }}
        className="px-2 py-1 rounded text-sm border bg-white text-gray-700 hover:bg-gray-100"
        defaultValue="unset"
      >
        <option value="unset">Line Height</option>
        <option value="1">1.0</option>
        <option value="1.15">1.15</option>
        <option value="1.5">1.5</option>
        <option value="1.75">1.75</option>
        <option value="2">2.0</option>
        <option value="2.5">2.5</option>
      </select>


      {/* Divider */}
      <div className="w-px bg-gray-300 mx-1"></div>

      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('heading', { level: 1 })
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        H1
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        H2
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        H3
      </button>

      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('paragraph')
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        P
      </button>

      {/* Divider */}
      <div className="w-px bg-gray-300 mx-1"></div>

      {/* Lists */}
      <button
        onClick={() => {
          console.log('Bullet list clicked, can toggle?', editor.can().toggleBulletList());
          const result = editor.chain().focus().toggleBulletList().run();
          console.log('Bullet list toggle result:', result);
        }}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('bulletList')
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        • List
      </button>

      <button
        onClick={() => {
          console.log('Ordered list clicked, can toggle?', editor.can().toggleOrderedList());
          const result = editor.chain().focus().toggleOrderedList().run();
          console.log('Ordered list toggle result:', result);
        }}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('orderedList')
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        1. List
      </button>

      {/* Divider */}
      <div className="w-px bg-gray-300 mx-1"></div>

      {/* Table Controls Dropdown */}
      <div className="relative" ref={tableDropdownRef}>
        <button
          onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
          className={`px-3 py-1 rounded text-sm font-medium border flex items-center gap-1 ${
            editor.isActive('table') || isTableDropdownOpen
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
          title="Table Options"
        >
          Table
          <span className={`transition-transform ${isTableDropdownOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {isTableDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
            <div className="py-1">
              {/* Insert Table */}
              <button
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                  setIsTableDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                type="button"
              >
                ➕ Insert Table (3×3)
              </button>

              {editor.isActive('table') && (
                <>
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  {/* Column Controls */}
                  <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Columns
                  </div>
                  <button
                    onClick={() => {
                      editor.chain().focus().addColumnBefore().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    type="button"
                  >
                    ⟵ Add Column Before
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().addColumnAfter().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    type="button"
                  >
                    ⟶ Add Column After
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteColumn().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                    type="button"
                  >
                    ✕ Delete Column
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>
                  
                  {/* Row Controls */}
                  <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Rows
                  </div>
                  <button
                    onClick={() => {
                      editor.chain().focus().addRowBefore().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    type="button"
                  >
                    ↑ Add Row Above
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().addRowAfter().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    type="button"
                  >
                    ↓ Add Row Below
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteRow().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                    type="button"
                  >
                    ✕ Delete Row
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>
                  
                  {/* Header Controls */}
                  <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Headers
                  </div>
                  <button
                    onClick={() => {
                      editor.chain().focus().toggleHeaderRow().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    type="button"
                  >
                    {editor.isActive('table') && editor.getAttributes('tableRow').isHeader ? '✓' : '○'} Toggle Header Row
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().toggleHeaderColumn().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    type="button"
                  >
                    {editor.isActive('table') && editor.getAttributes('tableCell').isHeader ? '✓' : '○'} Toggle Header Column
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>
                  
                  {/* Cell Controls */}
                  <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Cells
                  </div>
                  <button
                    onClick={() => {
                      editor.chain().focus().mergeCells().run();
                      setIsTableDropdownOpen(false);
                    }}
                    disabled={!editor.can().mergeCells()}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                      editor.can().mergeCells() 
                        ? 'text-gray-700 hover:bg-gray-100' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    type="button"
                  >
                    🔗 Merge Selected Cells
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().splitCell().run();
                      setIsTableDropdownOpen(false);
                    }}
                    disabled={!editor.can().splitCell()}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                      editor.can().splitCell() 
                        ? 'text-gray-700 hover:bg-gray-100' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    type="button"
                  >
                    Split Cell
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>
                  
                  {/* Delete Table */}
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 font-medium"
                    type="button"
                  >
                    Delete Entire Table
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-300 mx-1"></div>

      {/* Image Upload */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0] && onImageUpload) {
            onImageUpload(e.target.files[0]);
            e.target.value = ''; // Reset input
          }
        }}
        style={{ display: 'none' }}
        id="image-upload"
      />
      <button
        onClick={() => document.getElementById('image-upload')?.click()}
        className="px-3 py-1 rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border"
        type="button"
        title="Upload Image"
      >
        📷 Image
      </button>

      {/* YouTube Embed */}
      <button
        onClick={() => {
          const url = prompt('Enter YouTube URL:');
          if (url && onYoutubeEmbed) {
            onYoutubeEmbed(url);
          }
        }}
        className="px-3 py-1 rounded text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border"
        type="button"
        title="Embed YouTube Video"
      >
        🎥 YouTube
      </button>

      {/* Divider */}
      <div className="w-px bg-gray-300 mx-1"></div>

      {/* History */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          !editor.can().undo()
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        ↶ Undo
      </button>

      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          !editor.can().redo()
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        ↷ Redo
      </button>
      </div>

      {/* Right side buttons */}
      <div className="flex gap-2">
        {noteId && noteTitle && highlights && (
          <ExportButton
            noteId={noteId}
            noteTitle={noteTitle}
            highlights={highlights}
            variant="outline"
            size="sm"
          />
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm"
            type="button"
          >
            Delete Note
          </button>
        )}
      </div>
    </div>
  );
};

export default TiptapToolbar;