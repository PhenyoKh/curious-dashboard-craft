
import React from 'react';

interface ColorButtonsProps {
  onFormatText: (command: string, value?: string) => void;
  onHighlightClick: (color: string) => void;
  onClearHighlight: () => void;
  onFontColorClick: (color: string) => void;
  activeHighlight: string | null;
  activeFontColor: string;
}

const ColorButtons: React.FC<ColorButtonsProps> = ({ 
  onHighlightClick, 
  onClearHighlight,
  onFontColorClick,
  activeHighlight,
  activeFontColor
}) => {
  const fontColors = [
    { color: '#000000', name: 'Black', className: 'bg-black' },
    { color: '#e74c3c', name: 'Red', className: 'bg-red-500' },
    { color: '#3498db', name: 'Blue', className: 'bg-blue-500' },
    { color: '#27ae60', name: 'Green', className: 'bg-green-500' }
  ];

  const highlightColors = [
    { color: '#ffcdd2', name: '🟥 Red - Key Definition', className: 'bg-red-200', shortcut: '1' },
    { color: '#fff9c4', name: '🟨 Yellow - Main Principle', className: 'bg-yellow-200', shortcut: '2' },
    { color: '#c8e6c9', name: '🟩 Green - Example', className: 'bg-green-200', shortcut: '3' },
    { color: '#bbdefb', name: '🔵 Blue - To Review', className: 'bg-blue-200', shortcut: '4' }
  ];

  const handleFontColorClick = (color: string) => {
    onFontColorClick(color);
  };

  const handleHighlightClickInternal = (color: string) => {
    onHighlightClick(color);
  };

  const handleClearHighlightClick = () => {
    onClearHighlight();
  };

  return (
    <div className="flex items-center gap-4 pr-6 border-r border-gray-200">
      {/* Font Colors */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Text:</span>
        {fontColors.map((fontColor) => (
          <button
            key={fontColor.color}
            onClick={() => handleFontColorClick(fontColor.color)}
            className={`w-6 h-6 ${fontColor.className} rounded-full hover:scale-110 transition-all duration-200 border-2 ${
              activeFontColor === fontColor.color 
                ? 'border-gray-700 ring-2 ring-gray-400 shadow-md scale-110 font-bold' 
                : 'border-gray-300'
            }`}
            title={fontColor.name}
          />
        ))}
      </div>

      {/* Highlight Colors */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Highlight:</span>
        {highlightColors.map((highlight) => (
          <button
            key={highlight.color}
            onClick={() => handleHighlightClickInternal(highlight.color)}
            className={`w-6 h-6 ${highlight.className} rounded-full hover:scale-110 transition-all duration-200 border-2 ${
              activeHighlight === highlight.color 
                ? 'border-gray-700 ring-2 ring-gray-400 shadow-md scale-110 font-bold' 
                : 'border-gray-300'
            }`}
            title={`${highlight.name} (Ctrl/⌘+${highlight.shortcut})`}
          />
        ))}
        
        {/* Clear Highlight Button */}
        <button
          onClick={handleClearHighlightClick}
          className="ml-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          title="Clear Highlight"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default ColorButtons;
