/**
 * Custom hook for quarantine management operations
 * Provides React state management for quarantined files
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  QuarantineManager, 
  type QuarantinedFile, 
  type QuarantineStats,
  type QuarantineListOptions 
} from '@/lib/security/QuarantineManager';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security/SecurityLogger';
import { type FileSecurityResult } from '@/lib/security/FileSecurityValidator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface UseQuarantineOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onFileQuarantined?: (file: QuarantinedFile) => void;
  onFileRestored?: (fileId: string, success: boolean) => void;
  onFileDeleted?: (fileId: string, success: boolean) => void;
}

export interface QuarantineState {
  files: QuarantinedFile[];
  stats: QuarantineStats | null;
  totalFiles: number;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  selectedFiles: Set<string>;
  filters: QuarantineListOptions;
}

export function useQuarantine(options: UseQuarantineOptions = {}) {
  const { user } = useAuth();
  const [manager] = useState(() => new QuarantineManager());
  const [state, setState] = useState<QuarantineState>({
    files: [],
    stats: null,
    totalFiles: 0,
    hasMore: false,
    isLoading: false,
    isRefreshing: false,
    error: null,
    selectedFiles: new Set(),
    filters: { limit: 20, offset: 0 }
  });

  // Load quarantined files
  const loadFiles = useCallback(async (refresh = false) => {
    if (!user) return;

    const isInitialLoad = state.files.length === 0;
    
    setState(prev => ({
      ...prev,
      isLoading: isInitialLoad,
      isRefreshing: refresh,
      error: null
    }));

    try {
      const result = await manager.listQuarantinedFiles(state.filters);
      
      setState(prev => ({
        ...prev,
        files: state.filters.offset === 0 ? result.files : [...prev.files, ...result.files],
        totalFiles: result.total,
        hasMore: result.hasMore,
        isLoading: false,
        isRefreshing: false
      }));

      // Log quarantine list access
      await securityLogger.logEvent(
        SecurityEventType.QUARANTINE_LIST_VIEWED,
        SecurityEventSeverity.INFO,
        `Quarantine list accessed: ${result.files.length} files loaded`,
        { 
          total_files: result.total,
          has_more: result.hasMore,
          filters: state.filters
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load quarantined files';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isRefreshing: false
      }));

      toast({
        title: "Error loading quarantine",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [user, manager, state.filters, state.files.length]);

  // Load more files (pagination)
  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;

    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, offset: prev.files.length }
    }));

    await loadFiles();
  }, [state.isLoading, state.hasMore, loadFiles]);

  // Refresh files list
  const refresh = useCallback(async () => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, offset: 0 },
      files: []
    }));
    
    await loadFiles(true);
  }, [loadFiles]);

  // Load quarantine statistics
  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      const stats = await manager.getQuarantineStats();
      setState(prev => ({ ...prev, stats }));
    } catch (error) {
      console.error('Failed to load quarantine stats:', error);
    }
  }, [user, manager]);

  // Quarantine a file
  const quarantineFile = useCallback(async (
    file: File,
    securityResult: FileSecurityResult,
    originalPath?: string
  ): Promise<QuarantinedFile | null> => {
    if (!user) return null;

    try {
      const quarantinedFile = await manager.quarantineFile(file, securityResult, originalPath);
      
      // Update state
      setState(prev => ({
        ...prev,
        files: [quarantinedFile, ...prev.files],
        totalFiles: prev.totalFiles + 1,
        stats: prev.stats ? {
          ...prev.stats,
          total_files: prev.stats.total_files + 1,
          total_size: prev.stats.total_size + file.size,
          recent_quarantines: prev.stats.recent_quarantines + 1
        } : null
      }));

      // Log quarantine action
      await securityLogger.logFileQuarantined(quarantinedFile);

      // Call callback
      options.onFileQuarantined?.(quarantinedFile);

      toast({
        title: "File quarantined",
        description: `${file.name} has been quarantined for security reasons.`,
        variant: "default"
      });

      return quarantinedFile;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to quarantine file';
      
      toast({
        title: "Quarantine failed",
        description: errorMessage,
        variant: "destructive"
      });

      throw error;
    }
  }, [user, manager, options]);

  // Restore a quarantined file
  const restoreFile = useCallback(async (
    quarantineId: string,
    targetBucket: string = 'images'
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const file = state.files.find(f => f.id === quarantineId);
      if (!file) {
        throw new Error('File not found in quarantine list');
      }

      const result = await manager.restoreFile(quarantineId, targetBucket);

      if (result.success) {
        // Update state - remove from quarantine list
        setState(prev => ({
          ...prev,
          files: prev.files.filter(f => f.id !== quarantineId),
          totalFiles: Math.max(0, prev.totalFiles - 1),
          selectedFiles: new Set([...prev.selectedFiles].filter(id => id !== quarantineId)),
          stats: prev.stats ? {
            ...prev.stats,
            total_files: Math.max(0, prev.stats.total_files - 1),
            total_size: Math.max(0, prev.stats.total_size - file.file_size)
          } : null
        }));

        // Log restoration
        await securityLogger.logFileRestored(
          quarantineId,
          file.original_filename,
          true,
          result.message
        );

        toast({
          title: "File restored",
          description: `${file.original_filename} has been restored successfully.`,
          variant: "default"
        });

        options.onFileRestored?.(quarantineId, true);
        return true;

      } else {
        // Log failed restoration
        await securityLogger.logFileRestored(
          quarantineId,
          file.original_filename,
          false,
          result.message
        );

        toast({
          title: "Restoration failed",
          description: result.message,
          variant: "destructive"
        });

        options.onFileRestored?.(quarantineId, false);
        return false;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to restore file';
      
      toast({
        title: "Restoration failed",
        description: errorMessage,
        variant: "destructive"
      });

      options.onFileRestored?.(quarantineId, false);
      return false;
    }
  }, [user, manager, state.files, options]);

  // Delete a quarantined file permanently
  const deleteFile = useCallback(async (quarantineId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const file = state.files.find(f => f.id === quarantineId);
      if (!file) {
        throw new Error('File not found in quarantine list');
      }

      const result = await manager.deleteQuarantinedFile(quarantineId);

      if (result.success) {
        // Update state
        setState(prev => ({
          ...prev,
          files: prev.files.filter(f => f.id !== quarantineId),
          totalFiles: Math.max(0, prev.totalFiles - 1),
          selectedFiles: new Set([...prev.selectedFiles].filter(id => id !== quarantineId)),
          stats: prev.stats ? {
            ...prev.stats,
            total_files: Math.max(0, prev.stats.total_files - 1),
            total_size: Math.max(0, prev.stats.total_size - file.file_size)
          } : null
        }));

        // Log deletion
        await securityLogger.logEvent(
          SecurityEventType.FILE_PERMANENTLY_DELETED,
          SecurityEventSeverity.INFO,
          `File permanently deleted from quarantine: ${file.original_filename}`,
          { quarantine_id: quarantineId, file_size: file.file_size }
        );

        toast({
          title: "File deleted",
          description: `${file.original_filename} has been permanently deleted.`,
          variant: "default"
        });

        options.onFileDeleted?.(quarantineId, true);
        return true;

      } else {
        toast({
          title: "Deletion failed",
          description: result.message,
          variant: "destructive"
        });

        options.onFileDeleted?.(quarantineId, false);
        return false;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
      
      toast({
        title: "Deletion failed",
        description: errorMessage,
        variant: "destructive"
      });

      options.onFileDeleted?.(quarantineId, false);
      return false;
    }
  }, [user, manager, state.files, options]);

  // Bulk delete selected files
  const bulkDeleteFiles = useCallback(async (fileIds: string[]): Promise<{
    successful: number;
    failed: number;
  }> => {
    if (!user || fileIds.length === 0) {
      return { successful: 0, failed: 0 };
    }

    try {
      const result = await manager.bulkDeleteFiles(fileIds);
      
      if (result.successful > 0) {
        // Update state - remove successfully deleted files
        setState(prev => {
          const deletedFiles = prev.files.filter(f => fileIds.includes(f.id));
          const deletedSize = deletedFiles.reduce((sum, f) => sum + f.file_size, 0);
          
          return {
            ...prev,
            files: prev.files.filter(f => !fileIds.includes(f.id)),
            totalFiles: Math.max(0, prev.totalFiles - result.successful),
            selectedFiles: new Set([...prev.selectedFiles].filter(id => !fileIds.includes(id))),
            stats: prev.stats ? {
              ...prev.stats,
              total_files: Math.max(0, prev.stats.total_files - result.successful),
              total_size: Math.max(0, prev.stats.total_size - deletedSize)
            } : null
          };
        });

        // Log bulk deletion
        await securityLogger.logEvent(
          SecurityEventType.BULK_DELETE_PERFORMED,
          SecurityEventSeverity.INFO,
          `Bulk deletion completed: ${result.successful} files deleted, ${result.failed} failed`,
          { 
            successful: result.successful,
            failed: result.failed,
            file_ids: fileIds,
            errors: result.errors
          }
        );
      }

      toast({
        title: "Bulk deletion completed",
        description: `${result.successful} files deleted successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}.`,
        variant: result.failed > 0 ? "destructive" : "default"
      });

      return { successful: result.successful, failed: result.failed };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk deletion failed';
      
      toast({
        title: "Bulk deletion failed",
        description: errorMessage,
        variant: "destructive"
      });

      return { successful: 0, failed: fileIds.length };
    }
  }, [user, manager]);

  // Clean up expired files
  const cleanupExpired = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const result = await manager.cleanupExpiredFiles();
      
      if (result.deleted > 0) {
        // Refresh the list to remove deleted files
        await refresh();
      }

      toast({
        title: "Cleanup completed",
        description: `${result.deleted} expired files were cleaned up.`,
        variant: "default"
      });

      return result.deleted;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
      
      toast({
        title: "Cleanup failed",
        description: errorMessage,
        variant: "destructive"
      });

      return 0;
    }
  }, [user, manager, refresh]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<QuarantineListOptions>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters, offset: 0 },
      files: []
    }));
  }, []);

  // Selection management
  const selectFile = useCallback((fileId: string) => {
    setState(prev => ({
      ...prev,
      selectedFiles: new Set([...prev.selectedFiles, fileId])
    }));
  }, []);

  const deselectFile = useCallback((fileId: string) => {
    setState(prev => ({
      ...prev,
      selectedFiles: new Set([...prev.selectedFiles].filter(id => id !== fileId))
    }));
  }, []);

  const toggleFileSelection = useCallback((fileId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedFiles);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return { ...prev, selectedFiles: newSelected };
    });
  }, []);

  const selectAllFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFiles: new Set(prev.files.map(f => f.id))
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFiles: new Set()
    }));
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (options.autoRefresh && user) {
      const interval = setInterval(() => {
        loadStats();
      }, options.refreshInterval || 30000); // Default 30 seconds

      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, options.refreshInterval, user, loadStats]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadFiles();
      loadStats();
    }
  }, [user, state.filters, loadFiles, loadStats]);

  return {
    // State
    ...state,
    
    // Actions
    loadFiles,
    loadMore,
    refresh,
    loadStats,
    quarantineFile,
    restoreFile,
    deleteFile,
    bulkDeleteFiles,
    cleanupExpired,
    updateFilters,
    
    // Selection
    selectFile,
    deselectFile,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
    
    // Computed
    selectedCount: state.selectedFiles.size,
    canRestoreSelected: state.files
      .filter(f => state.selectedFiles.has(f.id))
      .every(f => f.can_restore),
    
    // Utilities
    manager
  };
}