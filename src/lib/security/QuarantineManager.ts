/**
 * Quarantine Manager for StudyFlow Security System
 * Manages quarantined files in Supabase with full recovery capabilities
 */

import { supabase } from '@/integrations/supabase/client';
import type { FileSecurityResult, SecurityThreat } from './FileSecurityValidator';
import { logger } from '@/utils/logger';

export interface QuarantinedFile {
  id: string;
  original_filename: string;
  quarantine_filename: string;
  file_size: number;
  mime_type: string;
  quarantine_reason: string;
  threats: SecurityThreat[];
  quarantined_at: string;
  user_id: string;
  can_restore: boolean;
  auto_delete_at?: string;
  metadata: {
    original_path?: string;
    scan_results: FileSecurityResult;
    user_agent?: string;
    ip_address?: string;
  };
}

export interface QuarantineStats {
  total_files: number;
  total_size: number;
  files_by_threat_type: Record<string, number>;
  files_by_severity: Record<string, number>;
  recent_quarantines: number; // Last 24 hours
  oldest_quarantine?: string;
}

export interface QuarantineListOptions {
  limit?: number;
  offset?: number;
  threat_type?: string;
  severity?: string;
  date_from?: Date;
  date_to?: Date;
  search?: string;
}

export class QuarantineManager {
  private readonly QUARANTINE_BUCKET = 'quarantine';
  private readonly FILES_TABLE = 'quarantined_files';
  private readonly DEFAULT_RETENTION_DAYS = 30;

  constructor() {
    this.ensureBucketExists();
  }

