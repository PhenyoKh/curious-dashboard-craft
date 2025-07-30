import { Highlight } from '@/types/highlight';

export interface ExportData {
  title: string;
  content: string;
  highlights: Highlight[];
  createdAt: Date;
  modifiedAt: Date;
  wordCount: number;
}

export interface HighlightCategories {
  red: { name: 'Key Definition'; color: '#ffcdd2' };
  yellow: { name: 'Key Principle'; color: '#fff9c4' };
  green: { name: 'Example'; color: '#c8e6c9' };
  blue: { name: 'Review Later'; color: '#bbdefb' };
}

export class ExportFormatters {
  private static highlightCategories: HighlightCategories = {
    red: { name: 'Key Definition', color: '#ffcdd2' },
    yellow: { name: 'Key Principle', color: '#fff9c4' },
    green: { name: 'Example', color: '#c8e6c9' },
    blue: { name: 'Review Later', color: '#bbdefb' }
  };

  /**
   * Generate a filename for export based on title and format
   */
  static generateFilename(title: string, format: string): string {
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note';
    const extension = this.getFileExtension(format);
    return `${safeTitle}${extension}`;
  }

  /**
   * Get file extension for a given format
   */
  static getFileExtension(format: string): string {
    switch (format.toLowerCase()) {
      case 'html':
        return '.html';
      case 'markdown':
      case 'md':
        return '.md';
      case 'json':
        return '.json';
      case 'text':
      case 'txt':
      default:
        return '.txt';
    }
  }

  /**
   * Get MIME type for a given format
   */
  static getMimeType(format: string): string {
    switch (format.toLowerCase()) {
      case 'html':
        return 'text/html';
      case 'markdown':
      case 'md':
        return 'text/markdown';
      case 'json':
        return 'application/json';
      case 'text':
      case 'txt':
      default:
        return 'text/plain';
    }
  }

  /**
   * Categorize highlights by their category
   */
  static categorizeHighlights(highlights: Highlight[]): Record<string, Highlight[]> {
    const categorized: Record<string, Highlight[]> = {
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
   * Get category emoji for display
   */
  static getCategoryEmoji(category: keyof HighlightCategories): string {
    const emojis = {
      red: '🔴',
      yellow: '🟡',
      green: '🟢',
      blue: '🔵'
    };
    return emojis[category] || '';
  }

  /**
   * Convert HTML content to plain text (basic implementation)
   */
  static htmlToText(html: string): string {
    // Create a temporary div element to extract text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  /**
   * Generate highlights summary text
   */
  static generateHighlightsSummary(highlights: Highlight[]): string {
    if (highlights.length === 0) return 'No highlights';
    
    const categoryCounts = {
      red: highlights.filter(h => h.category === 'red').length,
      yellow: highlights.filter(h => h.category === 'yellow').length,
      green: highlights.filter(h => h.category === 'green').length,
      blue: highlights.filter(h => h.category === 'blue').length
    };

    const categoryNames = {
      red: 'Key Definitions',
      yellow: 'Key Principles', 
      green: 'Examples',
      blue: 'Review Later'
    };

    return Object.entries(categoryCounts)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => `${count} ${categoryNames[category as keyof typeof categoryNames]}`)
      .join(', ');
  }

  /**
   * Generate export preview text (for display in modals/UI)
   */
  static generatePreviewText(data: ExportData, format: string): string {
    const categorizedHighlights = this.categorizeHighlights(data.highlights);
    
    switch (format.toLowerCase()) {
      case 'html':
        return this.generateHTMLPreview(data, categorizedHighlights);
      case 'markdown':
      case 'md':
        return this.generateMarkdownPreview(data, categorizedHighlights);
      case 'text':
      case 'txt':
      default:
        return this.generateTextPreview(data, categorizedHighlights);
    }
  }

  /**
   * Generate HTML preview (simplified)
   */
  private static generateHTMLPreview(data: ExportData, categorizedHighlights: Record<string, Highlight[]>): string {
    let preview = `<h1>${data.title}</h1>\n`;
    preview += `<p><em>Created: ${data.createdAt.toLocaleDateString()}</em></p>\n`;
    preview += `<div>${data.content.substring(0, 200)}...</div>\n`;
    
    if (data.highlights.length > 0) {
      preview += `<h2>Highlights</h2>\n`;
      Object.entries(categorizedHighlights).forEach(([category, highlights]) => {
        if (highlights.length > 0) {
          const categoryInfo = this.highlightCategories[category as keyof HighlightCategories];
          preview += `<h3>${categoryInfo.name} (${highlights.length})</h3>\n`;
        }
      });
    }
    
    return preview;
  }

  /**
   * Generate Markdown preview
   */
  private static generateMarkdownPreview(data: ExportData, categorizedHighlights: Record<string, Highlight[]>): string {
    let preview = `# ${data.title}\n\n`;
    preview += `*Created: ${data.createdAt.toLocaleDateString()}*\n\n`;
    preview += `${this.htmlToText(data.content).substring(0, 200)}...\n\n`;
    
    if (data.highlights.length > 0) {
      preview += `## Highlights\n\n`;
      Object.entries(categorizedHighlights).forEach(([category, highlights]) => {
        if (highlights.length > 0) {
          const categoryInfo = this.highlightCategories[category as keyof HighlightCategories];
          const emoji = this.getCategoryEmoji(category as keyof HighlightCategories);
          preview += `### ${emoji} ${categoryInfo.name} (${highlights.length})\n\n`;
        }
      });
    }
    
    return preview;
  }

  /**
   * Generate plain text preview
   */
  private static generateTextPreview(data: ExportData, categorizedHighlights: Record<string, Highlight[]>): string {
    let preview = `${data.title}\n`;
    preview += `${'='.repeat(data.title.length)}\n\n`;
    preview += `Created: ${data.createdAt.toLocaleDateString()}\n\n`;
    preview += `${this.htmlToText(data.content).substring(0, 200)}...\n\n`;
    
    if (data.highlights.length > 0) {
      preview += `HIGHLIGHTS\n`;
      preview += `${'-'.repeat(10)}\n\n`;
      Object.entries(categorizedHighlights).forEach(([category, highlights]) => {
        if (highlights.length > 0) {
          const categoryInfo = this.highlightCategories[category as keyof HighlightCategories];
          preview += `${categoryInfo.name.toUpperCase()}: ${highlights.length} items\n`;
        }
      });
    }
    
    return preview;
  }

  /**
   * Validate export data
   */
  static validateExportData(data: Partial<ExportData>): string[] {
    const errors: string[] = [];
    
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (!data.content) {
      errors.push('Content is required');
    }
    
    if (!data.highlights) {
      errors.push('Highlights data is missing');
    }
    
    return errors;
  }

  /**
   * Create a downloadable blob for client-side export
   */
  static createDownloadBlob(content: string, format: string): Blob {
    const mimeType = this.getMimeType(format);
    return new Blob([content], { type: mimeType });
  }

  /**
   * Trigger download in the browser
   */
  static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}