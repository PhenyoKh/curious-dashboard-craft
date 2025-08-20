/**
 * Comprehensive Client-Side File Security Validator
 * Multi-layer security scanning for StudyFlow note-taking app
 * Protects users from malicious uploads while providing seamless experience
 */

import type { SecuritySettingValue } from './SecurityLogger';
import { logger } from '@/utils/logger';

export enum SecurityLevel {
  STRICT = 'strict',
  BALANCED = 'balanced', 
  PERMISSIVE = 'permissive'
}

export enum ThreatType {
  // File Extension Threats
  DANGEROUS_EXTENSION = 'dangerous_extension',
  DISGUISED_EXECUTABLE = 'disguised_executable',
  
  // Archive Threats  
  ZIP_BOMB = 'zip_bomb',
  DIRECTORY_TRAVERSAL = 'directory_traversal',
  NESTED_ARCHIVE_LIMIT = 'nested_archive_limit',
  
  // Content Threats
  SCRIPT_INJECTION = 'script_injection',
  HTML_INJECTION = 'html_injection',
  MALICIOUS_POLYGLOT = 'malicious_polyglot',
  
  // File Structure Threats
  CORRUPTED_FILE = 'corrupted_file',
  SUSPICIOUS_HEADER = 'suspicious_header',
  OVERSIZED_FILE = 'oversized_file',
  COMPRESSION_RATIO_ATTACK = 'compression_ratio_attack',
  
  // Behavioral Threats
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  POTENTIAL_VIRUS = 'potential_virus'
}

export interface SecurityThreat {
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  details?: Record<string, SecuritySettingValue>;
}

export interface FileSecurityResult {
  isSecure: boolean;
  threats: SecurityThreat[];
  quarantineRecommended: boolean;
  allowUpload: boolean;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    actualType?: string;
    scanDuration: number;
    scanTimestamp: Date;
  };
}

export interface SecurityConfig {
  level: SecurityLevel;
  maxFileSize: number; // bytes
  maxArchiveDepth: number;
  maxCompressionRatio: number;
  allowedExtensions: Set<string>;
  blockedExtensions: Set<string>;
  allowedMimeTypes: Set<string>;
  enableHeuristicScanning: boolean;
  enableArchiveScanning: boolean;
  enableImageValidation: boolean;
  customPatterns: RegExp[];
}

export class FileSecurityValidator {
  private config: SecurityConfig;
  
  // Dangerous file extensions that should always be blocked
  private static readonly DANGEROUS_EXTENSIONS = new Set([
    // Executables
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'jar', 'app', 'deb', 'pkg', 'dmg',
    
    // Scripts
    'js', 'vbs', 'vbe', 'ps1', 'ps2', 'psc1', 'psc2', 'msh', 'msh1', 'msh2',
    'mshxml', 'msh1xml', 'msh2xml', 'scf', 'lnk', 'inf', 'reg',
    
    // Archives that commonly hide malware
    'ace', 'arj', 'cab', 'lzh', 'uue', 'z', 'zoo',
    
    // Macro-enabled documents
    'docm', 'xlsm', 'pptm', 'dotm', 'xltm', 'potm'
  ]);

