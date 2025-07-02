
import React from 'react';

interface HeadingButtonsProps {
  onFormatText: (command: string, value?: string) => void;
}

const HeadingButtons: React.FC<HeadingButtonsProps> = ({ onFormatText }) => {
  const handleHeadingClick = (tag: string) => {
    const selection = window.getSelection();
    if (!selection) return;

    // Focus the editor first
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
    }

    // If there's selected text, wrap it in the heading tag
    if (selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      // Create the heading element
      const headingElement = document.createElement(tag);
      headingElement.textContent = selectedText;
      
      // Apply appropriate styling based on heading level
      if (tag === 'h1') {
        headingElement.style.fontSize = '2rem';
        headingElement.style.fontWeight = 'bold';
        headingElement.style.marginTop = '1rem';
        headingElement.style.marginBottom = '0.5rem';
      } else if (tag === 'h2') {
        headingElement.style.fontSize = '1.5rem';
        headingElement.style.fontWeight = 'bold';
        headingElement.style.marginTop = '0.75rem';
        headingElement.style.marginBottom = '0.5rem';
      } else if (tag === 'h3') {
        headingElement.style.fontSize = '1.25rem';
        headingElement.style.fontWeight = 'bold';
        headingElement.style.marginTop = '0.5rem';
        headingElement.style.marginBottom = '0.25rem';
      } else if (tag === 'p') {
        headingElement.style.fontSize = '1rem';
        headingElement.style.fontWeight = 'normal';
        headingElement.style.marginTop = '0.25rem';
        headingElement.style.marginBottom = '0.25rem';
      }
      
      // Replace the selected text with the heading element
      range.deleteContents();
      range.insertNode(headingElement);
      
      // Clear selection and place cursor after the heading
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(headingElement);
      newRange.collapse(true);
      selection.addRange(newRange);
    } else {
      // No text selected, just apply the format at cursor position
      onFormatText('formatBlock', tag);
    }
  };

  return (
    <div className="flex items-center gap-1 pr-6 border-r border-gray-200">
      <button
        onClick={() => handleHeadingClick('h1')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-bold transition-colors"
        title="Heading 1 - Main Title"
      >
        H1
      </button>
      <button
        onClick={() => handleHeadingClick('h2')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-semibold transition-colors"
        title="Heading 2 - Main Subheading"
      >
        H2
      </button>
      <button
        onClick={() => handleHeadingClick('h3')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-medium transition-colors"
        title="Heading 3 - Sub-subheading"
      >
        H3
      </button>
      <button
        onClick={() => handleHeadingClick('p')}
        className="px-2 py-1 hover:bg-gray-100 rounded text-sm transition-colors"
        title="Paragraph - Normal Text"
      >
        P
      </button>
    </div>
  );
};

export default HeadingButtons;
