
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClearHighlightDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  highlightCount: number;
}

const ClearHighlightDialog: React.FC<ClearHighlightDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  highlightCount
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear Highlight</AlertDialogTitle>
          <AlertDialogDescription>
            {highlightCount > 0 ? (
              <>
                This will remove the highlight and delete {highlightCount} related 
                {highlightCount === 1 ? ' commentary' : ' commentaries'} from the Highlights & Commentary section. 
                This action cannot be undone.
              </>
            ) : (
              'This will remove the highlight. This action cannot be undone.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            Clear Highlight
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ClearHighlightDialog;
