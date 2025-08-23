import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ProAccessData {
  hasAccess: boolean;
  accessType: 'none' | 'lifetime' | 'trial' | 'subscription';
  status: string;
  expiresAt?: string;
  daysRemaining?: number;
  isTrial: boolean;
  isLifetime: boolean;
  loading: boolean;
  error?: string;
}

/**
 * Unified hook for checking Pro access (lifetime OR subscription)
 * Replaces separate lifetime/subscription hooks with comprehensive access check
 * Calls database function get_subscription_status() for unified access logic
 */
export const useProAccess = (): ProAccessData => {
  const { user } = useAuth();
  const [accessData, setAccessData] = useState<ProAccessData>({
    hasAccess: false,
    accessType: 'none',
    status: 'none',
    isTrial: false,
    isLifetime: false,
    loading: true
  });

  useEffect(() => {
    const checkProAccess = async () => {
      if (!user) {
        setAccessData({
          hasAccess: false,
          accessType: 'none',
          status: 'none',
          isTrial: false,
          isLifetime: false,
          loading: false
        });
        return;
      }

      try {
        setAccessData(prev => ({ ...prev, loading: true, error: undefined }));

        logger.log('🔍 Checking Pro access (lifetime + subscription) for user:', user.id);

        // Call the unified database function for comprehensive access check
        const { data, error: queryError } = await supabase
          .rpc('get_subscription_status', { user_uuid: user.id });

        if (queryError) {
          throw queryError;
        }

        if (!data || data.length === 0) {
          logger.log('📋 No access data found, user has no pro access');
          setAccessData({
            hasAccess: false,
            accessType: 'none',
            status: 'none',
            isTrial: false,
            isLifetime: false,
            loading: false
          });
          return;
        }

        const accessInfo = data[0];
        
        logger.log('✅ Pro access check result:', {
          hasAccess: accessInfo.has_access,
          accessType: accessInfo.access_type,
          status: accessInfo.status,
          expiresAt: accessInfo.expires_at,
          daysRemaining: accessInfo.days_remaining,
          isTrial: accessInfo.is_trial,
          isLifetime: accessInfo.is_lifetime
        });

        setAccessData({
          hasAccess: accessInfo.has_access || false,
          accessType: accessInfo.access_type || 'none',
          status: accessInfo.status || 'none',
          expiresAt: accessInfo.expires_at || undefined,
          daysRemaining: accessInfo.days_remaining || undefined,
          isTrial: accessInfo.is_trial || false,
          isLifetime: accessInfo.is_lifetime || false,
          loading: false
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error checking Pro access';
        logger.error('❌ Error checking Pro access:', err);
        setAccessData({
          hasAccess: false,
          accessType: 'none',
          status: 'error',
          isTrial: false,
          isLifetime: false,
          loading: false,
          error: errorMessage
        });
      }
    };

    checkProAccess();
  }, [user]);

  return accessData;
};

/**
 * Simpler version that just returns boolean access status
 * Compatible with existing useHasLifetimeAccess pattern
 */
export const useHasProAccess = (): { hasAccess: boolean; loading: boolean } => {
  const { hasAccess, loading } = useProAccess();
  return { hasAccess, loading };
};

/**
 * Hook for trial-specific information
 * Useful for trial countdown displays
 */
export const useTrialStatus = (): {
  isTrial: boolean;
  daysRemaining?: number;
  expiresAt?: string;
  loading: boolean;
} => {
  const { isTrial, daysRemaining, expiresAt, loading } = useProAccess();
  return { isTrial, daysRemaining, expiresAt, loading };
};

/**
 * Hook for subscription management information
 * Useful for billing and cancellation interfaces
 */
export const useSubscriptionInfo = (): {
  hasSubscription: boolean;
  status: string;
  expiresAt?: string;
  accessType: string;
  loading: boolean;
} => {
  const { accessType, status, expiresAt, loading } = useProAccess();
  const hasSubscription = accessType === 'subscription';
  
  return { 
    hasSubscription, 
    status, 
    expiresAt, 
    accessType, 
    loading 
  };
};