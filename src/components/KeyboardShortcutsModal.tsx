
import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Shortcut {
  action: string;
  keys: string[];
  colorIndicator?: string;
}

const KeyboardShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

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
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 border-b border-gray-200">
          <SheetTitle className="text-lg font-semibold text-gray-800">
            Keyboard Shortcuts
          </SheetTitle>
        </SheetHeader>

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-80px)]">
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
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">?</kbd> to toggle this panel
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default KeyboardShortcutsModal;
