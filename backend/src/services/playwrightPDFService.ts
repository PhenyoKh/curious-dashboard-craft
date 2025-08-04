import { chromium, Browser, Page } from 'playwright';
import { ExportedNote, HighlightData } from './exportService';

export interface PlaywrightPDFOptions {
  format?: 'A4' | 'Letter';
  includeHighlights?: boolean;
  includeMetadata?: boolean;
  customCSS?: string;
}

export class PlaywrightPDFService {
  private static browser: Browser | null = null;
  private static readonly TIMEOUT = 30000; // 30 seconds

  /**
   * Initialize browser instance (reused across requests for performance)
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080'
          ]
        });
      } catch (error) {
        console.error('Failed to launch browser:', error);
        throw new Error('PDF generation service unavailable');
      }
    }
    return this.browser;
  }

  /**
   * Close browser instance (for cleanup)
   */
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.browser = null;
    }
  }

  /**
   * Generate PDF from note content using Playwright
   */
  static async generatePDF(
    note: ExportedNote,
    options: PlaywrightPDFOptions = {}
  ): Promise<Buffer> {
    let page: Page | null = null;
    
    try {
      const browser = await this.getBrowser();
      const context = await browser.newContext({
        viewport: { width: 1200, height: 800 },
        deviceScaleFactor: 1,
        screen: { width: 1200, height: 800 }
      });
      
      page = await context.newPage();
      
      // Set timeout for the page
      page.setDefaultTimeout(this.TIMEOUT);
      
      // Generate full HTML with comprehensive styling
      const fullHtml = this.generateFullHtml(note, options);
      
      // Set content and wait for it to be ready
      await page.setContent(fullHtml, { 
        waitUntil: 'networkidle',
        timeout: this.TIMEOUT 
      });
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      // Wait for fonts to load
      await page.evaluate(() => (globalThis as any).document.fonts.ready);
      
      // Generate PDF
      const pdfOptions = {
        format: options.format || 'A4' as const,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { 
          top: '1cm', 
          bottom: '1cm', 
          left: '1cm', 
          right: '1cm' 
        },
        timeout: this.TIMEOUT
      };
      
      const pdfBuffer = await page.pdf(pdfOptions);
      
      // Close context
      await context.close();
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error('Failed to close page:', closeError);
        }
      }
    }
  }

  /**
   * Generate complete HTML document with TipTap formatting preservation
   */
  private static generateFullHtml(
    note: ExportedNote, 
    options: PlaywrightPDFOptions
  ): string {
    const highlights = note.highlights || [];
    const customCSS = options.customCSS || '';
    
    // Preprocess content to clean up TipTap HTML
    const processedContent = this.preprocessTipTapContent(note.content);
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(note.title)}</title>
  <style>
    ${this.getTipTapCSS()}
    ${customCSS}
  </style>
</head>
<body>
  <div class="document-container">
    ${options.includeMetadata !== false ? this.generateMetadataSection(note) : ''}
    <div class="note-content">
      ${processedContent}
    </div>
    ${options.includeHighlights !== false && highlights.length > 0 ? this.generateHighlightsSection(highlights) : ''}
  </div>
