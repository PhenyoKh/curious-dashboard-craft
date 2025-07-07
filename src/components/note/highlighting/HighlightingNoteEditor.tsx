
import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useHighlightSystem } from '@/hooks/useHighlightSystem';
import { HIGHLIGHT_CATEGORIES } from '@/types/highlight';

interface HighlightingNoteEditorProps {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
}

const HighlightingNoteEditor: React.FC<HighlightingNoteEditorProps> = ({
  title,
  setTitle,
  content,
  onContentChange
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const { addHighlight, scrollToHighlight } = useHighlightSystem();

  const sampleContent = `
    <h2>Cellular Respiration in Biology 101</h2>
    
    <p><strong>Cellular respiration</strong> is the process by which cells break down glucose and other organic molecules to produce ATP, the energy currency of the cell. This fundamental process occurs in all living organisms and is essential for life.</p>
    
    <h3>Key Components</h3>
    
    <p>The process involves three main stages:</p>
    
    <p><strong>Glycolysis</strong> - The breakdown of glucose into pyruvate molecules, occurring in the cytoplasm. This process yields a small amount of ATP and does not require oxygen.</p>
    
    <p><strong>Krebs Cycle (Citric Acid Cycle)</strong> - Pyruvate is further broken down in the mitochondrial matrix, producing carbon dioxide, NADH, FADH2, and additional ATP.</p>
    
    <p><strong>Electron Transport Chain</strong> - The final stage where most ATP is produced through oxidative phosphorylation in the inner mitochondrial membrane.</p>
    
    <h3>Real-World Example</h3>
    
    <p>When you exercise, your muscle cells rapidly consume glucose through cellular respiration to produce the ATP needed for muscle contraction. This is why you breathe heavily during exercise - your cells need more oxygen for the electron transport chain.</p>
    
    <h3>Important Notes</h3>
    
    <p>The overall equation for cellular respiration is: C6H12O6 + 6O2 → 6CO2 + 6H2O + ATP. This process is essentially the reverse of photosynthesis and demonstrates the interconnected nature of biological processes.</p>
  `;

  useEffect(() => {
    if (editorRef.current && !content) {
      editorRef.current.innerHTML = sampleContent;
      onContentChange(sampleContent);
    }
  }, [content, onContentChange, sampleContent]);

  const handleTextSelection = (category: 'key-definition' | 'key-principle' | 'example' | 'review-later') => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      alert('Please select some text first');
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const range = selection.getRangeAt(0);
    const highlightId = addHighlight(category, selectedText, 0, 0);
    
    // Create highlight span with numbered badge
    const highlightSpan = document.createElement('span');
    const categoryInfo = HIGHLIGHT_CATEGORIES.find(cat => cat.key === category);
    
    highlightSpan.style.backgroundColor = categoryInfo?.color || '#ffffff';
    highlightSpan.style.position = 'relative';
    highlightSpan.style.cursor = 'pointer';
    highlightSpan.className = 'highlight-text';
    highlightSpan.dataset.highlightId = highlightId;
    
    // Add click handler
    highlightSpan.onclick = () => scrollToHighlight(highlightId);
    
    // Wrap selected content
    try {
      range.surroundContents(highlightSpan);
      
      // Add numbered badge
      const badge = document.createElement('span');
      badge.className = 'highlight-badge';
      badge.style.cssText = `
        display: inline-block;
        background: ${categoryInfo?.borderColor || '#333333'};
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 8px;
        margin-left: 4px;
        font-weight: bold;
        vertical-align: super;
        line-height: 1;
      `;
      badge.textContent = '1'; // Will be updated with actual number
      highlightSpan.appendChild(badge);
      
      selection.removeAllRanges();
      onContentChange(editorRef.current?.innerHTML || '');
    } catch (error) {
      console.error('Error highlighting text:', error);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Highlighting Toolbar */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Highlight as:</span>
          {HIGHLIGHT_CATEGORIES.map((category) => (
            <Button
              key={category.key}
              variant="outline"
              size="sm"
              onClick={() => handleTextSelection(category.key)}
              className="text-xs px-3 py-1 h-7"
              style={{ 
                borderColor: category.borderColor,
                backgroundColor: category.color + '40'
              }}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title"
            className="w-full text-3xl font-bold border-none outline-none bg-transparent text-gray-900 placeholder-gray-400 mb-6"
          />
          
          {/* Rich Text Editor */}
          <div className="bg-white rounded-lg border border-gray-200 min-h-[400px] shadow-sm">
            <div
              ref={editorRef}
              contentEditable
              className="p-6 min-h-[400px] text-base leading-relaxed outline-none prose prose-lg max-w-none"
              onInput={handleEditorInput}
              suppressContentEditableWarning={true}
              spellCheck={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighlightingNoteEditor;
