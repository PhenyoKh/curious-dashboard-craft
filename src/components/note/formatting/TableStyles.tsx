
import React, { useEffect } from 'react';

const TableStyles: React.FC = () => {
  useEffect(() => {
    // Add global styles for table functionality
    const style = document.createElement('style');
    style.textContent = `
      .table-cell-selected {
        outline: 2px solid #4f7cff !important;
        outline-offset: -2px;
      }
      
      .todo-list input[type="checkbox"] {
        accent-color: #4f7cff;
      }
      
      .todo-list li {
        transition: opacity 0.2s ease;
      }
      
      table[contenteditable="false"] {
        user-select: none;
      }
      
      table td[contenteditable="true"]:focus,
      table th[contenteditable="true"]:focus {
        outline: 2px solid #4f7cff;
        outline-offset: -2px;
        background-color: rgba(79, 124, 255, 0.1) !important;
      }
      
      .table-controls button:hover {
        background-color: #e9ecef !important;
      }
      
      ul, ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      
      ul li, ol li {
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .todo-list {
        list-style: none !important;
        padding-left: 0 !important;
      }
      
      .todo-list li {
        display: flex !important;
        align-items: center !important;
        margin: 4px 0 !important;
      }
      
      .todo-list input[type="checkbox"] {
        margin-right: 8px !important;
        cursor: pointer !important;
      }
      
      .todo-list span {
        flex: 1 !important;
        outline: none !important;
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
};

export default TableStyles;
