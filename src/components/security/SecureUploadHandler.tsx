/**
 * Secure Upload Handler Component
 * Integrates security scanning into file upload process
 */

import React, { useState, useCallback } from 'react';
import { Upload, Shield, AlertTriangle, CheckCircle, X, Eye, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFileSecurity } from '@/hooks/useFileSecurity';
import { useQuarantine } from '@/hooks/useQuarantine';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { 
  useSecurityNotifications, 
  createThreatDetectedNotification, 
  createFileQuarantinedNotification 
} from '@/hooks/useSecurityNotifications';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { FileSecurityResult, SecurityThreat } from '@/lib/security/FileSecurityValidator';
import { logger } from '@/utils/logger';

interface SecureUploadHandlerProps {
  onFileUploaded: (url: string, filename: string) => void;
  onError?: (error: Error) => void;
  acceptedTypes?: string[];
  maxFileSize?: number;
  className?: string;
}

interface UploadState {
  file: File | null;
  securityResult: FileSecurityResult | null;
  isScanning: boolean;
  isUploading: boolean;
  uploadProgress: number;
  showThreatDetails: boolean;
  userDecision: 'pending' | 'proceed' | 'quarantine' | 'cancel';
}

const SecureUploadHandler: React.FC<SecureUploadHandlerProps> = ({
  onFileUploaded,
  onError,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  className = ''
}) => {
  const { scanFile, isScanning } = useFileSecurity();
  const { quarantineFile } = useQuarantine();
  const { settings } = useSecuritySettings();
  const { addNotification } = useSecurityNotifications();
  
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    securityResult: null,
    isScanning: false,
    isUploading: false,
    uploadProgress: 0,
    showThreatDetails: false,
    userDecision: 'pending'
  });

  const resetUploadState = useCallback(() => {
    setUploadState({
      file: null,
      securityResult: null,
      isScanning: false,
      isUploading: false,
      uploadProgress: 0,
      showThreatDetails: false,
      userDecision: 'pending'
    });
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      // Basic validation
      if (!acceptedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `Only ${acceptedTypes.join(', ')} files are allowed.`,
          variant: "destructive"
        });
        return;
      }

      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${(maxFileSize / 1024 / 1024).toFixed(1)}MB.`,
          variant: "destructive"
        });
        return;
      }

      setUploadState(prev => ({
        ...prev,
        file,
        isScanning: true,
        userDecision: 'pending'
      }));

      // Perform security scan
      const result = await scanFile(file);

      setUploadState(prev => ({
        ...prev,
        securityResult: result,
        isScanning: false
      }));

      // Auto-handle based on security settings and scan results
      if (result.allowUpload && result.threats.length === 0) {
        // File is completely safe - proceed with upload
        await handleUpload(file, result);
      } else {
        // Create security notification for threats detected
        if (result.threats.length > 0) {
          const highestSeverity = result.threats.reduce((max, threat) => {
            const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
            const currentSeverity = severityOrder[threat.severity as keyof typeof severityOrder] || 1;
            const maxSeverity = severityOrder[max as keyof typeof severityOrder] || 1;
            return currentSeverity > maxSeverity ? threat.severity : max;
          }, 'low') as 'low' | 'medium' | 'high' | 'critical';

          addNotification(createThreatDetectedNotification(
            file.name,
            result.threats.length,
            highestSeverity,
            {
              fileName: file.name,
              fileSize: file.size,
              threats: result.threats.map(t => ({
                type: t.type,
                severity: t.severity,
                description: t.description
              }))
            }
          ));
        }

        if (!result.allowUpload || (settings?.auto_quarantine_suspicious && result.quarantineRecommended)) {
          // Auto-quarantine based on settings
          await handleQuarantine(file, result);
        } else {
          // Show user decision dialog for borderline cases
          setUploadState(prev => ({ ...prev, showThreatDetails: true }));
        }
      }

    } catch (error) {
      logger.error('File security scan failed:', error);
      onError?.(error instanceof Error ? error : new Error('Security scan failed'));
      resetUploadState();
    }
  }, [scanFile, acceptedTypes, maxFileSize, settings?.auto_quarantine_suspicious, onError, addNotification, handleQuarantine, handleUpload, resetUploadState]);

  const handleUpload = useCallback(async (file: File, securityResult: FileSecurityResult) => {
    try {
      setUploadState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

      // Generate secure filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const secureFileName = `secure_${timestamp}_${randomStr}.${fileExt}`;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          uploadProgress: Math.min(prev.uploadProgress + 10, 90)
        }));
      }, 200);

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('images')
        .upload(`public/${secureFileName}`, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      clearInterval(progressInterval);
      setUploadState(prev => ({ ...prev, uploadProgress: 100 }));

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(data.path);

      // Call success callback
      onFileUploaded(publicUrl, file.name);

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded securely.`,
        variant: "default"
      });

      resetUploadState();

    } catch (error) {
      logger.error('Upload failed:', error);
      onError?.(error instanceof Error ? error : new Error('Upload failed'));
      setUploadState(prev => ({ ...prev, isUploading: false, uploadProgress: 0 }));
    }
  }, [onFileUploaded, onError, resetUploadState]);

  const handleQuarantine = useCallback(async (file: File, securityResult: FileSecurityResult) => {
    try {
      await quarantineFile(file, securityResult, 'editor-upload');
      
      // Create quarantine notification
      addNotification(createFileQuarantinedNotification(
        file.name,
        securityResult.threats.length > 0 
          ? `${securityResult.threats.length} security threat${securityResult.threats.length > 1 ? 's' : ''} detected`
          : 'Suspicious file characteristics detected',
        {
          fileName: file.name,
          fileSize: file.size,
          threatCount: securityResult.threats.length,
          quarantineReason: securityResult.quarantineRecommended ? 'Automatic quarantine' : 'Manual quarantine'
        }
      ));
      
      toast({
        title: "File quarantined",
        description: `${file.name} has been quarantined due to security concerns.`,
        variant: "destructive"
      });

      resetUploadState();
    } catch (error) {
      logger.error('Quarantine failed:', error);
      onError?.(error instanceof Error ? error : new Error('Quarantine failed'));
    }
  }, [quarantineFile, addNotification, onError, resetUploadState]);

  const handleUserDecision = useCallback(async (decision: 'proceed' | 'quarantine' | 'cancel') => {
    const { file, securityResult } = uploadState;
    if (!file || !securityResult) return;

    setUploadState(prev => ({ ...prev, userDecision: decision, showThreatDetails: false }));

    try {
      switch (decision) {
        case 'proceed':
          await handleUpload(file, securityResult);
          break;
        case 'quarantine':
          await handleQuarantine(file, securityResult);
          break;
        case 'cancel':
          resetUploadState();
          break;
      }
    } catch (error) {
      logger.error(`Failed to ${decision} file:`, error);
      onError?.(error instanceof Error ? error : new Error(`Failed to ${decision} file`));
    }
  }, [uploadState, handleUpload, handleQuarantine, resetUploadState, onError]);

  const getThreatSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className={className}>
      {/* File Input */}
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
            className="hidden"
          />
          
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Upload a file</h3>
          <p className="mt-1 text-sm text-gray-500">
            Drag and drop or click to browse
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Accepted: {acceptedTypes.join(', ')} • Max: {formatFileSize(maxFileSize)}
          </p>
        </div>

        {/* Upload Progress */}
        {(uploadState.isScanning || uploadState.isUploading) && uploadState.file && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>
                  {uploadState.isScanning ? 'Scanning' : 'Uploading'} {uploadState.file.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {uploadState.isScanning ? 'Security scan in progress...' : 'Upload in progress...'}
                  </span>
                  <span className="font-medium">
                    {uploadState.isScanning ? '...' : `${uploadState.uploadProgress}%`}
                  </span>
                </div>
                
                {uploadState.isScanning ? (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                ) : (
                  <Progress value={uploadState.uploadProgress} className="w-full" />
                )}
                
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatFileSize(uploadState.file.size)}</span>
                  <span>•</span>
                  <span>{uploadState.file.type}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Results */}
        {uploadState.securityResult && !uploadState.isScanning && !uploadState.isUploading && (
          <Card className={uploadState.securityResult.isSecure ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center space-x-2">
                {uploadState.securityResult.isSecure ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                )}
                <span>Security Scan Complete</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {uploadState.securityResult.isSecure ? 'File is secure' : `${uploadState.securityResult.threats.length} threat(s) detected`}
                  </span>
                  <Badge className={uploadState.securityResult.allowUpload ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {uploadState.securityResult.allowUpload ? 'Upload Allowed' : 'Upload Blocked'}
                  </Badge>
                </div>

                {uploadState.securityResult.threats.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {uploadState.securityResult.threats.slice(0, 3).map((threat, index) => (
                        <Badge key={index} className={getThreatSeverityColor(threat.severity)}>
                          {threat.severity.toUpperCase()}
                        </Badge>
                      ))}
                      {uploadState.securityResult.threats.length > 3 && (
                        <Badge variant="secondary">
                          +{uploadState.securityResult.threats.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadState(prev => ({ ...prev, showThreatDetails: true }))}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Threat Details
                    </Button>
                  </div>
                )}

                {/* Action Buttons */}
                {uploadState.userDecision === 'pending' && (
                  <div className="flex space-x-2 pt-2 border-t">
                    {uploadState.securityResult.allowUpload && (
                      <Button
                        onClick={() => handleUserDecision('proceed')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Anyway
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => handleUserDecision('quarantine')}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Quarantine
                    </Button>
                    
                    <Button
                      onClick={() => handleUserDecision('cancel')}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Threat Details Dialog */}
      {uploadState.showThreatDetails && uploadState.securityResult && (
        <Dialog open={uploadState.showThreatDetails} onOpenChange={() => setUploadState(prev => ({ ...prev, showThreatDetails: false }))}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span>Security Threats Detected</span>
              </DialogTitle>
              <DialogDescription>
                The following security concerns were found in {uploadState.file?.name}:
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {uploadState.securityResult.threats.map((threat, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getThreatSeverityColor(threat.severity)}>
                      {threat.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500 font-mono">{threat.type}</span>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1">{threat.description}</h4>
                  <p className="text-sm text-gray-600 mb-2">{threat.recommendation}</p>
                  
                  {threat.details && Object.keys(threat.details).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <strong>Details:</strong> {JSON.stringify(threat.details, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="flex justify-between">
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleUserDecision('quarantine')}
                  variant="outline"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Quarantine File
                </Button>
                <Button
                  onClick={() => handleUserDecision('cancel')}
                  variant="outline"
                >
                  Cancel Upload
                </Button>
              </div>
              
              {uploadState.securityResult.allowUpload && (
                <Button
                  onClick={() => handleUserDecision('proceed')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Despite Risks
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SecureUploadHandler;