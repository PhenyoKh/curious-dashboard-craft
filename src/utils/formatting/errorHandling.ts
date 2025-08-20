
import { logger } from '@/utils/logger';

export const handleFormattingError = (operation: string, error: unknown): boolean => {
  logger.error(`Formatting error during ${operation}:`, error);
  
  // Could be extended to show user-friendly notifications
  // For now, we'll just log the error
  return false;
};

export const isFormattingSupported = (command: string): boolean => {
  try {
    return document.queryCommandSupported(command);
  } catch {
    return false;
  }
};

export const executeWithFallback = (
  primaryAction: () => void,
  fallbackAction?: () => void,
  errorContext?: string
): boolean => {
  try {
    primaryAction();
    return true;
  } catch (error) {
    handleFormattingError(errorContext || 'formatting operation', error);
    
    if (fallbackAction) {
      try {
        fallbackAction();
        return true;
      } catch (fallbackError) {
        handleFormattingError(`fallback for ${errorContext || 'formatting operation'}`, fallbackError);
      }
    }
    
    return false;
  }
};