  /**
   * Quarantine a file with security scan results
   */
  async quarantineFile(
    file: File,
    securityResult: FileSecurityResult,
    originalPath?: string
  ): Promise<QuarantinedFile> {
    try {
      // Generate secure quarantine filename
      const quarantineFilename = this.generateQuarantineFilename(file.name);
      
      // Upload file to quarantine bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.QUARANTINE_BUCKET)
        .upload(quarantineFilename, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        throw new Error(`Failed to upload file to quarantine: ${uploadError.message}`);
      }

      // Calculate auto-delete date
      const autoDeleteDate = new Date();
      autoDeleteDate.setDate(autoDeleteDate.getDate() + this.DEFAULT_RETENTION_DAYS);

      // Create quarantine record in database
      const quarantineRecord = {
        original_filename: file.name,
        quarantine_filename: quarantineFilename,
        file_size: file.size,
        mime_type: file.type,
        quarantine_reason: this.generateQuarantineReason(securityResult.threats),
        threats: securityResult.threats,
        quarantined_at: new Date().toISOString(),
        user_id: await this.getCurrentUserId(),
        can_restore: this.canFileBeRestored(securityResult.threats),
        auto_delete_at: autoDeleteDate.toISOString(),
        metadata: {
          original_path: originalPath,
          scan_results: securityResult,
          user_agent: navigator.userAgent,
          ip_address: await this.getUserIpAddress()
        }
      };

      const { data: dbData, error: dbError } = await supabase
        .from(this.FILES_TABLE)
        .insert([quarantineRecord])
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from(this.QUARANTINE_BUCKET)
          .remove([quarantineFilename]);
        throw new Error(`Failed to create quarantine record: ${dbError.message}`);
      }

      return {
        id: dbData.id,
        ...quarantineRecord
      };

    } catch (error) {
      logger.error('Quarantine operation failed:', error);
      throw error;
    }
  }

  /**
   * List quarantined files with filtering and pagination
   */
  async listQuarantinedFiles(options: QuarantineListOptions = {}): Promise<{
    files: QuarantinedFile[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        limit = 20,
        offset = 0,
        threat_type,
        severity,
        date_from,
        date_to,
        search
      } = options;

      let query = supabase
        .from(this.FILES_TABLE)
        .select('*', { count: 'exact' })
        .eq('user_id', await this.getCurrentUserId())
        .order('quarantined_at', { ascending: false });

      // Apply filters
      if (threat_type) {
        query = query.contains('threats', [{ type: threat_type }]);
      }

      if (severity) {
        query = query.contains('threats', [{ severity }]);
      }

      if (date_from) {
        query = query.gte('quarantined_at', date_from.toISOString());
      }

      if (date_to) {
        query = query.lte('quarantined_at', date_to.toISOString());
      }

      if (search) {
        query = query.or(`original_filename.ilike.%${search}%,quarantine_reason.ilike.%${search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to list quarantined files: ${error.message}`);
      }

      return {
        files: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      };

    } catch (error) {
      logger.error('Failed to list quarantined files:', error);
      throw error;
    }
  }

  /**
   * Restore a quarantined file to normal storage
   */
  async restoreFile(quarantineId: string, targetBucket: string = 'images'): Promise<{
    success: boolean;
    publicUrl?: string;
    message: string;
  }> {
    try {
      // Get quarantine record
      const { data: quarantineRecord, error: fetchError } = await supabase
        .from(this.FILES_TABLE)
        .select('*')
        .eq('id', quarantineId)
        .eq('user_id', await this.getCurrentUserId())
        .single();

      if (fetchError || !quarantineRecord) {
        throw new Error('Quarantined file not found or access denied');
      }

      if (!quarantineRecord.can_restore) {
        return {
          success: false,
          message: 'File cannot be restored due to security policy'
        };
      }

      // Download file from quarantine
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(this.QUARANTINE_BUCKET)
        .download(quarantineRecord.quarantine_filename);

      if (downloadError || !fileData) {
        throw new Error('Failed to download file from quarantine');
      }

      // Generate new filename for restored file
      const restoredFilename = this.generateRestoredFilename(quarantineRecord.original_filename);

      // Upload to target bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(`public/${restoredFilename}`, fileData, {
          cacheControl: '3600',
          upsert: false,
          contentType: quarantineRecord.mime_type
        });

      if (uploadError) {
        throw new Error(`Failed to restore file: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(`public/${restoredFilename}`);

      // Update quarantine record to mark as restored
      await supabase
        .from(this.FILES_TABLE)
        .update({
          metadata: {
            ...quarantineRecord.metadata,
            restored_at: new Date().toISOString(),
            restored_filename: restoredFilename,
            restored_bucket: targetBucket
          }
        })
        .eq('id', quarantineId);

      return {
        success: true,
        publicUrl,
        message: 'File restored successfully'
      };

    } catch (error) {
      logger.error('File restoration failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Permanently delete a quarantined file
   */
  async deleteQuarantinedFile(quarantineId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get quarantine record
      const { data: quarantineRecord, error: fetchError } = await supabase
        .from(this.FILES_TABLE)
        .select('*')
        .eq('id', quarantineId)
        .eq('user_id', await this.getCurrentUserId())
        .single();

      if (fetchError || !quarantineRecord) {
        throw new Error('Quarantined file not found or access denied');
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from(this.QUARANTINE_BUCKET)
        .remove([quarantineRecord.quarantine_filename]);

      if (storageError) {
        logger.warn('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from(this.FILES_TABLE)
        .delete()
        .eq('id', quarantineId);

      if (dbError) {
        throw new Error(`Failed to delete quarantine record: ${dbError.message}`);
      }

      return {
        success: true,
        message: 'File permanently deleted'
      };

    } catch (error) {
      logger.error('File deletion failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Bulk delete multiple quarantined files
   */
  async bulkDeleteFiles(quarantineIds: string[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const id of quarantineIds) {
      try {
        const result = await this.deleteQuarantinedFile(id);
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`${id}: ${result.message}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Get quarantine statistics
   */
  async getQuarantineStats(): Promise<QuarantineStats> {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data: files, error } = await supabase
        .from(this.FILES_TABLE)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch quarantine stats: ${error.message}`);
      }

      const stats: QuarantineStats = {
        total_files: files.length,
        total_size: files.reduce((sum, file) => sum + file.file_size, 0),
        files_by_threat_type: {},
        files_by_severity: {},
        recent_quarantines: 0
      };

      // Analyze threats
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (const file of files) {
        // Count recent quarantines
        if (new Date(file.quarantined_at) > yesterday) {
          stats.recent_quarantines++;
        }

        // Count by threat type and severity
        for (const threat of file.threats) {
          stats.files_by_threat_type[threat.type] = 
            (stats.files_by_threat_type[threat.type] || 0) + 1;
          stats.files_by_severity[threat.severity] = 
            (stats.files_by_severity[threat.severity] || 0) + 1;
        }
      }

      // Find oldest quarantine
      if (files.length > 0) {
        const oldestFile = files.reduce((oldest, current) => 
          new Date(current.quarantined_at) < new Date(oldest.quarantined_at) ? current : oldest
        );
        stats.oldest_quarantine = oldestFile.quarantined_at;
      }

      return stats;

    } catch (error) {
      logger.error('Failed to get quarantine stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired quarantined files
   */
  async cleanupExpiredFiles(): Promise<{
    deleted: number;
    errors: string[];
  }> {
    try {
      const now = new Date().toISOString();
      const userId = await this.getCurrentUserId();
      
      // Find expired files
      const { data: expiredFiles, error: fetchError } = await supabase
        .from(this.FILES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .lte('auto_delete_at', now);

      if (fetchError) {
        throw new Error(`Failed to fetch expired files: ${fetchError.message}`);
      }

      const results = {
        deleted: 0,
        errors: [] as string[]
      };

      // Delete each expired file
      for (const file of expiredFiles || []) {
        try {
          const result = await this.deleteQuarantinedFile(file.id);
          if (result.success) {
            results.deleted++;
          } else {
            results.errors.push(`${file.original_filename}: ${result.message}`);
          }
        } catch (error) {
          results.errors.push(`${file.original_filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return results;

    } catch (error) {
      logger.error('Cleanup failed:', error);
      return {
        deleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Helper methods
  private generateQuarantineFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = originalFilename.split('.').pop() || 'bin';
    return `quarantine_${timestamp}_${randomStr}.${extension}`;
  }

  private generateRestoredFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const nameParts = originalFilename.split('.');
    const extension = nameParts.pop() || 'bin';
    const basename = nameParts.join('.');
    return `restored_${basename}_${timestamp}_${randomStr}.${extension}`;
  }

  private generateQuarantineReason(threats: SecurityThreat[]): string {
    if (threats.length === 0) return 'Unknown security concern';
    
    const criticalThreats = threats.filter(t => t.severity === 'critical');
    const highThreats = threats.filter(t => t.severity === 'high');
    
    if (criticalThreats.length > 0) {
      return `Critical threat: ${criticalThreats[0].description}`;
    }
    
    if (highThreats.length > 0) {
      return `High risk: ${highThreats[0].description}`;
    }
    
    return `Security concern: ${threats[0].description}`;
  }

  private canFileBeRestored(threats: SecurityThreat[]): boolean {
    // Files with critical threats cannot be restored
    const criticalThreats = threats.filter(t => t.severity === 'critical');
    return criticalThreats.length === 0;
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  private async getUserIpAddress(): Promise<string> {
    try {
      // In a real app, you might want to get this from your backend
      // For now, we'll use a placeholder
      return 'client-side';
    } catch {
      return 'unknown';
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      // Check if quarantine bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        logger.warn('Failed to check storage buckets:', error);
        return;
      }

      const quarantineBucketExists = buckets?.some(bucket => bucket.name === this.QUARANTINE_BUCKET);
      
      if (!quarantineBucketExists) {
        // Try to create the bucket (this might fail if user doesn't have permissions)
        const { error: createError } = await supabase.storage.createBucket(this.QUARANTINE_BUCKET, {
          public: false,
          allowedMimeTypes: ['*/*'],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB
        });

        if (createError) {
          logger.warn('Failed to create quarantine bucket:', createError);
        } else {
          logger.log('Quarantine bucket created successfully');
        }
      }
    } catch (error) {
      logger.warn('Error ensuring quarantine bucket exists:', error);
    }
  }

  /**
   * Download a quarantined file for inspection (admin only)
   */
  async downloadQuarantinedFile(quarantineId: string): Promise<{
    success: boolean;
    blob?: Blob;
    filename?: string;
    message: string;
  }> {
    try {
      // Get quarantine record
      const { data: quarantineRecord, error: fetchError } = await supabase
        .from(this.FILES_TABLE)
        .select('*')
        .eq('id', quarantineId)
        .eq('user_id', await this.getCurrentUserId())
        .single();

      if (fetchError || !quarantineRecord) {
        throw new Error('Quarantined file not found or access denied');
      }

      // Download file from quarantine
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(this.QUARANTINE_BUCKET)
        .download(quarantineRecord.quarantine_filename);

      if (downloadError || !fileData) {
        throw new Error('Failed to download file from quarantine');
      }

      return {
        success: true,
        blob: fileData,
        filename: quarantineRecord.original_filename,
        message: 'File downloaded successfully'
      };

    } catch (error) {
      logger.error('File download failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}