
export const handleFormattingError = (error: unknown, operation: string) => {
  console.error(`Formatting error during ${operation}:`, error);
  
  // Could be extended to show user-friendly notifications
  // For now, we'll just log the error
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
    handleFormattingError(error, errorContext || 'formatting operation');
    
    if (fallbackAction) {
      try {
        fallbackAction();
        return true;
      } catch (fallbackError) {
        handleFormattingError(fallbackError, `fallback for ${errorContext || 'formatting operation'}`);
      }
    }
    
    return false;
  }
};
