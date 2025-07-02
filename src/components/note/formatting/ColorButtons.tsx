
import React from 'react';

interface ColorButtonsProps {
  onFormatText: (command: string, value?: string) => void;
  onHighlightClick: (color: string) => void;
  activeHighlight: string | null;
}

const ColorButtons: React.FC<ColorButtonsProps> = ({ 
  onFormatText, 
  onHighlightClick, 
  activeHighlight 
}) => {
  return (
    <div className="flex items-center gap-2 pr-6 border-r border-gray-200">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Text:</span>
        <button
          onClick={() => onFormatText('foreColor', '#000000')}
          className="w-6 h-6 bg-black rounded-full hover:scale-110 transition-transform border border-gray-300"
          title="Black Text"
        ></button>
        <button
          onClick={() => onFormatText('foreColor', '#e74c3c')}
          className="w-6 h-6 bg-red-500 rounded-full hover:scale-110 transition-transform"
          title="Red Text"
        ></button>
        <button
          onClick={() => onFormatText('foreColor', '#3498db')}
          className="w-6 h-6 bg-blue-500 rounded-full hover:scale-110 transition-transform"
          title="Blue Text"
        ></button>
        <button
          onClick={() => onFormatText('foreColor', '#27ae60')}
          className="w-6 h-6 bg-green-500 rounded-full hover:scale-110 transition-transform"
          title="Green Text"
        ></button>
      </div>
      <div className="flex items-center gap-1 ml-3">
        <span className="text-xs text-gray-500 mr-1">Highlight:</span>
        <button
          onClick={() => onHighlightClick('#fff9c4')}
          className={`w-6 h-6 bg-yellow-200 rounded-full hover:scale-110 transition-transform border-2 ${
            activeHighlight === '#fff9c4' ? 'border-yellow-500' : 'border-yellow-300'
          }`}
          title="🟡 Yellow - Key Concepts/Definitions (Ctrl/⌘+Y)"
        ></button>
        <button
          onClick={() => onHighlightClick('#bbdefb')}
          className={`w-6 h-6 bg-blue-200 rounded-full hover:scale-110 transition-transform border-2 ${
            activeHighlight === '#bbdefb' ? 'border-blue-500' : 'border-blue-300'
          }`}
          title="🔵 Blue - Facts/Formulas/Dates (Ctrl/⌘+B)"
        ></button>
        <button
          onClick={() => onHighlightClick('#c8e6c9')}
          className={`w-6 h-6 bg-green-200 rounded-full hover:scale-110 transition-transform border-2 ${
            activeHighlight === '#c8e6c9' ? 'border-green-500' : 'border-green-300'
          }`}
          title="🟢 Green - Examples/Explanations (Ctrl/⌘+G)"
        ></button>
        <button
          onClick={() => onHighlightClick('#ffcdd2')}
          className={`w-6 h-6 bg-red-200 rounded-full hover:scale-110 transition-transform border-2 ${
            activeHighlight === '#ffcdd2' ? 'border-red-500' : 'border-red-300'
          }`}
          title="🔴 Red - To Review/Struggle Spots (Ctrl/⌘+R)"
        ></button>
      </div>
    </div>
  );
};

export default ColorButtons;
