
import React from 'react';

const ShortcutsLegend: React.FC = () => {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="text-xs text-gray-600 mb-2 font-medium">Keyboard Shortcuts:</div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+B</kbd> Bold
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+I</kbd> Italic
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+U</kbd> Underline
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-200"></span>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+1</kbd> Key Definition
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-200"></span>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+2</kbd> Main Principle
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-200"></span>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+3</kbd> Example
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-200"></span>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/⌘+4</kbd> To Review
        </span>
      </div>
    </div>
  );
};

export default ShortcutsLegend;
