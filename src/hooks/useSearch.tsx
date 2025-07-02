
import { useState, useCallback, useRef } from 'react';

interface SearchResult {
  element: HTMLElement;
  textNode: Text;
  startOffset: number;
  endOffset: number;
  index: number;
}

interface UseSearchProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

export const useSearch = ({ editorRef }: UseSearchProps) => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const highlightClassName = 'search-highlight';
  const activeHighlightClassName = 'search-highlight-active';

  const clearHighlights = useCallback(() => {
    if (!editorRef.current) return;
    
    const highlights = editorRef.current.querySelectorAll(`.${highlightClassName}, .${activeHighlightClassName}`);
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
    
    setSearchResults([]);
    setCurrentResultIndex(-1);
    setTotalResults(0);
  }, [editorRef]);

  const highlightText = useCallback((textNode: Text, searchTerm: string, resultIndex: number) => {
    const text = textNode.textContent || '';
    const searchLower = searchTerm.toLowerCase();
    const textLower = text.toLowerCase();
    const results: SearchResult[] = [];
    
    let startIndex = 0;
    let matchIndex = textLower.indexOf(searchLower, startIndex);
    
    while (matchIndex !== -1) {
      const span = document.createElement('span');
      span.className = highlightClassName;
      span.style.backgroundColor = '#ffeb3b';
      span.style.color = '#000';
      span.style.padding = '1px 2px';
      span.style.borderRadius = '2px';
      span.setAttribute('data-search-index', resultIndex.toString());
      
      const range = document.createRange();
      range.setStart(textNode, matchIndex);
      range.setEnd(textNode, matchIndex + searchTerm.length);
      
      try {
        range.surroundContents(span);
        results.push({
          element: span,
          textNode,
          startOffset: matchIndex,
          endOffset: matchIndex + searchTerm.length,
          index: resultIndex
        });
        resultIndex++;
      } catch (e) {
        console.warn('Could not highlight text:', e);
      }
      
      startIndex = matchIndex + searchTerm.length;
      const remainingText = text.substring(startIndex);
      matchIndex = remainingText.toLowerCase().indexOf(searchLower);
      if (matchIndex !== -1) {
        matchIndex += startIndex;
      }
    }
    
    return { results, nextIndex: resultIndex };
  }, []);

  const performSearch = useCallback((searchTerm: string) => {
    if (!searchTerm || !editorRef.current) {
      clearHighlights();
      return;
    }

    clearHighlights();
    
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent || '';
          return text.toLowerCase().includes(searchTerm.toLowerCase()) 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const allResults: SearchResult[] = [];
    let resultIndex = 0;
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text)) {
      const { results, nextIndex } = highlightText(node, searchTerm, resultIndex);
      allResults.push(...results);
      resultIndex = nextIndex;
    }
    
    setSearchResults(allResults);
    setTotalResults(allResults.length);
    
    if (allResults.length > 0) {
      setCurrentResultIndex(0);
      navigateToResult(0, allResults);
    }
  }, [editorRef, clearHighlights, highlightText]);

  const navigateToResult = useCallback((index: number, results: SearchResult[] = searchResults) => {
    if (results.length === 0 || index < 0 || index >= results.length) return;
    
    // Remove active highlighting from all results
    results.forEach(result => {
      result.element.className = highlightClassName;
    });
    
    // Add active highlighting to current result
    const currentResult = results[index];
    currentResult.element.className = `${highlightClassName} ${activeHighlightClassName}`;
    currentResult.element.style.backgroundColor = '#ff9800';
    currentResult.element.style.fontWeight = 'bold';
    
    // Scroll to the result
    currentResult.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    
    setCurrentResultIndex(index);
  }, [searchResults]);

  const nextResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    navigateToResult(nextIndex);
  }, [currentResultIndex, searchResults, navigateToResult]);

  const previousResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIndex = currentResultIndex <= 0 ? searchResults.length - 1 : currentResultIndex - 1;
    navigateToResult(prevIndex);
  }, [currentResultIndex, searchResults, navigateToResult]);

  return {
    performSearch,
    clearHighlights,
    nextResult,
    previousResult,
    currentResultIndex: currentResultIndex + 1, // 1-based for display
    totalResults,
    hasResults: totalResults > 0
  };
};
