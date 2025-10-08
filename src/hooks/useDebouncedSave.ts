import { useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { Highlight } from '@/types/highlight';

interface SaveVersion {
  version: number;
  highlights: Array<{ 
    id: string; 
    commentary?: string; 
    isExpanded?: boolean;
    version?: number;
  }>;
  timestamp: number;
}

export const useDebouncedSave = (
  performSave: (highlights: Array<{ id: string; commentary?: string; isExpanded?: boolean }>) => Promise<void>
) => {
  const [saveVersion, setSaveVersion] = useState(0);
  const [pendingSaves, setPendingSaves] = useState<Map<number, SaveVersion>>(new Map());
  const [lastSuccessfulSave, setLastSuccessfulSave] = useState<SaveVersion | null>(null);

  // Debounced save implementation with version tracking
  const debouncedSave = useCallback(
    debounce(async (highlights: Highlight[], version: number) => {
      try {
        // Add save attempt to pending
        const saveAttempt: SaveVersion = {
          version,
          highlights: highlights.map(h => ({
            id: h.id,
            commentary: h.commentary || '',
            isExpanded: !!h.isExpanded,
            version
          })),
          timestamp: Date.now()
        };

        setPendingSaves(prev => {
          const updated = new Map(prev);
          updated.set(version, saveAttempt);
          return updated;
        });

        // Perform the actual save
        await performSave(saveAttempt.highlights);

        // Update successful save record
        setLastSuccessfulSave(saveAttempt);

        // Remove from pending saves
        setPendingSaves(prev => {
          const updated = new Map(prev);
          updated.delete(version);
          return updated;
        });
      } catch (error) {
        console.error('Save failed for version:', version, error);
        // Leave in pending saves for potential retry
      }
    }, 1000),
    [performSave]
  );

  const triggerSave = useCallback((highlights: Highlight[]) => {
    const newVersion = saveVersion + 1;
    setSaveVersion(newVersion);
    debouncedSave(highlights, newVersion);
  }, [saveVersion, debouncedSave]);

  const getPendingSaveCount = useCallback(() => pendingSaves.size, [pendingSaves]);

  const getLastSuccessfulSaveTime = useCallback(() => 
    lastSuccessfulSave?.timestamp || null, 
    [lastSuccessfulSave]
  );

  return {
    triggerSave,
    getPendingSaveCount,
    getLastSuccessfulSaveTime,
    currentVersion: saveVersion
  };
};