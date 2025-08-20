import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Code, File, FileDown } from 'lucide-react';
import { Highlight } from '@/types/highlight';
import { logger } from '@/utils/logger';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  highlights: Highlight[];
  onExport: (format: ExportFormat) => void;
}

export type ExportFormat = 'text' | 'html' | 'markdown' | 'md' | 'pdf' | 'pdf-advanced';

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  extension: string;
}

const formatOptions: FormatOption[] = [
  {
    value: 'text',
    label: 'Plain Text',
    description: 'Simple text format with highlights organized at the end',
    icon: FileText,
    extension: '.txt'
  },
  {
    value: 'html',
    label: 'HTML',
    description: 'Rich HTML format with styled highlights and full formatting',
    icon: Code,
    extension: '.html'
  },
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Markdown format with organized highlights and commentary',
    icon: File,
    extension: '.md'
  },
  {
    value: 'pdf',
    label: 'PDF (Quick)',
    description: 'Fast client-side PDF generation with basic formatting',
    icon: FileDown,
    extension: '.pdf'
  },
  {
    value: 'pdf-advanced',
    label: 'PDF (High Quality)',
    description: 'Server-generated PDF with superior formatting, perfect tables, and color preservation',
    icon: FileDown,
    extension: '.pdf'
  }
];

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  noteId,
  noteTitle,
  highlights,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('text');
  const [isExporting, setIsExporting] = useState(false);

  const selectedFormatOption = formatOptions.find(option => option.value === selectedFormat);

  const handleExport = async () => {
    if (!selectedFormat) return;
    
    setIsExporting(true);
    try {
      await onExport(selectedFormat);
      onClose();
    } catch (error) {
      logger.error('Export failed:', error);
      // Could add toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  const getHighlightsSummary = () => {
    if (highlights.length === 0) return 'No highlights';
    
    const categoryCounts = {
      red: highlights.filter(h => h.category === 'red').length,
      yellow: highlights.filter(h => h.category === 'yellow').length,
      green: highlights.filter(h => h.category === 'green').length,
      blue: highlights.filter(h => h.category === 'blue').length
    };

    const categoryNames = {
      red: 'Key Definitions',
      yellow: 'Key Principles', 
      green: 'Examples',
      blue: 'Review Later'
    };

    return Object.entries(categoryCounts)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => `${count} ${categoryNames[category as keyof typeof categoryNames]}`)
      .join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Note Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{noteTitle}</h3>
            <div className="text-sm text-gray-600">
              <div>Highlights: {getHighlightsSummary()}</div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Export Format</label>
            <Select value={selectedFormat} onValueChange={(value: ExportFormat) => setSelectedFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{option.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {option.extension}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {selectedFormatOption && (
              <p className="text-sm text-gray-600">
                {selectedFormatOption.description}
              </p>
            )}
          </div>

          {/* Export Features */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">What's included:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Full note content with original formatting</li>
              <li>• All highlights organized by category</li>
              <li>• Commentary and notes for each highlight</li>
              <li>• Note metadata (creation date, word count)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={!selectedFormat || isExporting}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {selectedFormatOption?.label}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;