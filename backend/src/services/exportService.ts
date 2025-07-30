import { Note } from '@/types';
import { htmlToText } from '@/utils/textProcessor';

export interface ExportedNote extends Note {
  highlights?: HighlightData[];
}

export interface HighlightData {
  id: string;
  category: 'red' | 'yellow' | 'green' | 'blue';
  text: string;
  number: number;
  commentary?: string;
}

export interface HighlightCategories {
  red: { name: 'Key Definition'; color: '#ffcdd2' };
  yellow: { name: 'Key Principle'; color: '#fff9c4' };
  green: { name: 'Example'; color: '#c8e6c9' };
  blue: { name: 'Review Later'; color: '#bbdefb' };
}

export class ExportService {
  private static highlightCategories: HighlightCategories = {
    red: { name: 'Key Definition', color: '#ffcdd2' },
    yellow: { name: 'Key Principle', color: '#fff9c4' },
    green: { name: 'Example', color: '#c8e6c9' },
    blue: { name: 'Review Later', color: '#bbdefb' }
  };

  /**
   * Export note as HTML with formatted highlights
   */
  static exportAsHTML(note: ExportedNote): string {
    const highlights = note.highlights || [];
    const categorizedHighlights = this.categorizeHighlights(highlights);
    
    let html = `
<!DOCTYPE html>
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

      Object.entries(categorizedHighlights).forEach(([category, categoryHighlights]) => {
        if (categoryHighlights.length > 0) {
          const categoryInfo = this.highlightCategories[category as keyof HighlightCategories];
          const emoji = this.getCategoryEmoji(category as keyof HighlightCategories);
          
          html += `
        <div class="highlight-category">
            <h3 class="category-title">
                <span class="category-icon" style="background-color: ${categoryInfo.color};"></span>
                ${emoji} ${categoryInfo.name}
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

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Export note as Markdown with formatted highlights
   */
  static exportAsMarkdown(note: ExportedNote): string {
    const highlights = note.highlights || [];
    const categorizedHighlights = this.categorizeHighlights(highlights);
    
    let markdown = `# ${note.title}\n\n`;
    
    // Add metadata
    markdown += `**Created:** ${new Date(note.created_at).toLocaleDateString()}  \n`;
    markdown += `**Modified:** ${new Date(note.modified_at).toLocaleDateString()}  \n`;
    markdown += `**Words:** ${note.word_count}\n\n`;
    markdown += `---\n\n`;
    
    // Add content (convert HTML to Markdown - basic conversion)
    const contentText = htmlToText(note.content);
    markdown += `${contentText}\n\n`;
    
    if (highlights.length > 0) {
      markdown += `---\n\n## Highlights & Commentary\n\n`;
      
      Object.entries(categorizedHighlights).forEach(([category, categoryHighlights]) => {
        if (categoryHighlights.length > 0) {
          const categoryInfo = this.highlightCategories[category as keyof HighlightCategories];
          const emoji = this.getCategoryEmoji(category as keyof HighlightCategories);
          
          markdown += `### ${emoji} ${categoryInfo.name}\n\n`;
          
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
   * Export note as plain text with formatted highlights
   */
  static exportAsText(note: ExportedNote): string {
    const highlights = note.highlights || [];
    const categorizedHighlights = this.categorizeHighlights(highlights);
    
    let text = `${note.title}\n`;
    text += `${'='.repeat(note.title.length)}\n\n`;
    
    // Add metadata
    text += `Created: ${new Date(note.created_at).toLocaleDateString()}\n`;
    text += `Modified: ${new Date(note.modified_at).toLocaleDateString()}\n`;
    text += `Words: ${note.word_count}\n\n`;
    text += `${'-'.repeat(50)}\n\n`;
    
    // Add content
    const contentText = htmlToText(note.content);
    text += `${contentText}\n\n`;
    
    if (highlights.length > 0) {
      text += `${'-'.repeat(50)}\n`;
      text += `HIGHLIGHTS & COMMENTARY\n`;
      text += `${'-'.repeat(50)}\n\n`;
      
      Object.entries(categorizedHighlights).forEach(([category, categoryHighlights]) => {
        if (categoryHighlights.length > 0) {
          const categoryInfo = this.highlightCategories[category as keyof HighlightCategories];
          
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
   * Categorize highlights by their category
   */
  private static categorizeHighlights(highlights: HighlightData[]): Record<string, HighlightData[]> {
    const categorized: Record<string, HighlightData[]> = {
      red: [],
      yellow: [],
      green: [],
      blue: []
    };
    
    highlights.forEach(highlight => {
      if (categorized[highlight.category]) {
        categorized[highlight.category].push(highlight);
      }
    });
    
    // Sort by number within each category
    Object.keys(categorized).forEach(category => {
      categorized[category].sort((a, b) => a.number - b.number);
    });
    
    return categorized;
  }

  /**
   * Get emoji for highlight category
   */
  private static getCategoryEmoji(category: keyof HighlightCategories): string {
    const emojis = {
      red: '🔴',
      yellow: '🟡',
      green: '🟢',
      blue: '🔵'
    };
    return emojis[category];
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
   * Get content type for export format
   */
  static getContentType(format: string): string {
    switch (format) {
      case 'html':
        return 'text/html';
      case 'markdown':
      case 'md':
        return 'text/markdown';
      case 'text':
      case 'txt':
        return 'text/plain';
      default:
        return 'text/plain';
    }
  }

  /**
   * Get file extension for export format
   */
  static getFileExtension(format: string): string {
    switch (format) {
      case 'html':
        return '.html';
      case 'markdown':
      case 'md':
        return '.md';
      case 'text':
      case 'txt':
        return '.txt';
      default:
        return '.txt';
    }
  }
}