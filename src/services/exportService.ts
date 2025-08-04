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
      
      // Split text into lines that fit the PDF width
      const lines = doc.splitTextToSize(text, maxWidth);
      
      // Track character position for mapping highlights to lines
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
          // Ensure font is set correctly for normal text (not bold from previous headings)
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
        // Add extra character for line breaks (except last line)
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
            
            // Add bullet or number prefix (simplified approach)
            textContent += '• ';
            currentPosition += 2;
            
            // Walk children to process content and highlights within list item
            for (let i = 0; i < node.childNodes.length; i++) {
              walkNode(node.childNodes[i]);
            }
            
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
            
            // Walk children (list items)
            for (let i = 0; i < node.childNodes.length; i++) {
              walkNode(node.childNodes[i]);
            }
            
            // Add line break after list
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