  // File magic numbers for common file types
  private static readonly MAGIC_NUMBERS = new Map<string, Uint8Array[]>([
    ['exe', [new Uint8Array([0x4D, 0x5A])]],                    // PE executable
    ['elf', [new Uint8Array([0x7F, 0x45, 0x4C, 0x46])]],       // ELF executable
    ['macho32', [new Uint8Array([0xFE, 0xED, 0xFA, 0xCE])]],   // Mach-O 32-bit
    ['macho64', [new Uint8Array([0xFE, 0xED, 0xFA, 0xCF])]],   // Mach-O 64-bit
    ['zip', [new Uint8Array([0x50, 0x4B, 0x03, 0x04]), new Uint8Array([0x50, 0x4B, 0x05, 0x06])]],
    ['rar', [new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00])]],
    ['7z', [new Uint8Array([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])]],
    ['jpg', [new Uint8Array([0xFF, 0xD8, 0xFF])]],
    ['png', [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])]],
    ['gif', [new Uint8Array([0x47, 0x49, 0x46, 0x38]), new Uint8Array([0x47, 0x49, 0x46, 0x39])]],
    ['pdf', [new Uint8Array([0x25, 0x50, 0x44, 0x46])]],
    ['webp', [new Uint8Array([0x52, 0x49, 0x46, 0x46])]]
  ]);

  // Suspicious content patterns
  private static readonly MALICIOUS_PATTERNS = [
    // Script injection patterns
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    
    // HTML injection
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /<link[\s\S]*?>/gi,
    
    // PHP code injection
    /<\?php[\s\S]*?\?>/gi,
    /<\?[\s\S]*?\?>/gi,
    
    // SQL injection patterns
    /union\s+select/gi,
    /drop\s+table/gi,
    /exec\s*\(/gi,
    
    // Command injection
    /\|\s*[a-z]/gi,
    /&&\s*[a-z]/gi,
    /;\s*[a-z]/gi,
    
    // Common malware strings
    /eval\s*\(/gi,
    /base64_decode/gi,
    /shell_exec/gi,
    /system\s*\(/gi,
    /passthru/gi,
    
    // Suspicious URLs
    /http:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/gi,
    
    // Template injection
    /\{\{[\s\S]*?\}\}/gi,
    /\$\{[\s\S]*?\}/gi,
    /#\{[\s\S]*?\}/gi
  ];

  constructor(config?: Partial<SecurityConfig>) {
    this.config = this.mergeConfig(config);
  }

  private mergeConfig(config?: Partial<SecurityConfig>): SecurityConfig {
    const defaultConfig: SecurityConfig = {
      level: SecurityLevel.BALANCED,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxArchiveDepth: 3,
      maxCompressionRatio: 1000,
      allowedExtensions: new Set([
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
        // Documents  
        'pdf', 'txt', 'md', 'rtf', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp',
        // Archives (with deep scanning)
        'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
        // Code files (safe viewing)
        'json', 'xml', 'csv', 'log', 'yaml', 'yml',
        // Media (basic validation)
        'mp3', 'mp4', 'wav', 'avi', 'mov', 'wmv'
      ]),
      blockedExtensions: FileSecurityValidator.DANGEROUS_EXTENSIONS,
      allowedMimeTypes: new Set([
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'text/markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        'application/json', 'application/xml', 'text/csv'
      ]),
      enableHeuristicScanning: true,
      enableArchiveScanning: true,
      enableImageValidation: true,
      customPatterns: []
    };

    return {
      ...defaultConfig,
      ...config,
      allowedExtensions: config?.allowedExtensions || defaultConfig.allowedExtensions,
      blockedExtensions: config?.blockedExtensions || defaultConfig.blockedExtensions,
      allowedMimeTypes: config?.allowedMimeTypes || defaultConfig.allowedMimeTypes,
      customPatterns: [...defaultConfig.customPatterns, ...(config?.customPatterns || [])]
    };
  }

  /**
   * Main security validation method
   */
  async validateFile(file: File): Promise<FileSecurityResult> {
    const startTime = Date.now();
    const threats: SecurityThreat[] = [];
    
    try {
      // 1. Basic file validation
      threats.push(...await this.validateBasicFile(file));
      
      // 2. Extension validation
      threats.push(...this.validateFileExtension(file));
      
      // 3. Magic number verification  
      threats.push(...await this.validateMagicNumbers(file));
      
      // 4. Content analysis
      if (this.config.enableHeuristicScanning) {
        threats.push(...await this.performHeuristicAnalysis(file));
      }
      
      // 5. Archive deep scanning
      if (this.config.enableArchiveScanning && this.isArchiveFile(file)) {
        threats.push(...await this.scanArchiveContents(file));
      }
      
      // 6. Image structure validation
      if (this.config.enableImageValidation && this.isImageFile(file)) {
        threats.push(...await this.validateImageStructure(file));
      }
      
      // Determine security result
      const criticalThreats = threats.filter(t => t.severity === 'critical');
      const highThreats = threats.filter(t => t.severity === 'high');
      
      const allowUpload = this.shouldAllowUpload(threats);
      const quarantineRecommended = this.shouldQuarantine(threats);
      
      return {
        isSecure: threats.length === 0,
        threats,
        quarantineRecommended,
        allowUpload,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          scanDuration: Date.now() - startTime,
          scanTimestamp: new Date()
        }
      };
      
    } catch (error) {
      threats.push({
        type: ThreatType.SUSPICIOUS_PATTERN,
        severity: 'high',
        description: 'Security scan failed',
        recommendation: 'File rejected due to scan failure',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      
      return {
        isSecure: false,
        threats,
        quarantineRecommended: true,
        allowUpload: false,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          scanDuration: Date.now() - startTime,
          scanTimestamp: new Date()
        }
      };
    }
  }

  private async validateBasicFile(file: File): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    
    // File size validation
    if (file.size > this.config.maxFileSize) {
      threats.push({
        type: ThreatType.OVERSIZED_FILE,
        severity: 'medium',
        description: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed (${this.formatFileSize(this.config.maxFileSize)})`,
        recommendation: 'Reduce file size or contact administrator',
        details: { fileSize: file.size, maxSize: this.config.maxFileSize }
      });
    }
    
    // Suspicious file size (too small for claimed type)
    if (file.size < 10 && file.type.startsWith('image/')) {
      threats.push({
        type: ThreatType.SUSPICIOUS_PATTERN,
        severity: 'medium',
        description: 'Image file unusually small, may be corrupted or disguised',
        recommendation: 'Verify file integrity'
      });
    }
    
    // Empty file check
    if (file.size === 0) {
      threats.push({
        type: ThreatType.CORRUPTED_FILE,
        severity: 'low',
        description: 'File is empty',
        recommendation: 'Upload a valid file with content'
      });
    }
    
    return threats;
  }

  private validateFileExtension(file: File): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop() || '';
    
    // Check for dangerous extensions
    if (this.config.blockedExtensions.has(extension)) {
      threats.push({
        type: ThreatType.DANGEROUS_EXTENSION,
        severity: 'critical',
        description: `File extension '.${extension}' is blocked for security reasons`,
        recommendation: 'File type not allowed. Use a different file format.',
        details: { extension, fileName }
      });
    }
    
    // Check if extension is in allowed list (for strict mode)
    if (this.config.level === SecurityLevel.STRICT && !this.config.allowedExtensions.has(extension)) {
      threats.push({
        type: ThreatType.DANGEROUS_EXTENSION,
        severity: 'high',
        description: `File extension '.${extension}' is not in the allowed list`,
        recommendation: 'Use only approved file types',
        details: { extension, allowedExtensions: Array.from(this.config.allowedExtensions) }
      });
    }
    
    // Multiple extensions check (double extension attack)
    const extensionCount = fileName.split('.').length - 1;
    if (extensionCount > 2) {
      threats.push({
        type: ThreatType.SUSPICIOUS_PATTERN,
        severity: 'medium',
        description: 'File has multiple extensions, which may indicate an attempt to disguise file type',
        recommendation: 'Use files with single, clear extensions',
        details: { fileName, extensionCount }
      });
    }
    
    return threats;
  }

  private async validateMagicNumbers(file: File): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    
    try {
      // Read first 32 bytes for magic number analysis
      const headerBytes = await this.readFileHeader(file, 32);
      
      // Check for executable headers
      const executableTypes = ['exe', 'elf', 'macho32', 'macho64'];
      for (const type of executableTypes) {
        const magicNumbers = FileSecurityValidator.MAGIC_NUMBERS.get(type);
        if (magicNumbers && this.containsMagicNumber(headerBytes, magicNumbers)) {
          threats.push({
            type: ThreatType.DISGUISED_EXECUTABLE,
            severity: 'critical',
            description: `File contains ${type.toUpperCase()} executable header but has different extension`,
            recommendation: 'Executable files are not allowed',
            details: { detectedType: type, claimedType: file.type }
          });
        }
      }
      
      // Verify claimed file type matches magic number
      const expectedType = this.getExpectedTypeFromMime(file.type);
      if (expectedType) {
        const expectedMagicNumbers = FileSecurityValidator.MAGIC_NUMBERS.get(expectedType);
        if (expectedMagicNumbers && !this.containsMagicNumber(headerBytes, expectedMagicNumbers)) {
          // Only flag as threat if it's not a text file (which may not have magic numbers)
          if (!file.type.startsWith('text/') && file.type !== 'application/json') {
            threats.push({
              type: ThreatType.SUSPICIOUS_HEADER,
              severity: 'medium',
              description: `File header doesn't match claimed type (${file.type})`,
              recommendation: 'File may be corrupted or disguised',
              details: { claimedType: file.type, expectedType }
            });
          }
        }
      }
      
    } catch (error) {
      threats.push({
        type: ThreatType.CORRUPTED_FILE,
        severity: 'low',
        description: 'Unable to read file header',
        recommendation: 'File may be corrupted',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
    
    return threats;
  }

  private async performHeuristicAnalysis(file: File): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    
    try {
      // For text-based files, analyze content
      if (this.isTextFile(file) || file.size < 1024 * 1024) { // Only analyze files < 1MB for performance
        const content = await this.readFileAsText(file);
        
        // Check for malicious patterns
        for (const pattern of FileSecurityValidator.MALICIOUS_PATTERNS) {
          if (pattern.test(content)) {
            threats.push({
              type: ThreatType.SCRIPT_INJECTION,
              severity: 'high',
              description: 'File contains potentially malicious code patterns',
              recommendation: 'Remove suspicious code or use a different file',
              details: { patternFound: pattern.source }
            });
          }
        }
        
        // Check custom patterns
        for (const pattern of this.config.customPatterns) {
          if (pattern.test(content)) {
            threats.push({
              type: ThreatType.SUSPICIOUS_PATTERN,
              severity: 'medium',
              description: 'File matches custom security pattern',
              recommendation: 'Review file content for security issues'
            });
          }
        }
        
        // Check for base64 encoded content (potential payload hiding)
        const base64Matches = content.match(/[A-Za-z0-9+/]{50,}={0,2}/g);
        if (base64Matches && base64Matches.length > 5) {
          threats.push({
            type: ThreatType.SUSPICIOUS_PATTERN,
            severity: 'medium',
            description: 'File contains multiple base64-encoded strings',
            recommendation: 'Verify encoded content is legitimate',
            details: { base64Count: base64Matches.length }
          });
        }
      }
      
    } catch (error) {
      // Non-critical error, just log it
      logger.warn('Heuristic analysis failed:', error);
    }
    
    return threats;
  }

  private async scanArchiveContents(file: File): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    
    // Note: In a real implementation, you'd use a JavaScript ZIP library
    // For now, we'll do basic ZIP header analysis
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const headerBytes = await this.readFileHeader(file, 1024);
        
        // Check for ZIP bomb indicators (many small files)
        const centralDirRecords = this.countZipCentralDirectoryRecords(headerBytes);
        if (centralDirRecords > 1000) {
          threats.push({
            type: ThreatType.ZIP_BOMB,
            severity: 'high',
            description: `Archive contains ${centralDirRecords} files, potential ZIP bomb`,
            recommendation: 'Archive has too many files, may be malicious',
            details: { fileCount: centralDirRecords }
          });
        }
        
        // Check compression ratio
        const compressionRatio = file.size > 0 ? (centralDirRecords * 1000) / file.size : 0;
        if (compressionRatio > this.config.maxCompressionRatio) {
          threats.push({
            type: ThreatType.COMPRESSION_RATIO_ATTACK,
            severity: 'high',
            description: 'Archive has suspicious compression ratio',
            recommendation: 'Archive may be a compression bomb',
            details: { compressionRatio }
          });
        }
      }
      
    } catch (error) {
      threats.push({
        type: ThreatType.CORRUPTED_FILE,
        severity: 'medium',
        description: 'Unable to analyze archive contents',
        recommendation: 'Archive may be corrupted or use unsupported format'
      });
    }
    
    return threats;
  }

  private async validateImageStructure(file: File): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    
    try {
      // For images, check for polyglot files (files that are valid in multiple formats)
      const headerBytes = await this.readFileHeader(file, 512);
      
      // Check if image file contains script tags (SVG XSS)
      if (file.type === 'image/svg+xml') {
        const content = await this.readFileAsText(file);
        if (/<script/i.test(content) || /javascript:/i.test(content)) {
          threats.push({
            type: ThreatType.SCRIPT_INJECTION,
            severity: 'high',
            description: 'SVG file contains JavaScript code',
            recommendation: 'Remove JavaScript from SVG files',
            details: { fileType: 'svg' }
          });
        }
      }
      
      // Check for suspicious content in image files
      if (this.isImageFile(file)) {
        // Look for embedded executables or scripts
        const content = await this.readFileAsText(file, 'binary');
        if (content.includes('MZ') || content.includes('#!/bin/')) {
          threats.push({
            type: ThreatType.MALICIOUS_POLYGLOT,
            severity: 'high',
            description: 'Image file may contain embedded executable code',
            recommendation: 'Use image editing software to clean the file',
            details: { suspiciousContent: 'executable_signature' }
          });
        }
      }
      
    } catch (error) {
      logger.warn('Image validation failed:', error);
    }
    
    return threats;
  }

  // Helper methods
  private shouldAllowUpload(threats: SecurityThreat[]): boolean {
    if (this.config.level === SecurityLevel.PERMISSIVE) {
      return !threats.some(t => t.severity === 'critical');
    }
    
    if (this.config.level === SecurityLevel.STRICT) {
      return threats.length === 0;
    }
    
    // Balanced mode - allow if no critical or high threats
    return !threats.some(t => t.severity === 'critical' || t.severity === 'high');
  }

  private shouldQuarantine(threats: SecurityThreat[]): boolean {
    return threats.length > 0 && threats.some(t => 
      t.severity === 'high' || t.severity === 'critical'
    );
  }

  private isArchiveFile(file: File): boolean {
    const archiveTypes = ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'];
    const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    return archiveTypes.includes(file.type) || archiveExtensions.includes(extension);
  }

  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  private isTextFile(file: File): boolean {
    return file.type.startsWith('text/') || 
           file.type === 'application/json' ||
           file.type === 'application/xml' ||
           ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(
             file.name.split('.').pop()?.toLowerCase() || ''
           );
  }

  private async readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const blob = file.slice(0, bytes);
      
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  private async readFileAsText(file: File, encoding: 'utf-8' | 'binary' = 'utf-8'): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => reject(reader.error);
      
      if (encoding === 'binary') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file, encoding);
      }
    });
  }

  private containsMagicNumber(bytes: Uint8Array, magicNumbers: Uint8Array[]): boolean {
    return magicNumbers.some(magic => {
      if (bytes.length < magic.length) return false;
      
      for (let i = 0; i < magic.length; i++) {
        if (bytes[i] !== magic[i]) return false;
      }
      return true;
    });
  }

  private getExpectedTypeFromMime(mimeType: string): string | null {
    const mimeToType: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png', 
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'application/zip': 'zip',
      'application/x-rar-compressed': 'rar',
      'application/x-7z-compressed': '7z'
    };
    
    return mimeToType[mimeType] || null;
  }

  private countZipCentralDirectoryRecords(bytes: Uint8Array): number {
    // Simplified ZIP analysis - count "PK" signatures
    let count = 0;
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4B) {
        count++;
      }
    }
    return Math.max(0, count - 2); // Subtract ZIP header signatures
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // Public configuration methods
  updateConfig(config: Partial<SecurityConfig>): void {
    this.config = this.mergeConfig({ ...this.config, ...config });
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  // Static factory methods for common configurations
  static createStrict(): FileSecurityValidator {
    return new FileSecurityValidator({ level: SecurityLevel.STRICT });
  }

  static createBalanced(): FileSecurityValidator {
    return new FileSecurityValidator({ level: SecurityLevel.BALANCED });
  }

  static createPermissive(): FileSecurityValidator {
    return new FileSecurityValidator({ level: SecurityLevel.PERMISSIVE });
  }
}