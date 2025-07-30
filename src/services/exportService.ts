import { exportNote } from './supabaseService';
import { ExportFormatters } from '@/utils/exportFormatters';
import { Highlight } from '@/types/highlight';

export type ExportFormat = 'text' | 'html' | 'markdown' | 'md';

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
   * Convert HTML content to plain text
   */
  private static htmlToText(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  /**
   * Parse highlights from database JSON string
   */
  private static parseHighlights(highlightsJson: any): Highlight[] {
    try {
      if (typeof highlightsJson === 'string') {
        return JSON.parse(highlightsJson) || [];
      }
      return highlightsJson || [];
    } catch (error) {
      console.error('Error parsing highlights:', error);
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
    
    // Add content (convert HTML to text - basic conversion)
    const contentText = this.htmlToText(note.content);
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
    
    // Add content
    const contentText = this.htmlToText(note.content);
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
   * Main export function
   */
  static async exportNoteAs(noteId: string, format: ExportFormat): Promise<void> {
    try {
      // Fetch note data from Supabase
      const note = await exportNote(noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      // Parse highlights
      const highlights = this.parseHighlights(note.highlights);

      // Generate content based on format
      let content: string;
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
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
}