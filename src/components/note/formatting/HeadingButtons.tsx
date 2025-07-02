
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
        // If no text is selected, select the current paragraph/line only
        if (selection.toString().trim() === '') {
          const range = selection.getRangeAt(0);
          let container = range.startContainer;
          
          // Find the closest block element (p, div, h1, h2, etc.)
          while (container && container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
          }
          
          if (container && container.nodeType === Node.ELEMENT_NODE) {
            const element = container as HTMLElement;
            
            // Make sure we're only selecting block-level elements within the editor
            if (editor.contains(element) && 
                (element.tagName === 'P' || element.tagName === 'DIV' || 
                 element.tagName === 'H1' || element.tagName === 'H2' || 
                 element.tagName === 'H3' || element === editor)) {
              
              // If it's the editor itself, create a new paragraph
              if (element === editor) {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                range.insertNode(p);
                range.selectNode(p);
              } else {
                range.selectNode(element);
              }
              
              selection.removeAllRanges();
              selection.addRange(range);
            }
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
