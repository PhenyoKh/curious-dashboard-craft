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
    
    let text = `${note.title}\n`;
    text += `${'='.repeat(note.title.length)}\n\n`;
    
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

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(note.title, maxWidth);
    doc.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 10 + 5;

    // Add underline
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // Metadata section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const metadata = [
      `Subject: ${note.subjects?.label || 'No Subject'}`,
      `Created: ${new Date(note.created_at).toLocaleDateString()}`,
      `Modified: ${new Date(note.modified_at).toLocaleDateString()}`,
      `Words: ${note.word_count}`
    ];
    
    metadata.forEach(line => {
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // Content section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Use content_text if available (more reliable), otherwise convert HTML
    let contentText = '';
    if (note.content_text && note.content_text.trim()) {
      console.log('🔍 generatePDF: Using content_text field');
      contentText = note.content_text;
    } else if (note.content && note.content.trim()) {
      console.log('🔍 generatePDF: Converting HTML content to text');
      contentText = this.htmlToText(note.content);
    } else {
      console.warn('⚠️ generatePDF: No content available for PDF generation');
      contentText = '(No content available)';
    }
    
    console.log(`🔍 generatePDF: Content text length: ${contentText.length}`);
    const contentLines = doc.splitTextToSize(contentText, maxWidth);
    
    // Check if we need a new page
    if (yPosition + (contentLines.length * 6) > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.text(contentLines, margin, yPosition);
    yPosition += contentLines.length * 6 + 20;

    // Highlights section
    if (highlights.length > 0) {
      // Check if we need a new page for highlights
      if (yPosition + 50 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

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
  static async exportNoteAs(noteId: string, format: ExportFormat): Promise<void> {
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
        hasHighlights: !!note.highlights
      });

      // Parse highlights
      const highlights = this.parseHighlights(note.highlights);
      console.log(`🔍 exportNoteAs: Parsed ${highlights.length} highlights`);

      // Generate content based on format
      let content: string | Uint8Array;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'html':
          content = this.generateHTML(note, highlights);
          mimeType = 'text/html';
          extension = '.html';
          break;
        case 'markdown':
        case 'md':
          content = this.generateMarkdown(note, highlights);
          mimeType = 'text/markdown';
          extension = '.md';
          break;
        case 'pdf':
          const pdfDoc = this.generatePDF(note, highlights);
          content = pdfDoc.output('arraybuffer');
          mimeType = 'application/pdf';
          extension = '.pdf';
          break;
        case 'text':
        default:
          content = this.generateText(note, highlights);
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