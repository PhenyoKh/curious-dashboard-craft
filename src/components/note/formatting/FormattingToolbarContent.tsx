
import React from 'react';
import TextFormattingButtons from './TextFormattingButtons';
import HeadingButtons from './HeadingButtons';
import ListButtons from './ListButtons';
import AlignmentButtons from './AlignmentButtons';
import ColorButtons from './ColorButtons';
import InsertButtons from './InsertButtons';
import ViewButtons from './ViewButtons';

interface FormattingToolbarContentProps {
  onFormatText: (command: string, value?: string) => void;
  isFormatActive: (command: string) => boolean;
  wordCount: number;
  activeHighlight: string | null;
  activeFontColor: string;
  onHighlightClick: (color: string) => void;
  onClearHighlight: () => void;
  onFontColorClick: (color: string) => void;
}

const FormattingToolbarContent: React.FC<FormattingToolbarContentProps> = ({
  onFormatText,
  isFormatActive,
  wordCount,
  activeHighlight,
  activeFontColor,
  onHighlightClick,
  onClearHighlight,
  onFontColorClick
}) => {
  return (
    <div className="flex items-center gap-8 min-w-max">
      <TextFormattingButtons 
        onFormatText={onFormatText} 
        isFormatActive={isFormatActive} 
      />
      
      <HeadingButtons onFormatText={onFormatText} />
      
      <ListButtons 
        onFormatText={onFormatText} 
        isFormatActive={isFormatActive} 
      />
      
      <AlignmentButtons 
        onFormatText={onFormatText} 
        isFormatActive={isFormatActive} 
      />
      
      <ColorButtons 
        onFormatText={onFormatText} 
        onHighlightClick={onHighlightClick}
        onClearHighlight={onClearHighlight}
        onFontColorClick={onFontColorClick}
        activeHighlight={activeHighlight}
        activeFontColor={activeFontColor}
      />
      
      <InsertButtons onFormatText={onFormatText} />
      
      <ViewButtons wordCount={wordCount} />
    </div>
  );
};

export default FormattingToolbarContent;
