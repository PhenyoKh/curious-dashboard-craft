
import { selectionCache } from './selectionCache';
import { executeWithFallback } from './errorHandling';

export interface TableConfig {
  rows: number;
  columns: number;
  headerRow?: boolean;
  headerColor?: string;
  cellColor?: string;
}

export const createTable = (config: TableConfig): boolean => {
  const { rows, columns, headerRow = true, headerColor = '#f8f9fa', cellColor = '#ffffff' } = config;
  
  return executeWithFallback(
    () => {
      const selection = selectionCache.getSelection();
      if (!selection || !selection.rangeCount) throw new Error('No selection');

      const range = selection.getRangeAt(0);
      const table = document.createElement('table');
      table.style.cssText = `
        border-collapse: collapse;
        margin: 16px 0;
        width: 100%;
        max-width: 100%;
        border: 1px solid #dee2e6;
        font-size: 14px;
      `;
      table.setAttribute('contenteditable', 'false');
      table.setAttribute('data-table-id', Date.now().toString());

      // Create table body
      const tbody = document.createElement('tbody');
      
      for (let i = 0; i < rows; i++) {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #dee2e6;';
        
        for (let j = 0; j < columns; j++) {
          const cell = document.createElement(headerRow && i === 0 ? 'th' : 'td');
          cell.style.cssText = `
            padding: 12px 8px;
            border: 1px solid #dee2e6;
            background-color: ${headerRow && i === 0 ? headerColor : cellColor};
            text-align: left;
            vertical-align: top;
            position: relative;
            min-width: 100px;
            ${headerRow && i === 0 ? 'font-weight: 600;' : ''}
          `;
          cell.setAttribute('contenteditable', 'true');
          cell.innerHTML = headerRow && i === 0 ? `Header ${j + 1}` : `Cell ${i + 1}-${j + 1}`;
          
          // Add cell selection and formatting capabilities
          cell.addEventListener('click', (e) => {
            e.stopPropagation();
            selectTableCell(cell);
          });
          
          cell.addEventListener('keydown', (e) => {
            handleTableCellKeydown(e, cell);
          });
          
          tr.appendChild(cell);
        }
        
        tbody.appendChild(tr);
      }
      
      table.appendChild(tbody);
      
      // Add table controls
      const controls = createTableControls(table);
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: relative; margin: 16px 0;';
      wrapper.appendChild(controls);
      wrapper.appendChild(table);
      
      range.deleteContents();
      range.insertNode(wrapper);
      
      // Position cursor after table
      const newRange = document.createRange();
      newRange.setStartAfter(wrapper);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    },
    undefined,
    'table creation'
  );
};

