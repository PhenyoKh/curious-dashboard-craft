/**
 * Admin Security Validation Hook
 * Provides security validation and access control for admin operations
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useProAccess';
import { validateAdminAccess, isCurrentUserAdmin } from '@/lib/admin';
import { logger } from '@/utils/logger';

export interface AdminSecurityState {
  isValidated: boolean;
  isLoading: boolean;
  error?: string;
  lastValidation?: Date;
}

/**
 * Hook for validating admin access with security checks
 * Performs both client-side and server-side validation
 */
export const useAdminSecurity = (requireValidation: boolean = true) => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [securityState, setSecurityState] = useState<AdminSecurityState>({
    isValidated: false,
    isLoading: true,
  });

  useEffect(() => {
    if (!requireValidation || !user || adminLoading) {
      setSecurityState({
        isValidated: !requireValidation,
        isLoading: adminLoading || !user,
      });
      return;
    }

    const validateSecurity = async () => {
      try {
        setSecurityState(prev => ({ ...prev, isLoading: true, error: undefined }));

        // First check client-side admin status
        if (!isAdmin) {
          setSecurityState({
            isValidated: false,
            isLoading: false,
            error: 'Admin access required',
          });
          return;
        }

        // Perform server-side validation for critical operations
        const validation = await validateAdminAccess();
        
        if (!validation.isValid) {
          logger.warn('Admin security validation failed:', validation.error);
          setSecurityState({
            isValidated: false,
            isLoading: false,
            error: validation.error || 'Security validation failed',
          });
          return;
        }

        // Additional security check: verify user email matches admin table
        const serverAdminCheck = await isCurrentUserAdmin();
        if (!serverAdminCheck) {
          logger.error('Server-side admin check failed for user:', user.email);
          setSecurityState({
            isValidated: false,
            isLoading: false,
            error: 'Admin verification failed',
          });
          return;
        }

        setSecurityState({
          isValidated: true,
          isLoading: false,
          lastValidation: new Date(),
        });

        logger.log('✅ Admin security validation successful for:', user.email);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Security validation error';
        logger.error('Admin security validation exception:', err);
        setSecurityState({
          isValidated: false,
          isLoading: false,
          error: errorMessage,
        });
      }
    };

    validateSecurity();
  }, [user, isAdmin, adminLoading, requireValidation]);

  const revalidate = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setSecurityState(prev => ({ ...prev, isLoading: true, error: undefined }));

      const validation = await validateAdminAccess();
      const serverCheck = await isCurrentUserAdmin();
      
      const isValid = validation.isValid && serverCheck;
      
      setSecurityState({
        isValidated: isValid,
        isLoading: false,
        error: isValid ? undefined : (validation.error || 'Revalidation failed'),
        lastValidation: isValid ? new Date() : securityState.lastValidation,
      });

      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Revalidation error';
      setSecurityState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  };

  return {
    ...securityState,
    revalidate,
    isAdmin,
    user,
  };
};

/**
 * Hook for securing sensitive admin operations
 * Automatically validates and throws errors for unauthorized access
 */
export const useSecureAdminOperation = () => {
  const security = useAdminSecurity(true);

  const executeSecureOperation = async <T>(
    operation: () => Promise<T>,
    operationName: string = 'admin operation'
  ): Promise<T> => {
    if (!security.isValidated) {
      throw new Error(`Unauthorized access to ${operationName}`);
    }

    if (security.error) {
      throw new Error(`Security validation failed: ${security.error}`);
    }

    logger.log(`🔒 Executing secure admin operation: ${operationName}`);
    
    try {
      const result = await operation();
      logger.log(`✅ Secure admin operation completed: ${operationName}`);
      return result;
    } catch (err) {
      logger.error(`❌ Secure admin operation failed: ${operationName}`, err);
      throw err;
    }
  };

  return {
    executeSecureOperation,
    ...security,
  };
};

/**
 * Admin access levels for different security contexts
 */
export const SECURITY_LEVELS = {
  BASIC: 'basic',       // Standard admin features
  ELEVATED: 'elevated', // User management, billing
  CRITICAL: 'critical', // System settings, data export
} as const;

/**
 * Security context for different admin operations
 */
export const ADMIN_OPERATIONS = {
  USER_MANAGEMENT: { level: SECURITY_LEVELS.ELEVATED, name: 'User Management' },
  SUBSCRIPTION_OVERRIDE: { level: SECURITY_LEVELS.ELEVATED, name: 'Subscription Override' },
  SYSTEM_SETTINGS: { level: SECURITY_LEVELS.CRITICAL, name: 'System Settings' },
  DATA_EXPORT: { level: SECURITY_LEVELS.CRITICAL, name: 'Data Export' },
  ANALYTICS_ACCESS: { level: SECURITY_LEVELS.BASIC, name: 'Analytics Access' },
} as const;

/**
 * Validate security level for specific operations
 */
export const validateSecurityLevel = (
  requiredLevel: string,
  userLevel: string = SECURITY_LEVELS.BASIC
): boolean => {
  const levelHierarchy = {
    [SECURITY_LEVELS.BASIC]: 0,
    [SECURITY_LEVELS.ELEVATED]: 1,
    [SECURITY_LEVELS.CRITICAL]: 2,
  };

  const required = levelHierarchy[requiredLevel as keyof typeof levelHierarchy] ?? 99;
  const current = levelHierarchy[userLevel as keyof typeof levelHierarchy] ?? -1;

  return current >= required;
};