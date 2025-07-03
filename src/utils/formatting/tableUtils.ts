import { handleFormattingError } from './errorHandling';
import { getSelectionInfo, applyStyleToRange, clearSelectionAndMoveCursor } from './selectionUtils';

export const createTable = (): boolean => {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) return false;

  try {
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; margin-bottom: 1rem;';

    const thead = document.createElement('thead');
    thead.style.cssText = 'background-color: #f8f9fa;';

    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'border-bottom: 2px solid #dee2e6;';

    for (let i = 0; i < 3; i++) {
      const headerCell = document.createElement('th');
      headerCell.style.cssText = 'padding: 8px 12px; border: 1px solid #dee2e6; font-weight: bold; text-align: left; min-height: 20px;';
      headerCell.contentEditable = 'true';
      headerRow.appendChild(headerCell);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < 2; i++) {
      const bodyRow = document.createElement('tr');
      bodyRow.style.cssText = 'border-bottom: 1px solid #dee2e6;';
      for (let j = 0; j < 3; j++) {
        const bodyCell = document.createElement('td');
        bodyCell.style.cssText = 'padding: 8px 12px; border: 1px solid #dee2e6; min-height: 20px;';
        bodyCell.contentEditable = 'true';
        bodyRow.appendChild(bodyCell);
      }
      tbody.appendChild(bodyRow);
    }
    table.appendChild(tbody);

    selectionInfo.range.deleteContents();
    selectionInfo.range.insertNode(table);
    clearSelectionAndMoveCursor(table);

    return true;
  } catch (error: any) {
    handleFormattingError(error, 'table creation');
    return false;
  }
};

const addTableRow = (table: HTMLTableElement) => {
  const tbody = table.querySelector('tbody')!;
  const lastRow = tbody.lastElementChild as HTMLTableRowElement;
  const cellCount = lastRow.cells.length;
  
  const newRow = document.createElement('tr');
  newRow.style.cssText = 'border-bottom: 1px solid #dee2e6;';
  
  for (let i = 0; i < cellCount; i++) {
    const cell = document.createElement('td');
    cell.style.cssText = 'padding: 8px 12px; border: 1px solid #dee2e6; min-height: 20px;';
    cell.contentEditable = 'true';
    newRow.appendChild(cell);
  }
  
  tbody.appendChild(newRow);
};

const addTableColumn = (table: HTMLTableElement) => {
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cell = document.createElement(row.parentElement?.tagName === 'THEAD' ? 'th' : 'td');
    cell.style.cssText = row.parentElement?.tagName === 'THEAD' 
      ? 'padding: 8px 12px; border: 1px solid #dee2e6; background-color: #f8f9fa; font-weight: bold; text-align: left; min-height: 20px;'
      : 'padding: 8px 12px; border: 1px solid #dee2e6; min-height: 20px;';
    cell.contentEditable = 'true';
    (row as HTMLTableRowElement).appendChild(cell);
  });
};

const deleteTableRow = (table: HTMLTableElement, rowIndex: number) => {
  const tbody = table.querySelector('tbody')!;
  const rows = tbody.querySelectorAll('tr');
  if (rows.length > 1 && rowIndex < rows.length) {
    rows[rowIndex].remove();
  }
};

const deleteTableColumn = (table: HTMLTableElement, colIndex: number) => {
  const rows = table.querySelectorAll('tr');
  const firstRow = rows[0] as HTMLTableRowElement;
  if (firstRow.cells.length > 1) {
    rows.forEach(row => {
      const tableRow = row as HTMLTableRowElement;
      if (tableRow.cells[colIndex]) {
        tableRow.cells[colIndex].remove();
      }
    });
  }
};

export const insertTable = (action: string): boolean => {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.hasSelection) return false;

  try {
    const table = selectionInfo.range.startContainer.parentElement?.closest('table');

    if (!table) {
      console.warn('No table found to modify.');
      return false;
    }

    switch (action) {
      case 'addRow':
        addTableRow(table as HTMLTableElement);
        break;
      case 'addColumn':
        addTableColumn(table as HTMLTableElement);
        break;
      case 'deleteRow':
        const row = selectionInfo.range.startContainer.parentElement?.closest('tr');
        if (row) {
          const rowIndex = (row as HTMLTableRowElement).rowIndex;
          deleteTableRow(table as HTMLTableElement, rowIndex);
        }
        break;
      case 'deleteColumn':
        const cell = selectionInfo.range.startContainer.parentElement?.closest('td, th');
        if (cell) {
          const cellIndex = (cell as HTMLTableCellElement).cellIndex;
          deleteTableColumn(table as HTMLTableElement, cellIndex);
        }
        break;
      default:
        console.warn('Unknown table action:', action);
        return false;
    }

    return true;
  } catch (error: any) {
    handleFormattingError(error, `table ${action}`);
    return false;
  }
};
