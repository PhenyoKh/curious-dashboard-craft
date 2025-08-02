/**
 * HTML to Text Conversion Utility
 * Handles TipTap HTML content and converts it to clean plain text
 */

export class HtmlToTextConverter {
  /**
   * Convert TipTap HTML content to plain text
   * Handles proper formatting for lists, headings, and paragraphs
   */
  static convert(html: string): string {
    if (!html || html.trim() === '') return '';
    
    // Handle common empty TipTap patterns
    const cleanHtml = html.trim();
    if (cleanHtml === '<br>' || cleanHtml === '<p></p>' || cleanHtml === '<div></div>') {
      return '';
    }
    
    try {
      // Create a temporary DOM element to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Process specific TipTap elements
      this.processLists(tempDiv);
      this.processHeadings(tempDiv);
      this.processParagraphs(tempDiv);
      this.processLineBreaks(tempDiv);
      
      // Get the text content
      let text = tempDiv.textContent || tempDiv.innerText || '';
      
      // Clean up the text
      text = this.cleanupText(text);
      
      return text;
    } catch (error) {
      console.error('Error converting HTML to text:', error);
      // Fallback: basic text extraction
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return (tempDiv.textContent || tempDiv.innerText || '').trim();
    }
  }
  
  /**
   * Process bullet and ordered lists
   */
  private static processLists(element: HTMLElement): void {
    // Handle bullet lists
    const bulletLists = element.querySelectorAll('ul.tiptap-bullet-list, ul');
    bulletLists.forEach(list => {
      const items = list.querySelectorAll('li');
      items.forEach(item => {
        item.textContent = '• ' + (item.textContent?.trim() || '');
      });
    });
    
    // Handle ordered lists
    const orderedLists = element.querySelectorAll('ol.tiptap-ordered-list, ol');
    orderedLists.forEach(list => {
      const items = list.querySelectorAll('li');
      items.forEach((item, index) => {
        item.textContent = `${index + 1}. ` + (item.textContent?.trim() || '');
      });
    });
  }
  
  /**
   * Process headings with proper formatting
   */
  private static processHeadings(element: HTMLElement): void {
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      const text = heading.textContent?.trim() || '';
      const level = parseInt(heading.tagName.charAt(1));
      
      // Add spacing and clean formatting for headings
      switch (level) {
        case 1:
          heading.textContent = `\n\n${text.toUpperCase()}\n\n`;
          break;
        case 2:
          heading.textContent = `\n\n${text}\n\n`;
          break;
        default:
          heading.textContent = `\n\n${text}\n`;
      }
    });
  }
  
  /**
   * Process paragraphs with proper spacing
   */
  private static processParagraphs(element: HTMLElement): void {
    const paragraphs = element.querySelectorAll('p');
    paragraphs.forEach(p => {
      const text = p.textContent?.trim() || '';
      if (text) {
        p.textContent = text + '\n\n';
      }
    });
  }
  
  /**
   * Handle line breaks
   */
  private static processLineBreaks(element: HTMLElement): void {
    const breaks = element.querySelectorAll('br');
    breaks.forEach(br => {
      br.replaceWith(document.createTextNode('\n'));
    });
  }
  
  /**
   * Clean up the final text output
   */
  private static cleanupText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/[ \t]+/g, ' ')
      // Normalize line breaks (max 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim();
  }
  
  /**
   * Get word count from HTML content
   */
  static getWordCount(html: string): number {
    const text = this.convert(html);
    if (!text.trim()) return 0;
    
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }
  
  /**
   * Get character count from HTML content (excluding HTML tags)
   */
  static getCharacterCount(html: string): number {
    const text = this.convert(html);
    return text.length;
  }
}

// Export convenience functions
export const htmlToText = (html: string): string => HtmlToTextConverter.convert(html);
export const getWordCountFromHtml = (html: string): number => HtmlToTextConverter.getWordCount(html);
export const getCharacterCountFromHtml = (html: string): number => HtmlToTextConverter.getCharacterCount(html);