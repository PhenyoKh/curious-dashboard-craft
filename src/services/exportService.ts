import { exportNote } from './supabaseService';
import { ExportFormatters } from '@/utils/exportFormatters';
import { Highlight } from '@/types/highlight';
import { htmlToText } from '@/utils/htmlToText';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export type ExportFormat = 'text' | 'html' | 'markdown' | 'md' | 'pdf';

export interface ExportableNote {
  id: string;
  title: string;
  content: string;
  highlights?: any; // JSON string from database
  created_at: string;
  modified_at: string;
  word_count: number;
  subjects?: { label: string };
}

export class ClientExportService {
  /**
   * Convert HTML content to plain text using enhanced utility
   */
  private static htmlToText(html: string): string {
    return htmlToText(html);
  }

  /**
   * Parse highlights from database JSON string with enhanced error handling
   */
  private static parseHighlights(highlightsJson: any): Highlight[] {
    try {
      console.log('🔍 parseHighlights: Input type:', typeof highlightsJson);
      console.log('🔍 parseHighlights: Input value:', highlightsJson);
      
      if (!highlightsJson) {
        console.log('📝 parseHighlights: No highlights data, returning empty array');
        return [];
      }
      
      let parsed: any[] = [];
      
      if (typeof highlightsJson === 'string') {
        console.log('🔍 parseHighlights: Parsing string JSON');
        parsed = JSON.parse(highlightsJson);
      } else if (Array.isArray(highlightsJson)) {
        console.log('🔍 parseHighlights: Already an array');
        parsed = highlightsJson;
      } else {
        console.log('🔍 parseHighlights: Unexpected type, treating as array');
        parsed = [highlightsJson];
      }
      
      // Validate that parsed data is an array of valid highlights
      if (!Array.isArray(parsed)) {
        console.warn('⚠️ parseHighlights: Parsed data is not an array, returning empty array');
        return [];
      }
      
      const validHighlights = parsed.filter((highlight: any) => {
        const isValid = highlight && 
                       typeof highlight.text === 'string' && 
                       typeof highlight.category === 'string' &&
                       typeof highlight.number === 'number';
        
        if (!isValid) {
          console.warn('⚠️ parseHighlights: Invalid highlight object:', highlight);
        }
        
        return isValid;
      });
      
      console.log(`✅ parseHighlights: Successfully parsed ${validHighlights.length} valid highlights`);
      return validHighlights as Highlight[];
      
    } catch (error) {
      console.error('❌ parseHighlights: Error parsing highlights:', error);
      console.error('❌ parseHighlights: Input data:', highlightsJson);
      return [];
    }
  }

  /**
   * Generate HTML export with formatted highlights
   */
  private static generateHTML(note: ExportableNote, highlights: Highlight[]): string {
    const categorizedHighlights = ExportFormatters.categorizeHighlights(highlights);
    
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${this.escapeHtml(note.title)}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem; 
            line-height: 1.6;
            color: #333;
        }
        .note-header { 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 1rem; 
            margin-bottom: 2rem; 
        }
        .note-title { 
            font-size: 2rem; 
            font-weight: bold; 
            margin: 0 0 0.5rem 0; 
        }
        .note-meta { 
            color: #6b7280; 
            font-size: 0.875rem; 
        }
        .note-content { 
            margin-bottom: 3rem; 
        }
        .highlights-section { 
            border-top: 2px solid #e5e7eb; 
            padding-top: 2rem; 
        }
        .highlights-title { 
            font-size: 1.5rem; 
            font-weight: bold; 
            margin-bottom: 1.5rem; 
        }
        .highlight-category { 
            margin-bottom: 2rem; 
        }
        .category-title { 
            font-size: 1.25rem; 
            font-weight: 600; 
            margin-bottom: 1rem; 
            display: flex; 
            align-items: center; 
        }
        .category-icon { 
            width: 1rem; 
            height: 1rem; 
            border-radius: 50%; 
            margin-right: 0.5rem; 
        }
        .highlight-item { 
            margin-bottom: 1.5rem; 
            padding: 1rem; 
            background: #f9fafb; 
            border-radius: 0.5rem; 
            border-left: 4px solid #d1d5db; 
        }
        .highlight-number { 
            font-weight: 600; 
            color: #374151; 
        }
        .highlight-text { 
            margin: 0.5rem 0; 
            padding: 0.5rem; 
            background: white; 
            border-radius: 0.25rem; 
            font-style: italic; 
        }
        .highlight-commentary { 
            margin-top: 0.5rem; 
            color: #4b5563; 
        }
        .no-highlights { 
            color: #6b7280; 
            font-style: italic; 
            text-align: center; 
            padding: 2rem; 
        }
    </style>
</head>
<body>
    <div class="note-header">
        <h1 class="note-title">${this.escapeHtml(note.title)}</h1>
        <div class="note-meta">
            Subject: ${note.subjects?.label || 'No Subject'} | 
            Created: ${new Date(note.created_at).toLocaleDateString()} | 
            Modified: ${new Date(note.modified_at).toLocaleDateString()} | 
            Words: ${note.word_count}
        </div>
    </div>
    
