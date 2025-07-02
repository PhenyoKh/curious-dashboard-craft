
import { useCallback, useRef } from 'react';

interface UseAutoSaveProps {
  onSave: () => void;
  delay?: number;
}

export const useAutoSave = ({ onSave, delay = 1000 }: UseAutoSaveProps) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onSave();
    }, delay);
  }, [onSave, delay]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debouncedSave, cleanup };
};
