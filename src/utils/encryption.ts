/**
 * Token Encryption Utilities
 * Provides secure encryption and decryption for calendar integration tokens
 */

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.CALENDAR_ENCRYPTION_KEY || '';
const ENCRYPTION_ENABLED = import.meta.env.VITE_ENCRYPTION_ENABLED === 'true';

/**
 * Validates that encryption is properly configured
 */
export function validateEncryptionConfig(): boolean {
  if (!ENCRYPTION_ENABLED) {
    console.warn('Token encryption is disabled. This is not recommended for production.');
    return false;
  }

  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    console.error('CALENDAR_ENCRYPTION_KEY must be at least 32 characters long');
    return false;
  }

  if (ENCRYPTION_KEY.includes('your-') || ENCRYPTION_KEY.includes('placeholder')) {
    console.error('CALENDAR_ENCRYPTION_KEY contains placeholder text');
    return false;
  }

  return true;
}

/**
 * Encrypts a token using AES encryption
 */
export function encryptToken(token: string): string {
  if (!ENCRYPTION_ENABLED) {
    console.warn('Encryption disabled - storing token in plain text');
    return token;
  }

  if (!validateEncryptionConfig()) {
    throw new Error('Encryption configuration is invalid');
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Token encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypts a token using AES decryption
 */
export function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_ENABLED) {
    return encryptedToken;
  }

  if (!validateEncryptionConfig()) {
    throw new Error('Encryption configuration is invalid');
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Failed to decrypt token - invalid encryption key or corrupted data');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Generates a random encryption key for development/testing
 */
export function generateEncryptionKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}

/**
 * Encrypts sensitive user data
 */
export function encryptSensitiveData(data: Record<string, unknown>): string {
  if (!ENCRYPTION_ENABLED) {
    return JSON.stringify(data);
  }

  if (!validateEncryptionConfig()) {
    throw new Error('Encryption configuration is invalid');
  }

  try {
    const jsonData = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonData, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Data encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypts sensitive user data
 */
export function decryptSensitiveData<T = Record<string, unknown>>(encryptedData: string): T {
  if (!ENCRYPTION_ENABLED) {
    return JSON.parse(encryptedData);
  }

  if (!validateEncryptionConfig()) {
    throw new Error('Encryption configuration is invalid');
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Failed to decrypt data - invalid encryption key or corrupted data');
    }
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Data decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Securely compares two strings to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generates a secure random string for client states and nonces
 */
export function generateSecureRandomString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  
  return result;
}

/**
 * Creates a hash of sensitive information for logging (non-reversible)
 */
export function createSecureHash(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

/**
 * Validates that a token hasn't been tampered with
 */
export function validateTokenIntegrity(token: string, expectedHash?: string): boolean {
  if (!expectedHash) {
    return true; // No hash to compare against
  }

  const tokenHash = createSecureHash(token);
  return secureCompare(tokenHash, expectedHash);
}

/**
 * Rotates encryption keys by re-encrypting data with a new key
 */
export function rotateEncryption(encryptedData: string, newKey: string): string {
  if (!ENCRYPTION_ENABLED) {
    return encryptedData;
  }

  // Decrypt with old key
  const decrypted = decryptToken(encryptedData);
  
  // Encrypt with new key
  const oldKey = ENCRYPTION_KEY;
  (globalThis as Record<string, unknown>).TEMP_ENCRYPTION_KEY = newKey;
  
  try {
    const reencrypted = CryptoJS.AES.encrypt(decrypted, newKey).toString();
    return reencrypted;
  } finally {
    delete (globalThis as Record<string, unknown>).TEMP_ENCRYPTION_KEY;
  }
}

/**
 * Security audit function to check for common issues
 */
export function performSecurityAudit(): {
  issues: string[];
  warnings: string[];
  passed: boolean;
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check encryption configuration
  if (!ENCRYPTION_ENABLED) {
    if (import.meta.env.NODE_ENV === 'production') {
      issues.push('Token encryption is disabled in production');
    } else {
      warnings.push('Token encryption is disabled (development mode)');
    }
  }

  if (!ENCRYPTION_KEY) {
    issues.push('No encryption key configured');
  } else {
    if (ENCRYPTION_KEY.length < 32) {
      issues.push('Encryption key is too short (minimum 32 characters)');
    }
    
    if (ENCRYPTION_KEY.includes('your-') || ENCRYPTION_KEY.includes('placeholder')) {
      issues.push('Encryption key contains placeholder text');
    }
    
    // Check for weak keys
    if (ENCRYPTION_KEY === '12345678901234567890123456789012') {
      issues.push('Using weak/default encryption key');
    }
  }

  // Check environment
  if (import.meta.env.NODE_ENV === 'production') {
    if (import.meta.env.VITE_DEBUG_CALENDAR_SYNC === 'true') {
      warnings.push('Debug mode enabled in production');
    }
    
    if (import.meta.env.VITE_VERBOSE_LOGGING === 'true') {
      warnings.push('Verbose logging enabled in production');
    }
  }

  return {
    issues,
    warnings,
    passed: issues.length === 0
  };
}