    <div class="note-content">
        ${note.content}
    </div>`;

    if (highlights.length > 0) {
      html += `
    <div class="highlights-section">
        <h2 class="highlights-title">Highlights & Commentary</h2>`;

      const categories = {
        red: { name: 'Key Definition', color: '#ffcdd2', emoji: '🔴' },
        yellow: { name: 'Key Principle', color: '#fff9c4', emoji: '🟡' },
        green: { name: 'Example', color: '#c8e6c9', emoji: '🟢' },
        blue: { name: 'Review Later', color: '#bbdefb', emoji: '🔵' }
      };

      Object.entries(categorizedHighlights).forEach(([category, categoryHighlights]) => {
        if (categoryHighlights.length > 0) {
          const categoryInfo = categories[category as keyof typeof categories];
          
          html += `
        <div class="highlight-category">
            <h3 class="category-title">
                <span class="category-icon" style="background-color: ${categoryInfo.color};"></span>
                ${categoryInfo.emoji} ${categoryInfo.name}
            </h3>`;

          categoryHighlights.forEach(highlight => {
            html += `
            <div class="highlight-item" style="border-color: ${categoryInfo.color};">
                <div class="highlight-number">${highlight.number}.</div>
                <div class="highlight-text">${this.escapeHtml(highlight.text)}</div>`;
            
            if (highlight.commentary && highlight.commentary.trim()) {
              html += `<div class="highlight-commentary">${this.escapeHtml(highlight.commentary)}</div>`;
            }
            
            html += `</div>`;
          });

          html += `</div>`;
        }
      });

      html += `</div>`;
    } else {
      html += `
    <div class="highlights-section">
        <h2 class="highlights-title">Highlights & Commentary</h2>
        <div class="no-highlights">No highlights in this note.</div>
    </div>`;
    }

    html += `</body></html>`;
    return html;
  }

  /**
   * Generate Markdown export
   */
  private static generateMarkdown(note: ExportableNote, highlights: Highlight[]): string {
    const categorizedHighlights = ExportFormatters.categorizeHighlights(highlights);
    
    let markdown = `# ${note.title}\n\n`;
    
    // Add metadata
    markdown += `**Subject:** ${note.subjects?.label || 'No Subject'}  \n`;
    markdown += `**Created:** ${new Date(note.created_at).toLocaleDateString()}  \n`;
    markdown += `**Modified:** ${new Date(note.modified_at).toLocaleDateString()}  \n`;
    markdown += `**Words:** ${note.word_count}\n\n`;
    markdown += `---\n\n`;
    
    // Add content - use content_text if available, otherwise convert HTML
    let contentText = '';
    if (note.content_text && note.content_text.trim()) {
      contentText = note.content_text;
    } else {
      contentText = this.htmlToText(note.content);
    }
    markdown += `${contentText}\n\n`;
    
    if (highlights.length > 0) {
      markdown += `---\n\n## Highlights & Commentary\n\n`;
      
      const categories = {
        red: { name: 'Key Definition', emoji: '🔴' },
        yellow: { name: 'Key Principle', emoji: '🟡' },
        green: { name: 'Example', emoji: '🟢' },
        blue: { name: 'Review Later', emoji: '🔵' }
      };
      
      Object.entries(categorizedHighlights).forEach(([category, categoryHighlights]) => {
        if (categoryHighlights.length > 0) {
          const categoryInfo = categories[category as keyof typeof categories];
          
          markdown += `### ${categoryInfo.emoji} ${categoryInfo.name}\n\n`;
          
          categoryHighlights.forEach(highlight => {
            markdown += `**${highlight.number}.** ${highlight.text}\n`;
            if (highlight.commentary && highlight.commentary.trim()) {
              markdown += `> ${highlight.commentary}\n`;
            }
            markdown += `\n`;
          });
        }
      });
    } else {
      markdown += `---\n\n## Highlights & Commentary\n\n*No highlights in this note.*\n\n`;
    }
    
