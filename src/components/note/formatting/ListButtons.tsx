
import React from 'react';
import { createBulletList, createNumberedList, createTodoList } from '@/utils/formatting/listUtils';

interface ListButtonsProps {
  onFormatText: (command: string, value?: string) => void;
  isFormatActive: (command: string) => boolean;
}

const ListButtons: React.FC<ListButtonsProps> = ({ onFormatText, isFormatActive }) => {
  const handleBulletList = () => {
    createBulletList();
  };

  const handleNumberedList = () => {
    createNumberedList();
  };

  const handleTodoList = () => {
    createTodoList();
  };

  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        onClick={handleBulletList}
        className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
          isFormatActive('insertUnorderedList') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Bullet List (Ctrl+Shift+8)"
      >
        • List
      </button>
      <button
        onClick={handleNumberedList}
        className={`p-2 hover:bg-gray-100 rounded text-sm transition-colors ${
          isFormatActive('insertOrderedList') ? 'bg-blue-100 text-blue-700' : ''
        }`}
        title="Numbered List (Ctrl+Shift+7)"
      >
        1. List
      </button>
      <button
        onClick={handleTodoList}
        className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Todo List (Ctrl+Shift+9)"
      >
        ☑ Todo
      </button>
    </div>
  );
};

export default ListButtons;
