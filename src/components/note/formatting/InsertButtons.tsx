
import React, { useState } from 'react';
import { Image, Link, Table } from 'lucide-react';
import TableCreationModal from './TableCreationModal';
import { TableConfig } from '@/utils/formatting/tableUtils';

interface InsertButtonsProps {
  onFormatText: (command: string, value?: string) => void;
}

const InsertButtons: React.FC<InsertButtonsProps> = ({ onFormatText }) => {
  const [showTableModal, setShowTableModal] = useState(false);

  const handleInsertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      onFormatText('insertImage', url);
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      const text = prompt('Enter link text:') || url;
      onFormatText('createLink', url);
    }
  };

  const handleTableCreate = (config: TableConfig) => {
    // Table creation is handled by the modal
    console.log('Table created with config:', config);
  };

  return (
    <>
      <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
        <button
          onClick={handleInsertImage}
          className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
          title="Insert Image"
        >
          <Image className="w-4 h-4" />
        </button>
        <button
          onClick={handleInsertLink}
          className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
          title="Insert Link"
        >
          <Link className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowTableModal(true)}
          className="p-2 hover:bg-gray-100 rounded text-sm transition-colors"
          title="Insert Table"
        >
          <Table className="w-4 h-4" />
        </button>
      </div>
      
      <TableCreationModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onCreateTable={handleTableCreate}
      />
    </>
  );
};

export default InsertButtons;
