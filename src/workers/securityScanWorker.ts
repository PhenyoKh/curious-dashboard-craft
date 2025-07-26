/**
 * Security Scan Web Worker
 * Performs file security scanning in background thread for better performance
 */

import { FileSecurityValidator, SecurityLevel, type FileSecurityResult, type SecurityConfig } from '../lib/security/FileSecurityValidator';

// Worker message types
interface WorkerMessage {
  id: string;
  type: 'scan' | 'updateConfig' | 'getConfig';
  data?: any;
}

interface ScanMessage extends WorkerMessage {
  type: 'scan';
  data: {
    fileData: ArrayBuffer;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

interface UpdateConfigMessage extends WorkerMessage {
  type: 'updateConfig';
  data: Partial<SecurityConfig>;
}

interface WorkerResponse {
  id: string;
  type: 'scanResult' | 'configUpdated' | 'config' | 'error';
  data?: any;
}

// Global validator instance
let validator: FileSecurityValidator;

// Initialize validator with default config
const initializeValidator = () => {
  validator = new FileSecurityValidator({
    level: SecurityLevel.BALANCED,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    enableHeuristicScanning: true,
    enableArchiveScanning: true,
    enableImageValidation: true
  });
};

// Convert ArrayBuffer to File-like object for scanning
const createFileFromBuffer = (buffer: ArrayBuffer, name: string, type: string): File => {
  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
};

// Enhanced file scanning with detailed progress
const scanFileInWorker = async (
  fileData: ArrayBuffer,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<FileSecurityResult> => {
  try {
    // Create file object from buffer
    const file = createFileFromBuffer(fileData, fileName, mimeType);
    
    // Perform comprehensive security scan
    const result = await validator.validateFile(file);
    
    return result;
  } catch (error) {
    throw new Error(`Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Batch scanning for multiple files
const scanMultipleFiles = async (files: Array<{
  fileData: ArrayBuffer;
  fileName: string;
  fileSize: number;
  mimeType: string;
  id: string;
}>): Promise<Map<string, FileSecurityResult>> => {
  const results = new Map<string, FileSecurityResult>();
  
  for (const fileInfo of files) {
    try {
      const result = await scanFileInWorker(
        fileInfo.fileData,
        fileInfo.fileName,
        fileInfo.fileSize,
        fileInfo.mimeType
      );
      results.set(fileInfo.id, result);
      
      // Send progress update
      self.postMessage({
        id: 'batch-progress',
        type: 'batchProgress',
        data: {
          completed: results.size,
          total: files.length,
          currentFile: fileInfo.fileName
        }
      });
      
    } catch (error) {
      console.error(`Failed to scan ${fileInfo.fileName}:`, error);
      // Continue with other files even if one fails
    }
  }
  
  return results;
};

// Message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;
  
  try {
    switch (type) {
      case 'scan': {
        const scanData = data as ScanMessage['data'];
        const result = await scanFileInWorker(
          scanData.fileData,
          scanData.fileName,
          scanData.fileSize,
          scanData.mimeType
        );
        
        self.postMessage({
          id,
          type: 'scanResult',
          data: result
        } as WorkerResponse);
        break;
      }
      
      case 'batchScan': {
        const batchData = data as Array<{
          fileData: ArrayBuffer;
          fileName: string;
          fileSize: number;
          mimeType: string;
          id: string;
        }>;
        
        const results = await scanMultipleFiles(batchData);
        
        self.postMessage({
          id,
          type: 'batchScanResult',
          data: Object.fromEntries(results)
        } as WorkerResponse);
        break;
      }
      
      case 'updateConfig': {
        const configUpdate = data as Partial<SecurityConfig>;
        validator.updateConfig(configUpdate);
        
        self.postMessage({
          id,
          type: 'configUpdated',
          data: { success: true }
        } as WorkerResponse);
        break;
      }
      
      case 'getConfig': {
        const config = validator.getConfig();
        
        self.postMessage({
          id,
          type: 'config',
          data: config
        } as WorkerResponse);
        break;
      }
      
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    } as WorkerResponse);
  }
};

// Initialize on worker startup
initializeValidator();

// Export types for TypeScript support (these won't be included in the worker bundle)
export type {
  WorkerMessage,
  ScanMessage,
  UpdateConfigMessage,
  WorkerResponse
};