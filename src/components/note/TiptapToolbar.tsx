import React from 'react';
import { Editor } from '@tiptap/core';

interface TiptapToolbarProps {
  editor: Editor | null;
}

const TiptapToolbar: React.FC<TiptapToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="border-b border-gray-200 p-2 flex gap-1 bg-gray-50 flex-wrap">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive('bold')
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } border`}
        type="button"
      >
        Bold
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
        Italic
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
        Underline
      </button>

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
    </div>
  );
};

export default TiptapToolbar;