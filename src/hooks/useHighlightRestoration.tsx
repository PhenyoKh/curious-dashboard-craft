import { useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Highlight, HighlightCategories } from '@/types/highlight';
import { 
  isLegacyHighlightId, 
  parseLegacyHighlightId, 
  generateHighlightId,
  debugHighlights 
} from '@/utils/highlightUtils';

export const useHighlightRestoration = (
  editor: Editor | null,
  setHighlights: (highlights: Highlight[]) => void,
  categories: HighlightCategories,
  resequenceCategory?: (category: keyof HighlightCategories) => void
) => {
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    console.log('🔄 useHighlightRestoration useEffect triggered', {
      hasEditor: !!editor,
      hasRestored: hasRestoredRef.current
    });
    
    if (!editor || hasRestoredRef.current) return;

    const extractHighlightsFromDOM = () => {
      console.log('🔍 Attempting DOM-based highlight extraction');
      const highlightsMap = new Map<string, Highlight>();
      
      try {
        const editorElement = editor.view.dom;
        console.log('🔍 Editor DOM element:', editorElement);
        console.log('🔍 Editor innerHTML preview:', editorElement.innerHTML.substring(0, 500));
        
        const highlightElements = editorElement.querySelectorAll('span[data-highlight-id]');
        
        console.log(`🔍 Found ${highlightElements.length} highlight elements in DOM`);
        
        // Also try alternative selectors to debug
        const allSpans = editorElement.querySelectorAll('span');
        console.log(`🔍 Total spans in DOM: ${allSpans.length}`);
        
        const highlightsByClass = editorElement.querySelectorAll('.numbered-highlight');
        console.log(`🔍 Spans with numbered-highlight class: ${highlightsByClass.length}`);
        
        // Group elements by highlight ID to handle highlights split across multiple DOM elements
        const elementsByHighlight = new Map<string, HTMLElement[]>();
        
        highlightElements.forEach((element, index) => {
          const id = element.getAttribute('data-highlight-id');
          const category = element.getAttribute('data-highlight-category');
          const number = element.getAttribute('data-highlight-number');
          
          console.log(`🏷️ DOM highlight ${index}:`, { id, category, number, text: element.textContent });
          
          if (id && category && category in categories) {
            if (!elementsByHighlight.has(id)) {
              elementsByHighlight.set(id, []);
            }
            elementsByHighlight.get(id)!.push(element as HTMLElement);
          }
        });
        
        // Create highlights by combining all elements for each ID
        elementsByHighlight.forEach((elements, id) => {
          if (highlightsMap.has(id)) return;
          
          const firstElement = elements[0];
          const category = firstElement.getAttribute('data-highlight-category');
          const number = firstElement.getAttribute('data-highlight-number');
          
          // Combine text from all elements with this highlight ID
          const combinedText = elements
            .map(el => el.textContent || '')
            .join('')
            .trim();
          
          if (combinedText && category) {
            const highlight = {
              id,
              category: category as keyof HighlightCategories,
              number: Number(number) || 1,
              text: combinedText,
              commentary: '',
              isExpanded: false,
            };
            highlightsMap.set(id, highlight);
            console.log(`➕ Added DOM highlight (${elements.length} elements):`, highlight);
          }
        });
        
        return Array.from(highlightsMap.values());
      } catch (error) {
        console.error('❌ Error in DOM extraction:', error);
        return [];
      }
    };

    const extractHighlightsFromState = () => {
      const doc = editor.state.doc;
      const highlightsMap = new Map<string, Highlight>();

      console.log('🔄 Starting highlight extraction from document');
      console.log('📄 Document size:', doc.content.size);

      // Use TipTap's native approach to find all highlight marks and their ranges
      const highlightRanges = new Map<string, {
        category: string;
        number: number;
        ranges: Array<{from: number, to: number}>;
      }>();

      // Step through the document and find all highlight marks with their positions
      doc.descendants((node, pos) => {
        if (node.marks) {
          node.marks.forEach(mark => {
            if (mark.type.name === 'numberedHighlight') {
              const { id, category, number } = mark.attrs;
              
              if (id && category && category in categories) {
                if (!highlightRanges.has(id)) {
                  highlightRanges.set(id, {
                    category,
                    number: Number(number) || 1,
                    ranges: []
                  });
                }
                
                // Store the exact range of this text node
                const from = pos;
                const to = pos + node.nodeSize;
                
                highlightRanges.get(id)!.ranges.push({ from, to });
                
                console.log(`🏷️ Found highlight mark:`, { 
                  id, 
                  category, 
                  number,
                  from,
                  to,
                  nodeText: node.textContent 
                });
              }
            }
          });
        }
      });

      console.log('📊 Collected highlight ranges:', Array.from(highlightRanges.entries()).map(([id, data]) => ({
        id,
        category: data.category,
        number: data.number,
        rangeCount: data.ranges.length,
        ranges: data.ranges
      })));

      // Process each highlight by extracting text from its ranges
      highlightRanges.forEach((data, id) => {
        // Sort ranges by position to ensure correct text order
        const sortedRanges = data.ranges.sort((a, b) => a.from - b.from);
        
        // Merge overlapping or adjacent ranges
        const mergedRanges: Array<{from: number, to: number}> = [];
        for (const range of sortedRanges) {
          const lastRange = mergedRanges[mergedRanges.length - 1];
          if (lastRange && range.from <= lastRange.to) {
            // Extend the last range
            lastRange.to = Math.max(lastRange.to, range.to);
          } else {
            // Add new range
            mergedRanges.push({ ...range });
          }
        }
        
        // Extract text from merged ranges
        const textParts = mergedRanges.map(range => {
          const text = doc.textBetween(range.from, range.to);
          console.log(`📝 Extracting text from range ${range.from}-${range.to}:`, text);
          return text;
        });
        
        const fullText = textParts.join('');
        
        if (fullText.trim()) {
          // Handle legacy and new ID formats
          const finalId = id;
          let finalNumber = data.number;
          
          if (isLegacyHighlightId(id)) {
            console.log(`🔄 Found legacy highlight ID: ${id}`);
            const parsed = parseLegacyHighlightId(id);
            if (parsed) {
              // For legacy IDs, keep the original ID but note it's legacy
              finalNumber = parsed.number;
              console.log(`📝 Migrating legacy highlight: ${id} -> keeping ID, number: ${finalNumber}`);
            }
          } else {
            console.log(`✨ Found new format highlight ID: ${id}`);
          }

          const highlight = {
            id: finalId,
            category: data.category as keyof HighlightCategories,
            number: finalNumber,
            text: fullText,
            commentary: '',
            isExpanded: false,
          };

          console.log(`➕ Creating highlight:`, {
            id: finalId,
            category: data.category,
            number: finalNumber,
            textLength: fullText.length,
            textPreview: fullText.substring(0, 50) + (fullText.length > 50 ? '...' : ''),
            rangeCount: mergedRanges.length,
            isLegacy: isLegacyHighlightId(finalId)
          });

          highlightsMap.set(finalId, highlight);
        } else {
          console.log(`⚠️ Skipping highlight ${id} - no text content`);
        }
      });

      const restoredHighlights = Array.from(highlightsMap.values());
      
      restoredHighlights.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.number - b.number;
      });

      console.log('🔄 Restored highlights from editor state:', restoredHighlights.length);
      debugHighlights(restoredHighlights, 'Restoration from editor state');
      
      // If we didn't find any highlights, try a DOM-based approach as fallback
      if (restoredHighlights.length === 0) {
        console.log('⚠️ No highlights found via ProseMirror doc, trying DOM approach...');
        
        // Give the DOM more time to render, then try extraction with retries
        const tryDOMExtraction = (attempt = 1, maxAttempts = 3) => {
          console.log(`🔄 DOM extraction attempt ${attempt}/${maxAttempts}`);
          const domHighlights = extractHighlightsFromDOM();
          if (domHighlights.length > 0) {
            console.log('✅ Found highlights via DOM approach');
            debugHighlights(domHighlights, 'DOM extraction');
            console.log('🚫 Setting highlights during restoration (should not trigger save)');
            setHighlights(domHighlights);
            
            // Resequence categories to ensure proper numbering
            if (resequenceCategory && domHighlights.length > 0) {
              const categories = new Set(domHighlights.map(h => h.category));
              setTimeout(() => {
                categories.forEach(category => {
                  resequenceCategory(category as keyof HighlightCategories);
                });
              }, 100);
            }
            
            hasRestoredRef.current = true;
          } else if (attempt < maxAttempts) {
            console.log(`⏳ DOM extraction attempt ${attempt} failed, retrying in ${attempt * 200}ms...`);
            setTimeout(() => tryDOMExtraction(attempt + 1, maxAttempts), attempt * 200);
          } else {
            console.log('❌ No highlights found via DOM approach after all attempts');
            // Still mark as restored to prevent infinite retries
            hasRestoredRef.current = true;
          }
        };
        
        setTimeout(() => tryDOMExtraction(), 100);
        return;
      }
      
      console.log('🚫 Setting highlights during restoration (should not trigger save)');
      setHighlights(restoredHighlights);
      
      // Resequence categories to ensure proper numbering after restoration
      if (resequenceCategory && restoredHighlights.length > 0) {
        console.log('🔄 Resequencing categories after restoration');
        const categories = new Set(restoredHighlights.map(h => h.category));
        setTimeout(() => {
          categories.forEach(category => {
            resequenceCategory(category as keyof HighlightCategories);
          });
        }, 100);
      }
      
      hasRestoredRef.current = true;
    };

    const checkAndExtract = () => {
      console.log('🔄 checkAndExtract called');
      console.log('🔍 Editor state:', {
        hasEditor: !!editor,
        docSize: editor?.state.doc.content.size,
        hasRestoredRef: hasRestoredRef.current
      });
      
      if (editor.state.doc.content.size > 0) {
        console.log('✅ Document has content, extracting highlights...');
        extractHighlightsFromState();
      } else {
        console.log('⏳ Document empty, marking as restored to prevent infinite loops');
        // Mark as restored even if document is empty to prevent infinite loops
        hasRestoredRef.current = true;
        setHighlights([]);
      }
    };

    // Give more time for complex HTML to render, especially with many highlights
    setTimeout(checkAndExtract, 500);
  }, [editor, setHighlights, categories, resequenceCategory]);

  useEffect(() => {
    console.log('🔄 Resetting hasRestoredRef when editor changes');
    hasRestoredRef.current = false;
  }, [editor]);
};