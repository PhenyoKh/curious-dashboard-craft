import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface LifetimeAccessData {
  hasAccess: boolean;
  paymentReference?: string;
  paidAt?: string;
  loading: boolean;
  error?: string;
}

/**
 * Hook to check if user has lifetime access to Scola Pro
 * Replaces complex subscription logic with simple boolean check
 */
export const useLifetimeAccess = (): LifetimeAccessData => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | undefined>();
  const [paidAt, setPaidAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const checkLifetimeAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setPaymentReference(undefined);
        setPaidAt(undefined);
        setLoading(false);
        setError(undefined);
        return;
      }

      try {
        setLoading(true);
        setError(undefined);

        logger.log('🔍 Checking lifetime access for user:', user.id);

        const { data, error: queryError } = await supabase
          .from('user_profiles')
          .select('has_lifetime_access, payment_reference, paid_at')
          .eq('id', user.id)
          .single();

        if (queryError) {
          if (queryError.code === 'PGRST116') {
            // No user profile found - user doesn't have access yet
            logger.log('📋 No user profile found, creating default access state');
            setHasAccess(false);
            setPaymentReference(undefined);
            setPaidAt(undefined);
          } else {
            throw queryError;
          }
        } else {
          const access = data?.has_lifetime_access || false;
          const reference = data?.payment_reference || undefined;
          const paidDate = data?.paid_at || undefined;

          logger.log('✅ Lifetime access check result:', {
            hasAccess: access,
            paymentReference: reference,
            paidAt: paidDate
          });

          setHasAccess(access);
          setPaymentReference(reference);
          setPaidAt(paidDate);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error checking access';
        logger.error('❌ Error checking lifetime access:', err);
        setError(errorMessage);
        setHasAccess(false); // Default to no access on error
      } finally {
        setLoading(false);
      }
    };

    checkLifetimeAccess();
  }, [user]);

  return {
    hasAccess,
    paymentReference,
    paidAt,
    loading,
    error
  };
};

/**
 * Simpler version that just returns boolean access status
 */
export const useHasLifetimeAccess = (): { hasAccess: boolean; loading: boolean } => {
  const { hasAccess, loading } = useLifetimeAccess();
  return { hasAccess, loading };
};