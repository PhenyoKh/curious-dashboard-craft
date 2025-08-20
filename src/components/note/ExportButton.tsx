import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import ExportModal, { ExportFormat } from './ExportModal';
import { Highlight } from '@/types/highlight';
import { ClientExportService } from '@/services/exportService';
import { logger } from '@/utils/logger';

export interface ExportButtonProps {
  noteId: string;
  noteTitle: string;
  highlights: Highlight[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  noteId,
  noteTitle,
  highlights,
  variant = 'outline',
  size = 'default',
  className
}) => {
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    try {
      await ClientExportService.exportNoteAs(noteId, format, highlights);
    } catch (error) {
      logger.error('Export failed:', error);
      alert(`Export failed: ${error.message || 'Unknown error'}`);
    }
  };


  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowExportModal(true)}
        className={className}
      >
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        noteId={noteId}
        noteTitle={noteTitle}
        highlights={highlights}
        onExport={handleExport}
      />
    </>
  );
};

export default ExportButton;