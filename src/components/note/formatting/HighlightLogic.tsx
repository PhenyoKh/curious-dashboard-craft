
import React from 'react';
import { useHighlightOperations } from '@/hooks/useHighlightOperations';
import { useFontColorOperations } from '@/hooks/useFontColorOperations';
import { useClearHighlight } from '@/hooks/useClearHighlight';
import ClearHighlightDialog from '../highlighting/ClearHighlightDialog';
import { Highlight } from '@/types/highlight';

interface HighlightLogicProps {
  onFormatText: (command: string, value?: string) => void;
  removeHighlightsByText?: (text: string) => Highlight[];
  children: (props: {
    activeHighlight: string | null;
    activeFontColor: string;
    handleHighlightClick: (color: string) => void;
    handleClearHighlight: () => void;
    handleFontColorClick: (color: string) => void;
    handleKeyboardHighlight: (colorKey: string) => void;
  }) => React.ReactNode;
}

const HighlightLogic: React.FC<HighlightLogicProps> = ({ 
  onFormatText, 
  removeHighlightsByText,
  children 
}) => {
  const {
    activeHighlight,
    setActiveHighlight,
    handleHighlightClick,
    handleKeyboardHighlight
  } = useHighlightOperations({ onFormatText });

  const {
    activeFontColor,
    handleFontColorClick
  } = useFontColorOperations(onFormatText);

  const {
    showClearDialog,
    matchingHighlights,
    handleClearHighlight,
    confirmClearHighlight,
    closeClearDialog
  } = useClearHighlight({ onFormatText, removeHighlightsByText });

  // Reset active highlight when clearing
  const handleClearHighlightWithReset = () => {
    handleClearHighlight();
  };

  const confirmClearHighlightWithReset = () => {
    confirmClearHighlight();
    setActiveHighlight(null);
  };

  return (
    <>
      {children({
        activeHighlight,
        activeFontColor,
        handleHighlightClick,
        handleClearHighlight: handleClearHighlightWithReset,
        handleFontColorClick,
        handleKeyboardHighlight
      })}
      
      <ClearHighlightDialog
        isOpen={showClearDialog}
        onClose={closeClearDialog}
        onConfirm={confirmClearHighlightWithReset}
        highlightCount={matchingHighlights.length}
      />
    </>
  );
};

export default HighlightLogic;
