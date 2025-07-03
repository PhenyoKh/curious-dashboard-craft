
import React, { useState } from 'react';
import { createTable, TableConfig } from '@/utils/formatting/tableUtils';

interface TableCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (config: TableConfig) => void;
}

const TableCreationModal: React.FC<TableCreationModalProps> = ({ isOpen, onClose, onCreateTable }) => {
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [headerRow, setHeaderRow] = useState(true);
  const [headerColor, setHeaderColor] = useState('#f8f9fa');
  const [cellColor, setCellColor] = useState('#ffffff');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: TableConfig = {
      rows,
      columns,
      headerRow,
      headerColor,
      cellColor
    };
    createTable(config);
    onCreateTable(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
        <h3 className="text-lg font-semibold mb-4">Create Table</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rows</label>
              <input
                type="number"
                min="1"
                max="20"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Columns</label>
              <input
                type="number"
                min="1"
                max="10"
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="headerRow"
              checked={headerRow}
              onChange={(e) => setHeaderRow(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="headerRow" className="text-sm font-medium">Include header row</label>
          </div>
          
          {headerRow && (
            <div>
              <label className="block text-sm font-medium mb-1">Header Color</label>
              <input
                type="color"
                value={headerColor}
                onChange={(e) => setHeaderColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Cell Color</label>
            <input
              type="color"
              value={cellColor}
              onChange={(e) => setCellColor(e.target.value)}
              className="w-full h-10 border border-gray-300 rounded cursor-pointer"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Create Table
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableCreationModal;