const createTableControls = (table: HTMLTableElement): HTMLElement => {
  const controls = document.createElement('div');
  controls.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 4px 8px;
    display: none;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;
  controls.className = 'table-controls';
  
  const buttons = [
    { text: 'Add Row', action: () => addTableRow(table) },
    { text: 'Add Column', action: () => addTableColumn(table) },
    { text: 'Delete Row', action: () => deleteTableRow(table) },
    { text: 'Delete Column', action: () => deleteTableColumn(table) },
    { text: 'Header Color', action: () => changeHeaderColor(table) },
    { text: 'Cell Color', action: () => changeCellColor(table) }
  ];
  
  buttons.forEach((btn, index) => {
    const button = document.createElement('button');
    button.textContent = btn.text;
    button.style.cssText = `
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 3px;
      padding: 4px 8px;
      margin-right: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.action();
    });
    controls.appendChild(button);
  });
  
  // Show controls on table hover
  table.addEventListener('mouseenter', () => {
    controls.style.display = 'block';
  });
  
  table.addEventListener('mouseleave', () => {
    controls.style.display = 'none';
  });
  
  return controls;
};

const selectTableCell = (cell: HTMLElement) => {
  // Remove previous selections
  const previousSelected = document.querySelectorAll('.table-cell-selected');
  previousSelected.forEach(el => el.classList.remove('table-cell-selected'));
  
  // Add selection to current cell
  cell.classList.add('table-cell-selected');
  cell.style.outline = '2px solid #4f7cff';
  cell.focus();
};

const handleTableCellKeydown = (e: KeyboardEvent, cell: HTMLElement) => {
  const table = cell.closest('table')!;
  const currentRow = cell.parentElement!;
  const currentCellIndex = Array.from(currentRow.children).indexOf(cell);
  const currentRowIndex = Array.from(table.querySelectorAll('tr')).indexOf(currentRow);
  
  switch (e.key) {
    case 'Tab':
      e.preventDefault();
      const nextCell = getNextTableCell(table, currentRowIndex, currentCellIndex, !e.shiftKey);
      if (nextCell) {
        selectTableCell(nextCell);
      }
      break;
      
    case 'Enter':
      if (!e.shiftKey) {
        e.preventDefault();
        const belowCell = getTableCell(table, currentRowIndex + 1, currentCellIndex);
        if (belowCell) {
          selectTableCell(belowCell);
        }
      }
      break;
      
    case 'ArrowUp':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const aboveCell = getTableCell(table, currentRowIndex - 1, currentCellIndex);
        if (aboveCell) selectTableCell(aboveCell);
      }
      break;
      
    case 'ArrowDown':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const belowCell = getTableCell(table, currentRowIndex + 1, currentCellIndex);
        if (belowCell) selectTableCell(belowCell);
      }
      break;
      
    case 'ArrowLeft':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const leftCell = getTableCell(table, currentRowIndex, currentCellIndex - 1);
        if (leftCell) selectTableCell(leftCell);
      }
      break;
      
    case 'ArrowRight':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rightCell = getTableCell(table, currentRowIndex, currentCellIndex + 1);
        if (rightCell) selectTableCell(rightCell);
      }
      break;
  }
};

const getTableCell = (table: HTMLTableElement, rowIndex: number, cellIndex: number): HTMLElement | null => {
  const rows = table.querySelectorAll('tr');
  if (rowIndex < 0 || rowIndex >= rows.length) return null;
  
  const cells = rows[rowIndex].children;
  if (cellIndex < 0 || cellIndex >= cells.length) return null;
  
  return cells[cellIndex] as HTMLElement;
};

const getNextTableCell = (table: HTMLTableElement, rowIndex: number, cellIndex: number, forward: boolean): HTMLElement | null => {
  const rows = table.querySelectorAll('tr');
  const totalRows = rows.length;
  const totalCols = rows[0].children.length;
  
  if (forward) {
    if (cellIndex + 1 < totalCols) {
      return getTableCell(table, rowIndex, cellIndex + 1);
    } else if (rowIndex + 1 < totalRows) {
      return getTableCell(table, rowIndex + 1, 0);
    }
  } else {
    if (cellIndex - 1 >= 0) {
      return getTableCell(table, rowIndex, cellIndex - 1);
    } else if (rowIndex - 1 >= 0) {
      return getTableCell(table, rowIndex - 1, totalCols - 1);
    }
  }
  
  return null;
};

const addTableRow = (table: HTMLTableElement) => {
  const tbody = table.querySelector('tbody')!;
  const lastRow = tbody.lastElementChild as HTMLTableRowElement;
  const cellCount = lastRow.cells.length;
  
  const newRow = document.createElement('tr');
  newRow.style.cssText = 'border-bottom: 1px solid #dee2e6;';
  
  for (let i = 0; i < cellCount; i++) {
    const cell = document.createElement('td');
    cell.style.cssText = `
      padding: 12px 8px;
      border: 1px solid #dee2e6;
      background-color: #ffffff;
      text-align: left;
      vertical-align: top;
      position: relative;
      min-width: 100px;
    `;
    cell.setAttribute('contenteditable', 'true');
    cell.innerHTML = `Cell ${tbody.children.length + 1}-${i + 1}`;
    
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      selectTableCell(cell);
    });
    
    cell.addEventListener('keydown', (e) => {
      handleTableCellKeydown(e, cell);
    });
    
    newRow.appendChild(cell);
  }
  
  tbody.appendChild(newRow);
};

const addTableColumn = (table: HTMLTableElement) => {
  const rows = table.querySelectorAll('tr');
  const columnIndex = rows[0].children.length;
  
  rows.forEach((row, rowIndex) => {
    const cell = document.createElement(rowIndex === 0 ? 'th' : 'td');
    cell.style.cssText = `
      padding: 12px 8px;
      border: 1px solid #dee2e6;
      background-color: ${rowIndex === 0 ? '#f8f9fa' : '#ffffff'};
      text-align: left;
      vertical-align: top;
      position: relative;
      min-width: 100px;
      ${rowIndex === 0 ? 'font-weight: 600;' : ''}
    `;
    cell.setAttribute('contenteditable', 'true');
    cell.innerHTML = rowIndex === 0 ? `Header ${columnIndex + 1}` : `Cell ${rowIndex + 1}-${columnIndex + 1}`;
    
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      selectTableCell(cell);
    });
    
    cell.addEventListener('keydown', (e) => {
      handleTableCellKeydown(e, cell);
    });
    
    row.appendChild(cell);
  });
};

const deleteTableRow = (table: HTMLTableElement) => {
  const selectedCell = table.querySelector('.table-cell-selected');
  if (!selectedCell) return;
  
  const row = selectedCell.parentElement!;
  const tbody = table.querySelector('tbody')!;
  
  if (tbody.children.length > 1) {
    row.remove();
  }
};

const deleteTableColumn = (table: HTMLTableElement) => {
  const selectedCell = table.querySelector('.table-cell-selected');
  if (!selectedCell) return;
  
  const cellIndex = Array.from(selectedCell.parentElement!.children).indexOf(selectedCell);
  const rows = table.querySelectorAll('tr');
  
  if (rows[0].children.length > 1) {
    rows.forEach(row => {
      if (row.children[cellIndex]) {
        row.children[cellIndex].remove();
      }
    });
  }
};

const changeHeaderColor = (table: HTMLTableElement) => {
  const color = prompt('Enter header color (hex code or color name):', '#f8f9fa');
  if (color) {
    const headerCells = table.querySelectorAll('th');
    headerCells.forEach(cell => {
      (cell as HTMLElement).style.backgroundColor = color;
    });
  }
};

const changeCellColor = (table: HTMLTableElement) => {
  const selectedCell = table.querySelector('.table-cell-selected');
  if (!selectedCell) return;
  
  const color = prompt('Enter cell color (hex code or color name):', '#ffffff');
  if (color) {
    (selectedCell as HTMLElement).style.backgroundColor = color;
  }
};

export const isInTable = (): boolean => {
  const selection = selectionCache.getSelection();
  if (!selection || !selection.rangeCount) return false;
  
  let element = selection.getRangeAt(0).commonAncestorContainer;
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement!;
  }
  
  while (element && element !== document.body) {
    if ((element as Element).tagName === 'TABLE') {
      return true;
    }
    element = (element as Element).parentElement;
  }
  
  return false;
};
