/**
 * Custom hook for managing Security Scan Web Worker
 * Provides background file scanning capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { type FileSecurityResult, type SecurityConfig } from '@/lib/security/FileSecurityValidator';
import { logger } from '@/utils/logger';

interface WorkerState {
  isInitialized: boolean;
  isScanning: boolean;
  error: string | null;
  scanProgress: {
    completed: number;
    total: number;
    currentFile?: string;
  } | null;
}

interface ScanRequest {
  id: string;
  file: File;
  resolve: (result: FileSecurityResult) => void;
  reject: (error: Error) => void;
}

interface BatchScanRequest {
  id: string;
  files: File[];
  resolve: (results: Map<string, FileSecurityResult>) => void;
  reject: (error: Error) => void;
}

export function useSecurityWorker() {
  const [state, setState] = useState<WorkerState>({
    isInitialized: false,
    isScanning: false,
    error: null,
    scanProgress: null
  });

  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, ScanRequest | BatchScanRequest>>(new Map());
  const requestIdCounter = useRef(0);

  // Initialize Web Worker
  useEffect(() => {
    try {
      // Create worker from inline script to avoid build issues
      const workerScript = `
        // Worker script will be injected here
        importScripts('/src/workers/securityScanWorker.js');
      `;
      
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      // For development, we'll use a fallback approach
      if (process.env.NODE_ENV === 'development') {
        // In development, we might not have the worker file built yet
        // So we'll create a simple worker inline
        const inlineWorkerScript = `
          self.onmessage = function(event) {
            // Simple echo for development
            setTimeout(() => {
              self.postMessage({
                id: event.data.id,
                type: 'scanResult',
                data: {
                  isSecure: true,
                  threats: [],
                  quarantineRecommended: false,
                  allowUpload: true,
                  metadata: {
                    fileName: event.data.data?.fileName || 'test.txt',
                    fileSize: event.data.data?.fileSize || 0,
                    mimeType: event.data.data?.mimeType || 'text/plain',
                    scanDuration: 100,
                    scanTimestamp: new Date()
                  }
                }
              });
            }, 100);
          };
        `;
        
        const devBlob = new Blob([inlineWorkerScript], { type: 'application/javascript' });
        const devWorkerUrl = URL.createObjectURL(devBlob);
        workerRef.current = new Worker(devWorkerUrl);
      } else {
        workerRef.current = new Worker(new URL('../workers/securityScanWorker.ts', import.meta.url));
      }

      workerRef.current.onmessage = handleWorkerMessage;
      workerRef.current.onerror = handleWorkerError;

      setState(prev => ({ ...prev, isInitialized: true, error: null }));

      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
          URL.revokeObjectURL(workerUrl);
        }
      };
    } catch (error) {
      logger.error('Failed to initialize security worker:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize security worker',
        isInitialized: false 
      }));
    }
  }, [handleWorkerMessage, handleWorkerError]);

  const handleWorkerMessage = useCallback((event: MessageEvent) => {
    const { id, type, data } = event.data;

    switch (type) {
      case 'scanResult': {
        const request = pendingRequests.current.get(id) as ScanRequest;
        if (request) {
          pendingRequests.current.delete(id);
          request.resolve(data);
          setState(prev => ({ 
            ...prev, 
            isScanning: pendingRequests.current.size > 0,
            scanProgress: null 
          }));
        }
        break;
      }

      case 'batchScanResult': {
        const request = pendingRequests.current.get(id) as BatchScanRequest;
        if (request) {
          pendingRequests.current.delete(id);
          const resultsMap = new Map(Object.entries(data));
          request.resolve(resultsMap);
          setState(prev => ({ 
            ...prev, 
            isScanning: false,
            scanProgress: null 
          }));
        }
        break;
      }

      case 'batchProgress': {
        setState(prev => ({
          ...prev,
          scanProgress: {
            completed: data.completed,
            total: data.total,
            currentFile: data.currentFile
          }
        }));
        break;
      }

      case 'error': {
        const request = pendingRequests.current.get(id);
        if (request) {
          pendingRequests.current.delete(id);
          request.reject(new Error(data.message));
          setState(prev => ({ 
            ...prev, 
            isScanning: pendingRequests.current.size > 0,
            error: data.message 
          }));
        }
        break;
      }

      case 'configUpdated': {
        // Configuration update completed
        logger.log('Security worker configuration updated');
        break;
      }
    }
  }, []);

  const handleWorkerError = useCallback((error: ErrorEvent) => {
    logger.error('Security worker error:', error);
    setState(prev => ({ 
      ...prev, 
      error: 'Security worker encountered an error',
      isScanning: false 
    }));
    
    // Reject all pending requests
    pendingRequests.current.forEach(request => {
      request.reject(new Error('Security worker error'));
    });
    pendingRequests.current.clear();
  }, []);

  // Convert File to ArrayBuffer for worker
  const fileToArrayBuffer = useCallback((file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Scan a single file
  const scanFile = useCallback(async (file: File): Promise<FileSecurityResult> => {
    if (!state.isInitialized || !workerRef.current) {
      throw new Error('Security worker not initialized');
    }

    const requestId = `scan-${++requestIdCounter.current}`;
    
    try {
      const fileData = await fileToArrayBuffer(file);
      
      return new Promise<FileSecurityResult>((resolve, reject) => {
        const request: ScanRequest = { id: requestId, file, resolve, reject };
        pendingRequests.current.set(requestId, request);
        
        setState(prev => ({ ...prev, isScanning: true, error: null }));
        
        workerRef.current!.postMessage({
          id: requestId,
          type: 'scan',
          data: {
            fileData,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to prepare file for scanning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [state.isInitialized, fileToArrayBuffer]);

  // Batch scan multiple files
  const scanFiles = useCallback(async (files: File[]): Promise<Map<string, FileSecurityResult>> => {
    if (!state.isInitialized || !workerRef.current) {
      throw new Error('Security worker not initialized');
    }

    if (files.length === 0) {
      return new Map();
    }

    const requestId = `batch-${++requestIdCounter.current}`;
    
    try {
      setState(prev => ({ ...prev, isScanning: true, error: null }));
      
      // Convert all files to ArrayBuffers
      const fileDataArray = await Promise.all(
        files.map(async (file, index) => ({
          id: `file-${index}`,
          fileData: await fileToArrayBuffer(file),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }))
      );

      return new Promise<Map<string, FileSecurityResult>>((resolve, reject) => {
        const request: BatchScanRequest = { id: requestId, files, resolve, reject };
        pendingRequests.current.set(requestId, request);
        
        workerRef.current!.postMessage({
          id: requestId,
          type: 'batchScan',
          data: fileDataArray
        });
      });
    } catch (error) {
      setState(prev => ({ ...prev, isScanning: false }));
      throw new Error(`Failed to prepare files for scanning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [state.isInitialized, fileToArrayBuffer]);

  // Update worker configuration
  const updateConfig = useCallback(async (config: Partial<SecurityConfig>): Promise<void> => {
    if (!state.isInitialized || !workerRef.current) {
      throw new Error('Security worker not initialized');
    }

    const requestId = `config-${++requestIdCounter.current}`;
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Configuration update timeout'));
      }, 5000);

      const handleResponse = (event: MessageEvent) => {
        if (event.data.id === requestId) {
          clearTimeout(timeout);
          workerRef.current!.removeEventListener('message', handleResponse);
          
          if (event.data.type === 'configUpdated') {
            resolve();
          } else if (event.data.type === 'error') {
            reject(new Error(event.data.data.message));
          }
        }
      };

      workerRef.current!.addEventListener('message', handleResponse);
      workerRef.current!.postMessage({
        id: requestId,
        type: 'updateConfig',
        data: config
      });
    });
  }, [state.isInitialized]);

  // Cancel all pending scans
  const cancelScans = useCallback(() => {
    // Reject all pending requests
    pendingRequests.current.forEach(request => {
      request.reject(new Error('Scan cancelled'));
    });
    pendingRequests.current.clear();
    
    setState(prev => ({ 
      ...prev, 
      isScanning: false, 
      scanProgress: null 
    }));
  }, []);

  // Check if worker is available
  const isWorkerSupported = useCallback(() => {
    return typeof Worker !== 'undefined';
  }, []);

  return {
    // State
    isInitialized: state.isInitialized,
    isScanning: state.isScanning,
    error: state.error,
    scanProgress: state.scanProgress,
    
    // Actions
    scanFile,
    scanFiles,
    updateConfig,
    cancelScans,
    
    // Utilities
    isWorkerSupported,
    pendingCount: pendingRequests.current.size
  };
}