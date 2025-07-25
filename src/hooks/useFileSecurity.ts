/**
 * Custom hook for file security operations
 * Integrates FileSecurityValidator with React state management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FileSecurityValidator, 
  SecurityLevel, 
  type FileSecurityResult,
  type SecurityConfig 
} from '@/lib/security/FileSecurityValidator';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security/SecurityLogger';
import { useAuth } from '@/contexts/AuthContext';

export interface UseFileSecurityOptions {
  initialConfig?: Partial<SecurityConfig>;
  onThreatDetected?: (filename: string, result: FileSecurityResult) => void;
  onScanComplete?: (filename: string, result: FileSecurityResult) => void;
  onError?: (filename: string, error: Error) => void;
}

export interface FileSecurityState {
  isScanning: boolean;
  scanProgress: number;
  currentFile: string | null;
  results: Map<string, FileSecurityResult>;
  errors: Map<string, string>;
  totalScanned: number;
  threatsDetected: number;
  filesBlocked: number;
}

export function useFileSecurity(options: UseFileSecurityOptions = {}) {
  const { user } = useAuth();
  const [validator] = useState(() => new FileSecurityValidator(options.initialConfig));
  const [state, setState] = useState<FileSecurityState>({
    isScanning: false,
    scanProgress: 0,
    currentFile: null,
    results: new Map(),
    errors: new Map(),
    totalScanned: 0,
    threatsDetected: 0,
    filesBlocked: 0
  });

  const scanQueueRef = useRef<File[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update validator configuration
  const updateConfig = useCallback((newConfig: Partial<SecurityConfig>) => {
    validator.updateConfig(newConfig);
    
    // Log configuration change
    securityLogger.logSecuritySettingsChanged(
      'security_config',
      validator.getConfig(),
      { ...validator.getConfig(), ...newConfig }
    );
  }, [validator]);

  // Scan a single file
  const scanFile = useCallback(async (file: File): Promise<FileSecurityResult> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Log scan start
      await securityLogger.logFileScanStarted(file.name, file.size, file.type);

      // Update state
      setState(prev => ({
        ...prev,
        isScanning: true,
        currentFile: file.name,
        scanProgress: 0
      }));

      // Perform security scan
      const result = await validator.validateFile(file);

      // Update results
      setState(prev => {
        const newResults = new Map(prev.results);
        newResults.set(file.name, result);
        
        return {
          ...prev,
          results: newResults,
          totalScanned: prev.totalScanned + 1,
          threatsDetected: prev.threatsDetected + (result.threats.length > 0 ? 1 : 0),
          filesBlocked: prev.filesBlocked + (result.allowUpload ? 0 : 1),
          isScanning: false,
          currentFile: null,
          scanProgress: 100
        };
      });

      // Log scan completion
      await securityLogger.logFileScanCompleted(file.name, result);

      // Log individual threats
      for (const threat of result.threats) {
        await securityLogger.logThreatDetected(
          file.name,
          threat,
          { size: file.size, mime_type: file.type }
        );
      }

      // Call callbacks
      if (result.threats.length > 0) {
        options.onThreatDetected?.(file.name, result);
      }
      options.onScanComplete?.(file.name, result);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update error state
      setState(prev => {
        const newErrors = new Map(prev.errors);
        newErrors.set(file.name, errorMessage);
        
        return {
          ...prev,
          errors: newErrors,
          isScanning: false,
          currentFile: null
        };
      });

      // Log error
      await securityLogger.logEvent(
        SecurityEventType.FILE_SCAN_FAILED,
        SecurityEventSeverity.ERROR,
        `File scan failed for ${file.name}: ${errorMessage}`,
        { filename: file.name, error: errorMessage },
        { filename: file.name, size: file.size, mime_type: file.type }
      );

      options.onError?.(file.name, error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }, [user, validator, options]);

  // Scan multiple files in batch
  const scanFiles = useCallback(async (files: File[]): Promise<Map<string, FileSecurityResult>> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const results = new Map<string, FileSecurityResult>();
    const totalFiles = files.length;
    
    // Set up abort controller for cancellation
    abortControllerRef.current = new AbortController();
    scanQueueRef.current = [...files];

    setState(prev => ({
      ...prev,
      isScanning: true,
      scanProgress: 0,
      currentFile: null
    }));

    try {
      for (let i = 0; i < files.length; i++) {
        // Check for abort
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Scan cancelled by user');
        }

        const file = files[i];
        const progress = Math.round(((i + 1) / totalFiles) * 100);

        setState(prev => ({
          ...prev,
          currentFile: file.name,
          scanProgress: progress
        }));

        try {
          const result = await scanFile(file);
          results.set(file.name, result);
        } catch (error) {
          console.warn(`Failed to scan file ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }

      return results;

    } finally {
      setState(prev => ({
        ...prev,
        isScanning: false,
        currentFile: null,
        scanProgress: 100
      }));
      
      abortControllerRef.current = null;
      scanQueueRef.current = [];
    }
  }, [user, scanFile]);

  // Cancel ongoing scan
  const cancelScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState(prev => ({
      ...prev,
      isScanning: false,
      currentFile: null,
      scanProgress: 0
    }));
  }, []);

  // Clear scan results
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: new Map(),
      errors: new Map(),
      totalScanned: 0,
      threatsDetected: 0,
      filesBlocked: 0
    }));
  }, []);

  // Get result for specific file
  const getFileResult = useCallback((filename: string): FileSecurityResult | null => {
    return state.results.get(filename) || null;
  }, [state.results]);

  // Get error for specific file
  const getFileError = useCallback((filename: string): string | null => {
    return state.errors.get(filename) || null;
  }, [state.errors]);

  // Check if file is safe to upload
  const isFileSafe = useCallback((filename: string): boolean => {
    const result = state.results.get(filename);
    return result ? result.allowUpload : false;
  }, [state.results]);

  // Get threat summary
  const getThreatSummary = useCallback(() => {
    const threatCounts = new Map<string, number>();
    const severityCounts = new Map<string, number>();
    
    for (const result of state.results.values()) {
      for (const threat of result.threats) {
        threatCounts.set(threat.type, (threatCounts.get(threat.type) || 0) + 1);
        severityCounts.set(threat.severity, (severityCounts.get(threat.severity) || 0) + 1);
      }
    }

    return {
      threatTypes: Object.fromEntries(threatCounts),
      severityLevels: Object.fromEntries(severityCounts),
      totalThreats: Array.from(state.results.values()).reduce(
        (sum, result) => sum + result.threats.length, 0
      )
    };
  }, [state.results]);

  // Get current security level
  const getSecurityLevel = useCallback((): SecurityLevel => {
    return validator.getConfig().level;
  }, [validator]);

  // Set security level with logging
  const setSecurityLevel = useCallback((level: SecurityLevel) => {
    const oldLevel = validator.getConfig().level;
    validator.updateConfig({ level });
    
    securityLogger.logSecuritySettingsChanged('security_level', oldLevel, level);
  }, [validator]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    scanFile,
    scanFiles,
    cancelScan,
    clearResults,
    updateConfig,
    
    // Getters
    getFileResult,
    getFileError,
    isFileSafe,
    getThreatSummary,
    getSecurityLevel,
    setSecurityLevel,
    
    // Configuration
    config: validator.getConfig(),
    
    // Utilities
    validator
  };
}