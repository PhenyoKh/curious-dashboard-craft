
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface SearchBarProps {
  show: boolean;
  onClose: () => void;
  onSearch: (term: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClear: () => void;
  currentResult: number;
  totalResults: number;
  hasResults: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  show,
  onClose,
  onSearch,
  onNext,
  onPrevious,
  onClear,
  currentResult,
  totalResults,
  hasResults
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      onSearch(term.trim());
    } else {
      onClear();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (show) {
      // Auto-focus search input when opened
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="flex items-center gap-2 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 flex-1">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          data-search-input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search in document..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      
      {hasResults && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {currentResult} of {totalResults}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={totalResults === 0}
            className="p-1 h-8 w-8"
            title="Previous result (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={totalResults === 0}
            className="p-1 h-8 w-8"
            title="Next result (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={onClose}
        className="p-1 h-8 w-8"
        title="Close search (Escape)"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default SearchBar;