</body>
</html>`;
  }

  /**
   * Comprehensive CSS for TipTap formatting preservation
   */
  private static getTipTapCSS(): string {
    return `
    /* Reset and base styles */
    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }

    body, html {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
    }

    .document-container {
      max-width: 100%;
      margin: 0;
      padding: 0;
    }

    /* Typography */
    .ProseMirror, .note-content {
      font-family: inherit;
      line-height: 1.6;
      color: #333;
    }

    h1, h2, h3, h4, h5, h6 {
      font-weight: bold;
      margin: 1.5em 0 0.5em 0;
      line-height: 1.2;
      page-break-after: avoid;
    }

    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; } 
    h3 { font-size: 1.17em; }
    h4 { font-size: 1em; }
    h5 { font-size: 0.83em; }
    h6 { font-size: 0.67em; }

    p {
      margin: 0.5em 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    strong, b { font-weight: bold !important; }
    em, i { font-style: italic !important; }
    u { text-decoration: underline !important; }
    s, strike { text-decoration: line-through !important; }

    /* Lists */
    ul, ol {
      list-style-position: inside;
      margin: 1em 0;
      padding-left: 1.5em;
    }

    ul {
      list-style-type: disc;
    }

    ol {
      list-style-type: decimal;
    }

    li {
      margin: 0.25em 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Tables */
    table {
      border-collapse: collapse !important;
      width: 100% !important;
      table-layout: auto !important;
      margin: 1em 0;
      page-break-inside: auto;
      border: 1px solid #ddd;
    }

    th, td {
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
      padding: 8px 12px !important;
      border: 1px solid #ddd !important;
      vertical-align: top !important;
      text-align: left;
    }

    th {
      background-color: #f8f9fa !important;
      font-weight: bold !important;
    }

    /* Remove empty table elements */
    tr:empty { display: none !important; }
    td:empty, th:empty { 
      border: none !important; 
      padding: 0 !important; 
      width: 0 !important; 
      height: 0 !important; 
    }

    /* Highlights */
    mark[data-highlight-red] {
      background-color: #ffcdd2 !important;
      color: inherit !important;
    }

    mark[data-highlight-yellow] {
      background-color: #fff9c4 !important;
      color: inherit !important;
    }

    mark[data-highlight-green] {
      background-color: #c8e6c9 !important;
      color: inherit !important;
    }

    mark[data-highlight-blue] {
      background-color: #bbdefb !important;
      color: inherit !important;
    }

    /* Blockquotes */
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding: 0.5em 1em;
      background: #f9f9f9;
      font-style: italic;
    }

    /* Code */
    code {
      background: #f1f1f1;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }

    pre {
      background: #f5f5f5;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Metadata section */
    .metadata-section {
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

    /* Highlights section */
    .highlights-section {
      page-break-before: always;
      border-top: 2px solid #e5e7eb;
      padding-top: 2rem;
      margin-top: 2rem;
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
      page-break-inside: avoid;
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

    /* Print styles */
    @media print {
      body { 
        margin: 0 !important; 
        font-size: 12pt;
      }
      
      table { 
        page-break-inside: avoid !important; 
      }
      
      tr { 
        page-break-inside: avoid !important; 
        page-break-after: auto !important; 
      }
      
      h1, h2, h3, h4, h5, h6 { 
        page-break-after: avoid !important; 
      }

      .highlight-item {
        page-break-inside: avoid !important;
      }
    }

    /* Page breaks */
    .page-break {
      page-break-before: always;
    }
    `;
  }

  /**
   * Preprocess TipTap content to clean up HTML
   */
  private static preprocessTipTapContent(htmlContent: string): string {
    return htmlContent
      // Remove empty table rows and cells
      .replace(/<tr>\s*<\/tr>/g, '')
      .replace(/<td>\s*<\/td>/g, '')
      .replace(/<th>\s*<\/th>/g, '')
      // Add tbody wrapper if missing
      .replace(/(<table[^>]*>)(?![\s\S]*<tbody>)/g, '$1<tbody>')
      .replace(/<\/table>/g, '</tbody></table>')
      // Clean up extra whitespace
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Generate metadata section HTML
   */
  private static generateMetadataSection(note: ExportedNote): string {
    return `
    <div class="metadata-section">
      <h1 class="note-title">${this.escapeHtml(note.title)}</h1>
      <div class="note-meta">
        Created: ${new Date(note.created_at).toLocaleDateString()} | 
        Modified: ${new Date(note.modified_at).toLocaleDateString()} | 
        Words: ${note.word_count}
      </div>
    </div>`;
  }

  /**
   * Generate highlights section HTML
   */
  private static generateHighlightsSection(highlights: HighlightData[]): string {
    const categorizedHighlights = this.categorizeHighlights(highlights);
    
    let html = `
    <div class="highlights-section page-break">
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
    return html;
  }

  /**
   * Categorize highlights by color
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
}