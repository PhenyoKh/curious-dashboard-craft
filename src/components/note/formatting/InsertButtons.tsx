
import React from 'react';
import { Image, Link, Table } from 'lucide-react';

interface InsertButtonsProps {
  onFormatText: (command: string, value?: string) => void;
}

const InsertButtons: React.FC<InsertButtonsProps> = ({ onFormatText }) => {
  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Insert Image"
      >
        <Image className="w-4 h-4" />
      </button>
      <button
        className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Insert Link"
      >
        <Link className="w-4 h-4" />
      </button>
      <button
        className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Insert Table"
      >
        <Table className="w-4 h-4" />
      </button>
    </div>
  );
};

export default InsertButtons;