    return markdown;
  }

  /**
   * Generate plain text export
   */
  private static generateText(note: ExportableNote, highlights: Highlight[]): string {
    const categorizedHighlights = ExportFormatters.categorizeHighlights(highlights);
    
    let text = `${note.title}\n\n`;
    
    // Add metadata
    text += `Subject: ${note.subjects?.label || 'No Subject'}\n`;
    text += `Created: ${new Date(note.created_at).toLocaleDateString()}\n`;
    text += `Modified: ${new Date(note.modified_at).toLocaleDateString()}\n`;
    text += `Words: ${note.word_count}\n\n`;
    text += `${'-'.repeat(50)}\n\n`;
    
    // Add content - use content_text if available, otherwise convert HTML
    let contentText = '';
    if (note.content_text && note.content_text.trim()) {
      contentText = note.content_text;
    } else {
      contentText = this.htmlToText(note.content);
    }
    text += `${contentText}\n\n`;
    
    if (highlights.length > 0) {
      text += `${'-'.repeat(50)}\n`;
      text += `HIGHLIGHTS & COMMENTARY\n`;
      text += `${'-'.repeat(50)}\n\n`;
      
      const categories = {
        red: { name: 'Key Definition' },
        yellow: { name: 'Key Principle' },
        green: { name: 'Example' },
        blue: { name: 'Review Later' }
      };
      
      Object.entries(categorizedHighlights).forEach(([category, categoryHighlights]) => {
        if (categoryHighlights.length > 0) {
          const categoryInfo = categories[category as keyof typeof categories];
          
          text += `${categoryInfo.name.toUpperCase()}\n`;
          text += `${'-'.repeat(categoryInfo.name.length)}\n\n`;
          
          categoryHighlights.forEach(highlight => {
            text += `${highlight.number}. ${highlight.text}\n`;
            if (highlight.commentary && highlight.commentary.trim()) {
              text += `   Commentary: ${highlight.commentary}\n`;
            }
            text += `\n`;
          });
        }
      });
    } else {
      text += `${'-'.repeat(50)}\n`;
      text += `HIGHLIGHTS & COMMENTARY\n`;
      text += `${'-'.repeat(50)}\n\n`;
      text += `No highlights in this note.\n\n`;
    }
    
    return text;
  }

  /**
   * Generate PDF export
   */
  private static generatePDF(note: ExportableNote, highlights: Highlight[]): jsPDF {
    const categorizedHighlights = ExportFormatters.categorizeHighlights(highlights);
    
    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Start content directly (title only in filename)

    // Content section with visual highlighting
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Parse HTML content to extract text, highlight positions, and headings
    let contentData: { 
      text: string; 
      highlights: Array<{ start: number; end: number; category: string; color: string; id: string; }>; 
      headings: Array<{ start: number; end: number; level: number; text: string; }>; 
    };
    
    if (note.content && note.content.trim()) {
      console.log('🔍 generatePDF: Parsing HTML content with highlights and headings');
      contentData = this.parseHighlightsFromHTML(note.content);
    } else if (note.content_text && note.content_text.trim()) {
      console.log('🔍 generatePDF: Using content_text field (no visual highlights or headings)');
      contentData = { text: note.content_text, highlights: [], headings: [] };
    } else {
      console.warn('⚠️ generatePDF: No content available for PDF generation');
      contentData = { text: '(No content available)', highlights: [], headings: [] };
    }
    
    console.log(`🔍 generatePDF: Content text length: ${contentData.text.length}, highlights: ${contentData.highlights.length}, headings: ${contentData.headings.length}`);
    
    // Render content with visual highlighting and heading formatting
    yPosition = this.renderTextWithHighlights(doc, contentData.text, contentData.highlights, contentData.headings, margin, yPosition, maxWidth, pageHeight);
    yPosition += 20;

    // Highlights section
    if (highlights.length > 0) {
      // Always start highlights on a new page for professional separation
      doc.addPage();
      yPosition = margin;

      // Highlights title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Highlights & Commentary', margin, yPosition);
      yPosition += 15;

      // Add separator line
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;

      const categories = {
        red: { name: 'Key Definition', color: [255, 205, 210] as [number, number, number] },
        yellow: { name: 'Key Principle', color: [255, 249, 196] as [number, number, number] },
        green: { name: 'Example', color: [200, 230, 201] as [number, number, number] },
        blue: { name: 'Review Later', color: [187, 222, 251] as [number, number, number] }
      };

      Object.entries(categorizedHighlights).forEach(([category, categoryHighlights]) => {
        if (categoryHighlights.length > 0) {
          const categoryInfo = categories[category as keyof typeof categories];
          
          // Check if we need a new page for this category
          if (yPosition + 40 > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }

          // Category title with colored background
          doc.setFillColor(...categoryInfo.color);
          doc.roundedRect(margin, yPosition - 5, maxWidth, 12, 2, 2, 'F');
          
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(`${categoryInfo.name} (${categoryHighlights.length})`, margin + 5, yPosition + 3);
          yPosition += 20;

          // Individual highlights
          categoryHighlights.forEach(highlight => {
            // Check if we need a new page for this highlight
            const estimatedHeight = 25 + (highlight.commentary ? 15 : 0);
            if (yPosition + estimatedHeight > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
            }

            // Highlight number and text
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${highlight.number}.`, margin, yPosition);
            
            doc.setFont('helvetica', 'normal');
            const highlightLines = doc.splitTextToSize(highlight.text, maxWidth - 15);
            doc.text(highlightLines, margin + 15, yPosition);
            yPosition += highlightLines.length * 5 + 3;

            // Commentary if exists
            if (highlight.commentary && highlight.commentary.trim()) {
              doc.setFontSize(10);
              doc.setFont('helvetica', 'italic');
              doc.setTextColor(100, 100, 100);
              const commentaryLines = doc.splitTextToSize(`Note: ${highlight.commentary}`, maxWidth - 15);
              doc.text(commentaryLines, margin + 15, yPosition);
              yPosition += commentaryLines.length * 4 + 3;
              doc.setTextColor(0, 0, 0);
            }
            
            yPosition += 8;
          });
          
          yPosition += 10;
        }
      });
    } else {
      // No highlights message
      if (yPosition + 30 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Highlights & Commentary', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('No highlights in this note.', margin, yPosition);
    }

    return doc;
  }

  /**
   * Extract text sections, identifying table blocks for special rendering
   */
  private static extractTextSections(text: string): Array<{ type: 'text' | 'table'; content: string; }> {
    const sections: Array<{ type: 'text' | 'table'; content: string; }> = [];
    const lines = text.split('\n');
    
    let currentSection = { type: 'text' as 'text' | 'table', content: '' };
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isTableLine = /^\s*\|.*\|\s*$/.test(line); // Lines that start and end with |
      const isSeparatorLine = /^\s*\|[\s-|]+\|\s*$/.test(line); // Lines with |-----|
      
      if (isTableLine || isSeparatorLine) {
        // This is a table line
        if (!inTable) {
          // Starting a new table
          if (currentSection.content.trim()) {
            sections.push({ ...currentSection });
          }
          currentSection = { type: 'table', content: line + '\n' };
          inTable = true;
        } else {
          // Continue current table
          currentSection.content += line + '\n';
        }
      } else {
        // This is not a table line
        if (inTable) {
          // Ending a table
          sections.push({ ...currentSection });
          currentSection = { type: 'text', content: line + '\n' };
          inTable = false;
        } else {
          // Continue current text section
          currentSection.content += line + '\n';
        }
      }
    }
    
    // Add the last section
    if (currentSection.content.trim()) {
      sections.push({ ...currentSection });
    }
    
    console.log(`📝 Extracted ${sections.length} sections: ${sections.filter(s => s.type === 'table').length} tables, ${sections.filter(s => s.type === 'text').length} text`);
    
    return sections;
  }

  /**
   * Render regular text section with highlights and headings (original logic)
   */
  private static renderRegularTextSection(
    doc: jsPDF,
    text: string,
    highlights: Array<{ start: number; end: number; color: string; category: string; id: string; }>,
    headings: Array<{ start: number; end: number; level: number; text: string; }>,
    startX: number,
    startY: number,
    maxWidth: number,
    pageHeight: number
  ): number {
    const lineHeight = 6;
    const margin = 20;
    let currentY = startY;

    const lines = doc.splitTextToSize(text, maxWidth);
    let globalCharPos = 0;
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineStartPos = globalCharPos;
      const lineEndPos = lineStartPos + line.length;
      
      // Find headings that intersect with this line
      const lineHeadings = headings.filter(heading => 
        (heading.start < lineEndPos && heading.end > lineStartPos)
      );
      
      // Determine if this line contains a heading and get the heading level
      const currentHeading = lineHeadings.length > 0 ? lineHeadings[0] : null;
      let currentLineHeight = lineHeight;
      
      // Apply heading formatting if this line contains a heading
      if (currentHeading) {
        // Set font size and style based on heading level
        switch (currentHeading.level) {
          case 1:
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            currentLineHeight = 8;
            break;
          case 2:
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            currentLineHeight = 7;
            break;
          case 3:
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            currentLineHeight = 6.5;
            break;
          case 4:
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            currentLineHeight = 6.5;
            break;
          case 5:
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            currentLineHeight = 6;
            break;
          case 6:
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            currentLineHeight = 6;
            break;
          default:
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
        }
        
        // Add extra spacing before headings (except for first line)
        if (lineIndex > 0) {
          currentY += 4;
        }
      } else {
        // Reset to normal text formatting
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
      }
      
      // Check if we need a new page
      if (currentY + currentLineHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      
      // Find highlights that intersect with this line
      const lineHighlights = highlights.filter(highlight => 
        (highlight.start < lineEndPos && highlight.end > lineStartPos)
      );
      
      if (lineHighlights.length === 0) {
        // No highlights on this line, render normally
        if (!currentHeading) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
        }
        doc.setTextColor(0, 0, 0);
        doc.text(line, startX, currentY);
      } else {
        // Render line with highlights
        this.renderLineWithHighlights(doc, line, lineHighlights, lineStartPos, startX, currentY, maxWidth);
      }
      
      globalCharPos += line.length;
      if (lineIndex < lines.length - 1) {
        globalCharPos += 1;
      }
      
      currentY += currentLineHeight;
      
      // Add extra spacing after headings
      if (currentHeading) {
        currentY += 2;
      }
    }
    
    return currentY;
  }

  /**
   * Render table visually in PDF with borders, cells, and highlights
   */
  private static renderTableInPDF(
    doc: jsPDF,
    tableText: string,
    highlights: Array<{ start: number; end: number; color: string; category: string; id: string; }>,
    startX: number,
    startY: number,
    maxWidth: number,
    pageHeight: number
  ): number {
    const margin = 20;
    const cellPadding = 3;
    const rowHeight = 8;
    const headerRowHeight = 10;
    let currentY = startY;

    try {
      // Parse table from markdown-style text
      const tableData = this.parseTableFromText(tableText);
      if (tableData.rows.length === 0) {
        console.warn('⚠️ No table data found, falling back to text rendering');
        return this.renderRegularTextSection(doc, tableText, highlights, [], startX, startY, maxWidth, pageHeight);
      }

      // Calculate column widths based on content
      const columnWidths = this.calculateColumnWidths(tableData, maxWidth - 2 * cellPadding);
      const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0) + (columnWidths.length + 1);

      console.log(`📊 Rendering table: ${tableData.rows.length} rows, ${columnWidths.length} columns, width: ${tableWidth}`);

      // Check if table fits on current page
      const tableHeight = (tableData.hasHeader ? headerRowHeight : 0) + (tableData.rows.length - (tableData.hasHeader ? 1 : 0)) * rowHeight + 4;
      if (currentY + tableHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      // Draw table border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(startX, currentY, tableWidth, tableHeight);

      let rowY = currentY;
      let textPosition = 0; // Track position in the original table text for highlights

      // Render each row
      for (let rowIndex = 0; rowIndex < tableData.rows.length; rowIndex++) {
        const row = tableData.rows[rowIndex];
        const isHeader = tableData.hasHeader && rowIndex === 0;
        const currentRowHeight = isHeader ? headerRowHeight : rowHeight;

        // Draw row separator (except for first row)
        if (rowIndex > 0) {
          doc.line(startX, rowY, startX + tableWidth, rowY);
        }

        // Set font for header or regular row
        if (isHeader) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
        }

        let cellX = startX;

        // Render each cell in the row
        for (let colIndex = 0; colIndex < row.cells.length; colIndex++) {
          const cell = row.cells[colIndex];
          const cellWidth = columnWidths[colIndex] || 30;

          // Draw vertical cell separators
          if (colIndex > 0) {
            doc.line(cellX, rowY, cellX, rowY + currentRowHeight);
          }

          // Find highlights that apply to this cell
          const cellStart = textPosition;
          const cellEnd = textPosition + cell.length;
          const cellHighlights = highlights.filter(h => 
            h.start >= cellStart && h.end <= cellEnd
          );

          // Render cell background for highlights
          if (cellHighlights.length > 0) {
            cellHighlights.forEach(highlight => {
              const colorMap = {
                '#ffcdd2': [255, 205, 210], // red
                '#fff9c4': [255, 249, 196], // yellow  
                '#c8e6c9': [200, 230, 201], // green
                '#bbdefb': [187, 222, 251]  // blue
              } as Record<string, [number, number, number]>;
              
              const [r, g, b] = colorMap[highlight.color] || [255, 255, 255];
              doc.setFillColor(r, g, b);
              doc.rect(cellX + 1, rowY + 1, cellWidth - 1, currentRowHeight - 1, 'F');
            });
          }

          // Render cell text
          doc.setTextColor(0, 0, 0);
          const cellText = cell.trim();
          if (cellText) {
            const textY = rowY + currentRowHeight / 2 + 2;
            
            // Handle text overflow by truncating if necessary
            let displayText = cellText;
            const textWidth = doc.getTextWidth(displayText);
            if (textWidth > cellWidth - 2 * cellPadding) {
              while (doc.getTextWidth(displayText + '...') > cellWidth - 2 * cellPadding && displayText.length > 0) {
                displayText = displayText.slice(0, -1);
              }
              displayText += '...';
            }

            doc.text(displayText, cellX + cellPadding, textY);
          }

          cellX += cellWidth + 1; // +1 for border
          textPosition += cell.length + 3; // +3 for " | " separators in original text
        }

        rowY += currentRowHeight;
        textPosition += 2; // Account for "|\n" at end of row
      }

      // Draw final horizontal line
      doc.line(startX, rowY, startX + tableWidth, rowY);

      // Draw vertical borders
      let borderX = startX;
      for (let i = 0; i <= columnWidths.length; i++) {
        doc.line(borderX, currentY, borderX, rowY);
        if (i < columnWidths.length) {
          borderX += columnWidths[i] + 1;
        }
      }

      console.log(`✅ Table rendered successfully at Y: ${currentY} to ${rowY + 4}`);
      return rowY + 4; // Add some spacing after table

    } catch (error) {
      console.error('❌ Error rendering table in PDF:', error);
      // Fallback to text rendering
      return this.renderRegularTextSection(doc, tableText, highlights, [], startX, startY, maxWidth, pageHeight);
    }
  }

  /**
   * Parse table from markdown-style text into structured data
   */
  private static parseTableFromText(tableText: string): {
    rows: Array<{ cells: string[]; isHeader: boolean; }>;
    hasHeader: boolean;
  } {
    const lines = tableText.trim().split('\n').filter(line => line.trim());
    const rows: Array<{ cells: string[]; isHeader: boolean; }> = [];
    let hasHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip separator lines (|-----|)
      if (/^\|[\s-|]+\|$/.test(line)) {
        if (i === 1) {
          hasHeader = true; // Separator after first row indicates header
          if (rows.length > 0) {
            rows[0].isHeader = true;
          }
        }
        continue;
      }
      
      // Parse table row
      if (/^\|.*\|$/.test(line)) {
        const cells = line
          .slice(1, -1) // Remove outer |
          .split('|')
          .map(cell => cell.trim());
        
        rows.push({
          cells,
          isHeader: false // Will be set to true for first row if header is detected
        });
      }
    }

    return { rows, hasHeader };
  }

  /**
   * Calculate optimal column widths for table
   */
  private static calculateColumnWidths(
    tableData: { rows: Array<{ cells: string[]; isHeader: boolean; }>; hasHeader: boolean; },
    maxWidth: number
  ): number[] {
    if (tableData.rows.length === 0) return [];
    
    const columnCount = Math.max(...tableData.rows.map(row => row.cells.length));
    const columnWidths: number[] = [];
    
    // Calculate minimum width needed for each column based on content
    for (let col = 0; col < columnCount; col++) {
      let maxCellWidth = 30; // Minimum column width
      
      tableData.rows.forEach(row => {
        if (row.cells[col]) {
          const cellText = row.cells[col].trim();
          // Estimate text width (rough approximation)
          const estimatedWidth = cellText.length * 3 + 10; // 3 units per character + padding
          maxCellWidth = Math.max(maxCellWidth, estimatedWidth);
        }
      });
      
      columnWidths.push(Math.min(maxCellWidth, maxWidth / columnCount)); // Don't exceed available width
    }
    
    // Adjust widths to fit within maxWidth
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth > maxWidth) {
      const scaleFactor = maxWidth / totalWidth;
      for (let i = 0; i < columnWidths.length; i++) {
        columnWidths[i] = Math.floor(columnWidths[i] * scaleFactor);
      }
    }
    
    return columnWidths;
  }

  /**
   * Render text with visual highlights and heading formatting in PDF
   */
  private static renderTextWithHighlights(
    doc: jsPDF, 
    text: string, 
    highlights: Array<{ start: number; end: number; color: string; category: string; id: string; }>,
    headings: Array<{ start: number; end: number; level: number; text: string; }>,
    startX: number, 
    startY: number, 
    maxWidth: number, 
    pageHeight: number
  ): number {
    const lineHeight = 6;
    const margin = 20;
    let currentY = startY;

    try {
      // Ensure font is set to normal at the start
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Detect and extract table sections from the text
      const sections = this.extractTextSections(text);
      let globalCharPos = 0;
      
      for (const section of sections) {
        if (section.type === 'table') {
          // Render table visually
          console.log(`📊 Rendering visual table at position ${globalCharPos}`);
          const sectionHighlights = highlights.filter(h => 
            h.start >= globalCharPos && h.end <= globalCharPos + section.content.length
          );
          
          currentY = this.renderTableInPDF(
            doc, 
            section.content, 
            sectionHighlights.map(h => ({
              ...h,
              start: h.start - globalCharPos,
              end: h.end - globalCharPos
            })),
            startX, 
            currentY, 
            maxWidth, 
            pageHeight
          );
          
          globalCharPos += section.content.length;
        } else {
          // Render regular text
          const sectionText = section.content;
          currentY = this.renderRegularTextSection(
            doc,
            sectionText,
            highlights.filter(h => 
              h.start >= globalCharPos && h.end <= globalCharPos + sectionText.length
            ).map(h => ({
              ...h,
              start: h.start - globalCharPos,
              end: h.end - globalCharPos
            })),
            headings.filter(h => 
              h.start >= globalCharPos && h.end <= globalCharPos + sectionText.length
            ).map(h => ({
              ...h,
              start: h.start - globalCharPos,
              end: h.end - globalCharPos
            })),
            startX,
            currentY,
            maxWidth,
            pageHeight
          );
          
          globalCharPos += sectionText.length;
        }
      }
      
      return currentY;
      
    } catch (error) {
      console.error('❌ renderTextWithHighlights: Error rendering with highlights:', error);
      // Fallback to simple text rendering
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const fallbackLines = doc.splitTextToSize(text, maxWidth);
      
      for (const line of fallbackLines) {
        if (currentY + lineHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
        
        doc.text(line, startX, currentY);
        currentY += lineHeight;
      }
      
      return currentY;
    }
  }

  /**
   * Render a single line with highlight backgrounds
   */
  private static renderLineWithHighlights(
    doc: jsPDF,
    line: string,
    lineHighlights: Array<{ start: number; end: number; color: string; category: string; id: string; }>,
    lineStartPos: number,
    x: number,
    y: number,
    maxWidth: number
  ): void {
    try {
      // Convert hex colors to RGB for jsPDF
      const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ] : [255, 255, 255];
      };

      // Create segments for rendering
      const segments: Array<{
        text: string;
        startX: number;
        width: number;
        color?: string;
        isHighlighted: boolean;
      }> = [];

      let currentPos = 0;
      let currentX = x;
      
      // Sort highlights by start position
      const sortedHighlights = lineHighlights.sort((a, b) => a.start - b.start);
      
      for (const highlight of sortedHighlights) {
        const relativeStart = Math.max(0, highlight.start - lineStartPos);
        const relativeEnd = Math.min(line.length, highlight.end - lineStartPos);
        
        if (relativeStart > currentPos) {
          // Add non-highlighted text before highlight
          const beforeText = line.substring(currentPos, relativeStart);
          const beforeWidth = doc.getTextWidth(beforeText);
          segments.push({
            text: beforeText,
            startX: currentX,
            width: beforeWidth,
            isHighlighted: false
          });
          currentX += beforeWidth;
        }
        
        if (relativeEnd > relativeStart) {
          // Add highlighted text with trimmed trailing spaces for width calculation
          const highlightText = line.substring(relativeStart, relativeEnd);
          const trimmedHighlightText = highlightText.trimEnd();
          const highlightWidth = doc.getTextWidth(trimmedHighlightText);
          segments.push({
            text: highlightText, // Keep original text for rendering
            startX: currentX,
            width: highlightWidth, // Use trimmed width for background
            color: highlight.color,
            isHighlighted: true
          });
          currentX += doc.getTextWidth(highlightText); // Use full width for positioning
          currentPos = Math.max(currentPos, relativeEnd);
        }
      }
      
      // Add remaining non-highlighted text
      if (currentPos < line.length) {
        const remainingText = line.substring(currentPos);
        const remainingWidth = doc.getTextWidth(remainingText);
        segments.push({
          text: remainingText,
          startX: currentX,
          width: remainingWidth,
          isHighlighted: false
        });
      }
      
      // Render segments
      for (const segment of segments) {
        if (segment.isHighlighted && segment.color) {
          // Draw colored background with precise positioning (no extra padding)
          const [r, g, b] = hexToRgb(segment.color);
          doc.setFillColor(r, g, b);
          doc.rect(segment.startX, y - 4, segment.width, 5, 'F');
        }
        
        // Draw text with proper font settings
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(segment.text, segment.startX, y);
      }
      
    } catch (error) {
      console.error('❌ renderLineWithHighlights: Error rendering line highlights:', error);
      // Fallback to plain text with proper font settings
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(line, x, y);
    }
  }

  /**
   * Parse highlights from HTML content for visual rendering
   */
  private static parseHighlightsFromHTML(html: string): {
    text: string;
    highlights: Array<{
      start: number;
      end: number;
      category: string;
      color: string;
      id: string;
    }>;
    headings: Array<{
      start: number;
      end: number;
      level: number;
      text: string;
    }>;
  } {
    try {
      if (!html || html.trim() === '') {
        return { text: '', highlights: [], headings: [] };
      }

      console.log('🔍 parseHighlightsFromHTML: Starting HTML parsing');
      
      // Create temporary DOM to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      const highlights: Array<{
        start: number;
        end: number;
        category: string;
        color: string;
        id: string;
      }> = [];
      
      const headings: Array<{
        start: number;
        end: number;
        level: number;
        text: string;
      }> = [];
      
      let textContent = '';
      let currentPosition = 0;
      
      // Color mapping for categories
      const categoryColors = {
        red: '#ffcdd2',
        yellow: '#fff9c4', 
        green: '#c8e6c9',
        blue: '#bbdefb'
      };
      
      // List context tracking for proper numbering
      interface ListContext {
        type: 'bullet' | 'ordered';
        counter: number;
      }
      const listStack: ListContext[] = [];
      
      // Walk through the DOM and extract text + highlight positions
      const walkNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          textContent += text;
          currentPosition += text.length;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Check if this is a heading element
          if (/^H[1-6]$/.test(element.tagName)) {
            // Add line break before heading if there's existing content
            if (textContent.length > 0 && !textContent.endsWith('\n\n')) {
              const lineBreaks = textContent.endsWith('\n') ? '\n' : '\n\n';
              textContent += lineBreaks;
              currentPosition += lineBreaks.length;
            }
            
            const startPos = currentPosition;
            const headingText = element.textContent || '';
            const endPos = startPos + headingText.length;
            const level = parseInt(element.tagName.charAt(1));
            
            headings.push({
              start: startPos,
              end: endPos,
              level,
              text: headingText
            });
            
            console.log(`📝 Found heading H${level}: "${headingText}" at ${startPos}-${endPos}`);
            
            // Add heading text
            textContent += headingText;
            currentPosition += headingText.length;
            
            // Add line break after heading
            textContent += '\n\n';
            currentPosition += 2;
          }
          // Check if this is a paragraph element
          else if (element.tagName === 'P') {
            // Add line break before paragraph if there's existing content
            if (textContent.length > 0 && !textContent.endsWith('\n')) {
              textContent += '\n';
              currentPosition += 1;
            }
            
            // Walk children to process content and highlights within paragraph
            for (let i = 0; i < node.childNodes.length; i++) {
              walkNode(node.childNodes[i]);
            }
            
            // Add line break after paragraph
            textContent += '\n';
            currentPosition += 1;
          }
          // Check if this is a list item
          else if (element.tagName === 'LI') {
            // Add line break before list item if there's existing content
            if (textContent.length > 0 && !textContent.endsWith('\n')) {
              textContent += '\n';
              currentPosition += 1;
            }
            
            // Determine prefix based on current list context
            let prefix = '• '; // Default bullet
            if (listStack.length > 0) {
              const currentList = listStack[listStack.length - 1];
              if (currentList.type === 'ordered') {
                currentList.counter++;
                prefix = `${currentList.counter}. `;
              } else {
                prefix = '• ';
              }
            }
            
            textContent += prefix;
            currentPosition += prefix.length;
            
            // Process list item content inline (no extra line breaks)
            let listItemContent = '';
            let listItemPosition = 0;
            
            // Walk children to collect content and highlights within list item
            const walkListItemNode = (listNode: Node) => {
              if (listNode.nodeType === Node.TEXT_NODE) {
                const text = listNode.textContent || '';
                listItemContent += text;
                listItemPosition += text.length;
              } else if (listNode.nodeType === Node.ELEMENT_NODE) {
                const listElement = listNode as HTMLElement;
                
                // Handle highlights within list items
                if (listElement.tagName === 'SPAN' && listElement.hasAttribute('data-highlight-id')) {
                  const startPos = currentPosition + listItemPosition;
                  const highlightText = listElement.textContent || '';
                  const endPos = startPos + highlightText.length;
                  
                  const category = listElement.getAttribute('data-highlight-category') || 'red';
                  const id = listElement.getAttribute('data-highlight-id') || '';
                  const color = categoryColors[category as keyof typeof categoryColors] || categoryColors.red;
                  
                  highlights.push({
                    start: startPos,
                    end: endPos,
                    category,
                    color,
                    id
                  });
                  
                  console.log(`🎨 Found highlight in list: "${highlightText}" at ${startPos}-${endPos}, category: ${category}`);
                  
                  listItemContent += highlightText;
                  listItemPosition += highlightText.length;
                } else {
                  // Walk children for other elements
                  for (let i = 0; i < listNode.childNodes.length; i++) {
                    walkListItemNode(listNode.childNodes[i]);
                  }
                }
              }
            };
            
            // Process list item children
            for (let i = 0; i < node.childNodes.length; i++) {
              walkListItemNode(node.childNodes[i]);
            }
            
            // Add the collected content to main text
            textContent += listItemContent;
            currentPosition += listItemContent.length;
            
            // Add line break after list item
            textContent += '\n';
            currentPosition += 1;
          }
          // Check if this is a list container
          else if (element.tagName === 'UL' || element.tagName === 'OL') {
            // Add line break before list if there's existing content
            if (textContent.length > 0 && !textContent.endsWith('\n')) {
              textContent += '\n';
              currentPosition += 1;
            }
            
            // Determine list type from element or class
            const isOrderedList = element.tagName === 'OL' || 
                                 element.classList.contains('tiptap-ordered-list');
            
            // Push list context onto stack
            listStack.push({
              type: isOrderedList ? 'ordered' : 'bullet',
              counter: 0 // Will be incremented for each LI
            });
            
            // Walk children (list items)
            for (let i = 0; i < node.childNodes.length; i++) {
              walkNode(node.childNodes[i]);
            }
            
            // Pop list context from stack
            listStack.pop();
            
            // Add line break after list
            textContent += '\n';
            currentPosition += 1;
          }
          // Check if this is a table element
          else if (element.tagName === 'TABLE') {
            // Add line breaks before table if there's existing content
            if (textContent.length > 0 && !textContent.endsWith('\n\n')) {
              const lineBreaks = textContent.endsWith('\n') ? '\n' : '\n\n';
              textContent += lineBreaks;
              currentPosition += lineBreaks.length;
            }

            // Process entire table structure at once
            const tableData = this.extractTableData(element, currentPosition, highlights, categoryColors);
            
            // Add the formatted table text
            textContent += tableData.tableText;
            currentPosition += tableData.tableText.length;

            // Add line break after table
            textContent += '\n';
            currentPosition += 1;
          }
          // Check if this is a div element
          else if (element.tagName === 'DIV') {
            // Walk children to process content within div
            for (let i = 0; i < node.childNodes.length; i++) {
              walkNode(node.childNodes[i]);
            }
          }
          // Check if this is a highlight span
          else if (element.tagName === 'SPAN' && element.hasAttribute('data-highlight-id')) {
            const startPos = currentPosition;
            const highlightText = element.textContent || '';
            const endPos = startPos + highlightText.length;
            
            const category = element.getAttribute('data-highlight-category') || 'red';
            const id = element.getAttribute('data-highlight-id') || '';
            const color = categoryColors[category as keyof typeof categoryColors] || categoryColors.red;
            
            highlights.push({
              start: startPos,
              end: endPos,
              category,
              color,
              id
            });
            
            console.log(`🎨 Found highlight: "${highlightText}" at ${startPos}-${endPos}, category: ${category}, color: ${color}`);
            
            textContent += highlightText;
            currentPosition += highlightText.length;
          } else {
            // Regular element, walk children
            for (let i = 0; i < node.childNodes.length; i++) {
              walkNode(node.childNodes[i]);
            }
          }
        }
      };
      
      // Start walking from the root
      for (let i = 0; i < tempDiv.childNodes.length; i++) {
        walkNode(tempDiv.childNodes[i]);
      }
      
      console.log(`✅ parseHighlightsFromHTML: Extracted ${highlights.length} highlights and ${headings.length} headings from ${textContent.length} characters`);
      
      return {
        text: textContent,
        highlights: highlights.sort((a, b) => a.start - b.start), // Sort by position
        headings: headings.sort((a, b) => a.start - b.start) // Sort by position
      };
      
    } catch (error) {
      console.error('❌ parseHighlightsFromHTML: Error parsing HTML highlights:', error);
      // Fallback to plain text extraction
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return {
        text: tempDiv.textContent || tempDiv.innerText || '',
        highlights: [],
        headings: []
      };
    }
  }

  /**
   * Extract complete table data structure and format as markdown-style table
   */
  private static extractTableData(
    tableElement: HTMLElement, 
    currentPosition: number, 
    highlights: Array<{
      start: number;
      end: number;
      category: string;
      color: string;
      id: string;
    }>, 
    categoryColors: Record<string, string>
  ): { tableText: string } {
    interface TableCell {
      content: string;
      isHeader: boolean;
      highlights: Array<{
        start: number;
        end: number;
        category: string;
        color: string;
        id: string;
        text: string;
      }>;
    }

    interface TableRow {
      cells: TableCell[];
      isHeader: boolean;
    }

    const tableRows: TableRow[] = [];
    let position = currentPosition;

    // Walk through all table rows (TR elements)
    const rows = tableElement.querySelectorAll('tr');
    
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      const rowCells: TableCell[] = [];
      let isHeaderRow = false;

      cells.forEach((cell) => {
        const isHeader = cell.tagName === 'TH';
        if (isHeader) isHeaderRow = true;

        let cellContent = '';
        const cellHighlights: TableCell['highlights'] = [];

        // Process cell content and extract highlights
        const walkCellNode = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            cellContent += text;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            
            if (element.tagName === 'SPAN' && element.hasAttribute('data-highlight-id')) {
              const highlightText = element.textContent || '';
              const category = element.getAttribute('data-highlight-category') || 'red';
              const id = element.getAttribute('data-highlight-id') || '';
              const color = categoryColors[category as keyof typeof categoryColors] || categoryColors.red;
              
              cellHighlights.push({
                start: cellContent.length, // Position within cell
                end: cellContent.length + highlightText.length,
                category,
                color,
                id,
                text: highlightText
              });
              
              cellContent += highlightText;
            } else {
              // Walk children for other elements
              for (let i = 0; i < node.childNodes.length; i++) {
                walkCellNode(node.childNodes[i]);
              }
            }
          }
        };

        // Process all child nodes of the cell
        for (let i = 0; i < cell.childNodes.length; i++) {
          walkCellNode(cell.childNodes[i]);
        }

        rowCells.push({
          content: cellContent.trim(),
          isHeader,
          highlights: cellHighlights
        });
      });

      tableRows.push({
        cells: rowCells,
        isHeader: isHeaderRow
      });
    });

    // Generate markdown-style table
    let tableText = '';
    const maxColumns = Math.max(...tableRows.map(row => row.cells.length));

    // Calculate column widths for alignment
    const columnWidths: number[] = [];
    for (let col = 0; col < maxColumns; col++) {
      let maxWidth = 0;
      tableRows.forEach(row => {
        if (row.cells[col]) {
          maxWidth = Math.max(maxWidth, row.cells[col].content.length);
        }
      });
      columnWidths.push(Math.max(maxWidth, 8)); // Minimum width of 8
    }

    // Generate table rows
    tableRows.forEach((row, rowIndex) => {
      const paddedCells = row.cells.map((cell, colIndex) => {
        return cell.content.padEnd(columnWidths[colIndex] || 8);
      });

      // Generate row text
      const rowText = `| ${paddedCells.join(' | ')} |`;
      tableText += rowText + '\n';

      // Add highlights to global highlights array with correct positions
      row.cells.forEach((cell, colIndex) => {
        cell.highlights.forEach(cellHighlight => {
          // Calculate position in the complete table text
          const rowStart = position;
          const cellStart = rowStart + 2; // Account for "| "
          const colStart = columnWidths.slice(0, colIndex).reduce((sum, width) => sum + width + 3, 0); // 3 for " | "
          const highlightStart = cellStart + colStart + cellHighlight.start;
          const highlightEnd = highlightStart + cellHighlight.text.length;

          highlights.push({
            start: highlightStart,
            end: highlightEnd,
            category: cellHighlight.category,
            color: cellHighlight.color,
            id: cellHighlight.id
          });

          console.log(`🎨 Found highlight in table: "${cellHighlight.text}" at ${highlightStart}-${highlightEnd}, category: ${cellHighlight.category}`);
        });
      });

      position += rowText.length + 1; // +1 for newline

      // Add separator line after header row
      if (row.isHeader && rowIndex === 0) {
        const separatorCells = columnWidths.map(width => '-'.repeat(width));
        const separatorText = `|${separatorCells.map(sep => `-${sep}-`).join('|')}|`;
        tableText += separatorText + '\n';
        position += separatorText.length + 1; // +1 for newline
      }
    });

    console.log(`📊 Processed table with ${tableRows.length} rows and ${maxColumns} columns`);

    return { tableText };
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Main export function with enhanced error handling
   */
  static async exportNoteAs(noteId: string, format: ExportFormat, highlights?: Highlight[]): Promise<void> {
    try {
      console.log(`🔍 exportNoteAs: Starting export for note ${noteId} in format ${format}`);
      
      // Fetch note data from Supabase
      const note = await exportNote(noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      console.log('🔍 exportNoteAs: Note data retrieved:', {
        id: note.id,
        title: note.title,
        contentLength: note.content?.length || 0,
        contentTextLength: note.content_text?.length || 0,
        wordCount: note.word_count,
        hasHighlights: (highlights?.length || 0) > 0
      });

      // Use provided highlights or fallback to empty array
      const processedHighlights = highlights || [];
      console.log(`🔍 exportNoteAs: Using ${processedHighlights.length} highlights for export`);

      // Generate content based on format
      let content: string | Uint8Array;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'html':
          content = this.generateHTML(note, processedHighlights);
          mimeType = 'text/html';
          extension = '.html';
          break;
        case 'markdown':
        case 'md':
          content = this.generateMarkdown(note, processedHighlights);
          mimeType = 'text/markdown';
          extension = '.md';
          break;
        case 'pdf':
          const pdfDoc = this.generatePDF(note, processedHighlights);
          content = pdfDoc.output('arraybuffer');
          mimeType = 'application/pdf';
          extension = '.pdf';
          break;
        case 'text':
        default:
          content = this.generateText(note, processedHighlights);
          mimeType = 'text/plain';
          extension = '.txt';
          break;
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${extension}`;
      
      console.log(`🔍 exportNoteAs: Creating download with filename: ${filename}`);
      console.log(`🔍 exportNoteAs: Blob size: ${blob.size} bytes`);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`✅ exportNoteAs: Successfully exported note as ${format.toUpperCase()}`);
      

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
}