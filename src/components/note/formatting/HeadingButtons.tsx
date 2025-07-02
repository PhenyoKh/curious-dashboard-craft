
import React from 'react';

interface HeadingButtonsProps {
  onFormatText: (command: string, value?: string) => void;
}

const HeadingButtons: React.FC<HeadingButtonsProps> = ({ onFormatText }) => {
  const handleHeadingClick = (tag: string) => {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // If no text is selected, select the current paragraph
        if (selection.toString().trim() === '') {
          let container = range.startContainer;
          
          // Find the closest block element
          while (container && container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
          }
          
          if (container && container.nodeType === Node.ELEMENT_NODE) {
            const element = container as HTMLElement;
            // Select the entire block element
            range.selectNode(element);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        
        // Apply the formatting
        onFormatText('formatBlock', tag);
      }
    }
  };

  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        onClick={() => handleHeadingClick('h1')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => handleHeadingClick('h2')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => handleHeadingClick('p')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Paragraph"
      >
        P
      </button>
    </div>
  );
};

export default HeadingButtons;
