
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';

interface Shortcut {
  action: string;
  keys: string[];
  colorIndicator?: string;
}

const KeyboardShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Use scroll lock hook to prevent scrollbar glitch
  const { lockScroll, unlockScroll } = useScrollLock();

  const shortcuts: Shortcut[] = [
    // Text Formatting
    { action: 'Bold', keys: ['Ctrl', 'B'] },
    { action: 'Italic', keys: ['Ctrl', 'I'] },
    { action: 'Underline', keys: ['Ctrl', 'U'] },
    
    // Highlighting Categories
    { action: 'Key Definition', keys: ['Ctrl', '1'], colorIndicator: '#ffcdd2' },
    { action: 'Main Principle', keys: ['Ctrl', '2'], colorIndicator: '#fff9c4' },
    { action: 'Example', keys: ['Ctrl', '3'], colorIndicator: '#c8e6c9' },
    { action: 'To Review', keys: ['Ctrl', '4'], colorIndicator: '#bbdefb' },
    
    // General
    { action: 'Save', keys: ['Ctrl', 'S'] },
    { action: 'Show Shortcuts', keys: ['?'] },
  ];

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Open modal on ? key
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        openModal();
      }
      
      // Close modal on Escape key
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when modal is open using scroll lock hook
  useEffect(() => {
    if (isOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [isOpen, lockScroll, unlockScroll]);

  const openModal = () => {
    setIsOpen(true);
    // Small delay to ensure DOM is ready, then trigger animation
    setTimeout(() => {
      setIsAnimating(true);
    }, 10);
  };

  const closeModal = () => {
    setIsAnimating(false);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleCloseClick = () => {
    closeModal();
  };

  const formatKeys = (keys: string[]) => {
    return keys.map((key, index) => (
      <React.Fragment key={key}>
        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono shadow-sm">
          {key === 'Ctrl' ? (navigator.platform.indexOf('Mac') > -1 ? '⌘' : 'Ctrl') : key}
        </kbd>
        {index < keys.length - 1 && <span className="mx-1 text-gray-400">+</span>}
      </React.Fragment>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end pr-4">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-all duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      />
      
      {/* Floating Modal */}
      <div 
        className={`relative w-80 max-h-[80vh] bg-white rounded-lg shadow-2xl border border-gray-200 transform transition-all duration-300 ease-out ${
          isAnimating 
            ? 'translate-x-0 opacity-100 scale-100' 
            : 'translate-x-full opacity-0 scale-95'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          transitionDelay: isAnimating ? '0ms' : '0ms',
          willChange: 'transform, opacity, scale'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-800">Keyboard Shortcuts</h2>
          <button
            onClick={handleCloseClick}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close shortcuts modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="space-y-4">
            {/* Text Formatting Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Text Formatting</h3>
              <div className="space-y-2">
                {shortcuts.slice(0, 3).map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{shortcut.action}</span>
                    <div className="flex items-center">
                      {formatKeys(shortcut.keys)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlighting Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Highlighting</h3>
              <div className="space-y-2">
                {shortcuts.slice(3, 7).map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {shortcut.colorIndicator && (
                        <div 
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: shortcut.colorIndicator }}
                        />
                      )}
                      <span className="text-sm text-gray-700">{shortcut.action}</span>
                    </div>
                    <div className="flex items-center">
                      {formatKeys(shortcut.keys)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">General</h3>
              <div className="space-y-2">
                {shortcuts.slice(7).map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{shortcut.action}</span>
                    <div className="flex items-center">
                      {formatKeys(shortcut.keys)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">?</kbd> to toggle this panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
