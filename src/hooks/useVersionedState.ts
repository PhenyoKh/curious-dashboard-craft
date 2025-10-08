import { useState, useCallback } from 'react';
import { debounce } from 'lodash-es';
import { logger } from '@/utils/logger';

export interface VersionedData<T> {
  data: T;
  version: number;
  timestamp: number;
}

export interface VersionedStateOptions {
  debounceMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export function useVersionedState<T>(
  initialData: T,
  persistData: (data: T) => Promise<void>,
  options: VersionedStateOptions = {}
) {
  const {
    debounceMs = 1000,
    retryAttempts = 3,
    retryDelayMs = 1000
  } = options;

  const [currentVersion, setCurrentVersion] = useState(0);
  const [lastSavedVersion, setLastSavedVersion] = useState(0);
  const [data, setData] = useState<VersionedData<T>>({
    data: initialData,
    version: 0,
    timestamp: Date.now()
  });
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Retry logic with exponential backoff
  const retryWithBackoff = useCallback(async (
    fn: () => Promise<void>,
    attempt: number = 0
  ): Promise<void> => {
    try {
      await fn();
    } catch (error) {
      if (attempt < retryAttempts) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        logger.warn(`Save attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, attempt + 1);
      }
      throw error;
    }
  }, [retryAttempts, retryDelayMs]);

  // Debounced save implementation
  const debouncedSave = useCallback(
    debounce(async (versionedData: VersionedData<T>) => {
      setIsSaving(true);
      setSaveError(null);
      
      try {
        await retryWithBackoff(async () => {
          await persistData(versionedData.data);
        });
        
        setLastSavedVersion(versionedData.version);
        logger.info(`Successfully saved version ${versionedData.version}`);
      } catch (error) {
        setSaveError(error instanceof Error ? error : new Error(String(error)));
        logger.error('Failed to save after all retry attempts:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs),
    [persistData, retryWithBackoff]
  );

  // Update data with versioning
  const updateData = useCallback((newData: T) => {
    const newVersion = currentVersion + 1;
    setCurrentVersion(newVersion);
    
    const versionedData: VersionedData<T> = {
      data: newData,
      version: newVersion,
      timestamp: Date.now()
    };
    
    setData(versionedData);
    debouncedSave(versionedData);
  }, [currentVersion, debouncedSave]);

  const hasPendingChanges = currentVersion !== lastSavedVersion;

  return {
    data: data.data,
    updateData,
    isSaving,
    hasPendingChanges,
    saveError,
    currentVersion,
    lastSavedVersion
  };
}