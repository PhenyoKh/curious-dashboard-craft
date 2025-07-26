/**
 * Profile Picture Upload Component
 * Secure profile picture upload with integrated security scanning
 */

import React, { useState, useCallback, useRef } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFileSecurity } from '@/hooks/useFileSecurity';
import { useSecurityNotifications, createThreatDetectedNotification } from '@/hooks/useSecurityNotifications';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { FileSecurityResult } from '@/lib/security/FileSecurityValidator';

interface ProfilePictureUploadProps {
  currentImageUrl?: string | null;
  onImageUpdate: (imageUrl: string | null) => void;
  userInitials: string;
  className?: string;
}

interface UploadState {
  isScanning: boolean;
  isUploading: boolean;
  uploadProgress: number;
  securityResult: FileSecurityResult | null;
  selectedFile: File | null;
  previewUrl: string | null;
  showDialog: boolean;
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  onImageUpdate,
  userInitials,
  className = ''
}) => {
  const { scanFile } = useFileSecurity();
  const { addNotification } = useSecurityNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<UploadState>({
    isScanning: false,
    isUploading: false,
    uploadProgress: 0,
    securityResult: null,
    selectedFile: null,
    previewUrl: null,
    showDialog: false
  });

  // Reset upload state
  const resetUploadState = useCallback(() => {
    setUploadState({
      isScanning: false,
      isUploading: false,
      uploadProgress: 0,
      securityResult: null,
      selectedFile: null,
      previewUrl: null,
      showDialog: false
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, GIF, or WebP image.",
          variant: "destructive"
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB.",
          variant: "destructive"
        });
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      setUploadState(prev => ({
        ...prev,
        selectedFile: file,
        previewUrl,
        isScanning: true,
        showDialog: true
      }));

      // Perform security scan
      const securityResult = await scanFile(file);

      setUploadState(prev => ({
        ...prev,
        securityResult,
        isScanning: false
      }));

      // Handle security results
      if (!securityResult.allowUpload) {
        // File blocked - show threats
        if (securityResult.threats.length > 0) {
          const highestSeverity = securityResult.threats.reduce((max, threat) => {
            const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
            const currentSeverity = severityOrder[threat.severity as keyof typeof severityOrder] || 1;
            const maxSeverity = severityOrder[max as keyof typeof severityOrder] || 1;
            return currentSeverity > maxSeverity ? threat.severity : max;
          }, 'low') as 'low' | 'medium' | 'high' | 'critical';

          addNotification(createThreatDetectedNotification(
            file.name,
            securityResult.threats.length,
            highestSeverity,
            {
              fileName: file.name,
              fileSize: file.size,
              uploadType: 'profile_picture',
              threats: securityResult.threats.map(t => ({
                type: t.type,
                severity: t.severity,
                description: t.description
              }))
            }
          ));
        }

        toast({
          title: "Upload blocked",
          description: "This file contains security threats and cannot be uploaded.",
          variant: "destructive"
        });
        resetUploadState();
        return;
      }

      // If threats detected but upload allowed, show warning
      if (securityResult.threats.length > 0) {
        toast({
          title: "Security warning",
          description: `${securityResult.threats.length} potential issue(s) detected. Review before uploading.`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('File security scan failed:', error);
      toast({
        title: "Security scan failed",
        description: "Unable to scan file for security threats.",
        variant: "destructive"
      });
      resetUploadState();
    }
  }, [scanFile, addNotification]);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle upload confirmation
  const handleUploadConfirm = useCallback(async () => {
    const { selectedFile } = uploadState;
    if (!selectedFile) return;

    try {
      setUploadState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

      // Generate secure filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `profile_${timestamp}_${randomStr}.${fileExt}`;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          uploadProgress: Math.min(prev.uploadProgress + 10, 90)
        }));
      }, 200);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(`public/${fileName}`, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type
        });

      clearInterval(progressInterval);
      setUploadState(prev => ({ ...prev, uploadProgress: 100 }));

      if (error) {
        // If bucket doesn't exist, create it or use alternative bucket
        if (error.message.includes('Bucket not found')) {
          // Try uploading to images bucket as fallback
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('images')
            .upload(`profiles/${fileName}`, selectedFile, {
              cacheControl: '3600',
              upsert: false,
              contentType: selectedFile.type
            });

          if (fallbackError) {
            throw new Error(`Upload failed: ${fallbackError.message}`);
          }

          // Get public URL from images bucket
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(`profiles/${fileName}`);

          onImageUpdate(publicUrl);
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      } else {
        // Get public URL from profile-pictures bucket
        const { data: { publicUrl } } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(data.path);

        onImageUpdate(publicUrl);
      }

      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been uploaded successfully.",
      });

      resetUploadState();

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture.",
        variant: "destructive"
      });
      setUploadState(prev => ({ ...prev, isUploading: false, uploadProgress: 0 }));
    }
  }, [uploadState.selectedFile, onImageUpdate, resetUploadState]);

  // Handle remove profile picture
  const handleRemoveImage = useCallback(async () => {
    try {
      onImageUpdate(null);
      
      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed.",
      });
    } catch (error) {
      console.error('Failed to remove profile picture:', error);
      toast({
        title: "Remove failed",
        description: "Failed to remove profile picture.",
        variant: "destructive"
      });
    }
  }, [onImageUpdate]);

  // Get threat severity color
  const getThreatSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      {/* Profile Picture Display */}
      <div className="relative group">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          {currentImageUrl ? (
            <img 
              src={currentImageUrl} 
              alt="Profile picture" 
              className="w-full h-full object-cover"
              onError={() => onImageUpdate(null)} // Remove broken images
            />
          ) : (
            <span className="text-white font-medium text-xl">{userInitials}</span>
          )}
        </div>
        
        {/* Upload Button Overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          title="Change profile picture"
        >
          <Camera className="w-6 h-6 text-white" />
        </button>
        
        {/* Remove Button */}
        {currentImageUrl && (
          <button
            onClick={handleRemoveImage}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-md"
            title="Remove profile picture"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Upload Button */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="text-xs"
      >
        <Upload className="w-3 h-3 mr-1" />
        Upload Picture
      </Button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload Dialog */}
      <Dialog open={uploadState.showDialog} onOpenChange={(open) => !open && resetUploadState()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Profile Picture</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {uploadState.previewUrl && (
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                  <img 
                    src={uploadState.previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Scanning State */}
            {uploadState.isScanning && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Scanning for security threats...</span>
                </div>
                <Progress value={60} className="h-2" />
              </div>
            )}

            {/* Upload State */}
            {uploadState.isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="font-medium">{uploadState.uploadProgress}%</span>
                </div>
                <Progress value={uploadState.uploadProgress} className="h-2" />
              </div>
            )}

            {/* Security Results */}
            {uploadState.securityResult && !uploadState.isScanning && !uploadState.isUploading && (
              <div className="space-y-3">
                {uploadState.securityResult.isSecure ? (
                  <Alert className="border-green-200 bg-green-50">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      File passed security scan. Safe to upload.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {uploadState.securityResult.threats.length} security threat(s) detected. Upload blocked.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Threat Details */}
                {uploadState.securityResult.threats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Detected Issues:</h4>
                    {uploadState.securityResult.threats.slice(0, 3).map((threat, index) => (
                      <div key={index} className={cn("p-2 rounded border text-xs", getThreatSeverityColor(threat.severity))}>
                        <div className="font-medium">{threat.severity.toUpperCase()}: {threat.type}</div>
                        <div className="mt-1">{threat.description}</div>
                      </div>
                    ))}
                    {uploadState.securityResult.threats.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{uploadState.securityResult.threats.length - 3} more issue(s)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {uploadState.securityResult && !uploadState.isScanning && !uploadState.isUploading && (
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetUploadState}>
                  Cancel
                </Button>
                {uploadState.securityResult.allowUpload && (
                  <Button onClick={handleUploadConfirm}>
                    Upload Picture
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePictureUpload;