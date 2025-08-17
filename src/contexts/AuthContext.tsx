
import * as React from 'react';
const { useEffect, useState } = React;
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { AuthContext, AuthContextType } from '@/contexts/auth-context-def';
import { getRedirectUrl, getRedirectUrlWithPath, getRedirectUrlWithIntent } from '@/utils/getRedirectUrl';
import { logger } from '@/utils/logger';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Fetch user profile and settings in parallel
  const fetchUserData = async (userId: string): Promise<{ profile: UserProfile | null; settings: UserSettings | null }> => {
    try {
      const [profileResponse, settingsResponse] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .single()
      ]);

      return {
        profile: profileResponse.error ? null : profileResponse.data,
        settings: settingsResponse.error ? null : settingsResponse.data
      };
    } catch (error) {
      logger.error('Error fetching user data:', error);
      return { profile: null, settings: null };
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error) {
          setProfile(data);
        }
      } catch (error) {
        logger.error('Error refreshing profile:', error);
      }
    }
  };

  // Refresh settings data
  const refreshSettings = async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!error) {
          setSettings(data);
        }
      } catch (error) {
        logger.error('Error refreshing settings:', error);
      }
    }
  };

  // Sign up new user
  const signUp = async (email: string, password: string, fullName?: string, paymentIntent?: { intent: string, planId: string }) => {
    try {
      // Use intent-aware redirect URL if payment intent exists
      const redirectUrl = paymentIntent ? 
        getRedirectUrlWithIntent(paymentIntent.intent, paymentIntent.planId) : 
        getRedirectUrl();
      
      // DEBUG: Log redirect URL to diagnose the issue
      logger.auth('DEBUG signUp redirect:', {
        redirectUrl,
        paymentIntent,
        hostname: window.location.hostname,
        origin: window.location.origin,
        isDev: import.meta.env.DEV,
        nodeEnv: import.meta.env.NODE_ENV
      });
      
      console.log('🎯 PAYMENT DEBUG - AuthContext signUp redirect URL:', {
        finalRedirectUrl: redirectUrl,
        paymentIntentReceived: paymentIntent,
        willCallGetRedirectUrlWithIntent: !!paymentIntent,
        baseUrl: paymentIntent ? 'with-intent' : 'basic'
      });
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
          emailRedirectTo: redirectUrl
        },
      });

      // Enhanced error handling for email issues
      if (error) {
        let enhancedError = error;
        
        // Check for rate limit errors
        if (error.message?.toLowerCase().includes('rate') || 
            error.message?.toLowerCase().includes('limit') ||
            error.message?.toLowerCase().includes('too many')) {
          enhancedError = {
            ...error,
            name: 'EmailRateLimitError',
            message: 'Email rate limit exceeded. Please wait a few minutes before trying again.'
          } as AuthError;
        }
        
        // Check for email delivery errors
        else if (error.message?.toLowerCase().includes('email') && 
                 (error.message?.toLowerCase().includes('send') || 
                  error.message?.toLowerCase().includes('deliver') ||
                  error.message?.toLowerCase().includes('confirmation'))) {
          enhancedError = {
            ...error,
            name: 'EmailDeliveryError',
            message: 'There was an issue sending your confirmation email. Please check your email address and try again.'
          } as AuthError;
        }
        
        return { error: enhancedError };
      }

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Sign in existing user
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Sign out user
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
      setSettings(null);

      // Clear service worker caches for security
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_AUTH_CACHE'
        });
      }

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrlWithPath('/reset-password'),
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Update password for logged-in user
  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Handle password recovery from email link
  const handlePasswordRecovery = async (accessToken: string, refreshToken: string) => {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Resend verification email with enhanced error handling
  const resendVerificationEmail = async () => {
    try {
      if (!user?.email) {
        return { error: new Error('No user email available') as AuthError };
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: getRedirectUrl()
        }
      });

      // Enhanced error handling for resend attempts
      if (error) {
        let enhancedError = error;
        
        // Check for rate limit errors
        if (error.message?.toLowerCase().includes('rate') || 
            error.message?.toLowerCase().includes('limit') ||
            error.message?.toLowerCase().includes('too many')) {
          enhancedError = {
            ...error,
            name: 'EmailRateLimitError',
            message: 'Email rate limit exceeded. Please wait a few minutes before requesting another verification email.'
          } as AuthError;
        }
        
        // Check for email delivery errors
        else if (error.message?.toLowerCase().includes('email') && 
                 (error.message?.toLowerCase().includes('send') || 
                  error.message?.toLowerCase().includes('deliver') ||
                  error.message?.toLowerCase().includes('confirmation'))) {
          enhancedError = {
            ...error,
            name: 'EmailDeliveryError',
            message: 'Unable to send verification email. Please check your email address or try again later.'
          } as AuthError;
        }
        
        return { error: enhancedError };
      }

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Update user profile
  const updateProfile = async (updates: UserProfileUpdate) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Refresh profile data
      await refreshProfile();

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Update user settings
  const updateSettings = async (updates: UserSettingsUpdate) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Refresh settings data
      await refreshSettings();

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Initialize auth state and set up auth listener
  useEffect(() => {
    let mounted = true;
    let hasInitialized = false; // Track if we've already fetched initial data

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        logger.auth('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check email verification status
        const emailVerified = session?.user?.email_confirmed_at ? true : false;
        setIsEmailVerified(emailVerified);

        // Only fetch user data if we haven't already initialized or if this is a new sign-in
        if (event === 'SIGNED_IN' && session?.user && !hasInitialized) {
          // Fetch user data in background after setting user
          setTimeout(async () => {
            if (mounted) {
              const userData = await fetchUserData(session.user.id);
              if (mounted) {
                setProfile(userData.profile);
                setSettings(userData.settings);
                hasInitialized = true; // Mark as initialized to prevent duplicate fetches
              }
            }
          }, 0);
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery state - user data remains accessible
          logger.auth('Password recovery mode activated');
        } else if (event === 'SIGNED_OUT') {
          // Clear user data on sign out
          setProfile(null);
          setSettings(null);
          setIsEmailVerified(false);
          hasInitialized = false; // Reset initialization flag
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted && initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Check email verification status
          const emailVerified = initialSession.user.email_confirmed_at ? true : false;
          setIsEmailVerified(emailVerified);

          // Fetch user data only once during initialization
          const userData = await fetchUserData(initialSession.user.id);
          if (mounted) {
            setProfile(userData.profile);
            setSettings(userData.settings);
            hasInitialized = true; // Mark as initialized
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        logger.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    // Auth state
    user,
    session,
    profile,
    settings,
    loading,
    isEmailVerified,
    
    // Auth methods
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendVerificationEmail,
    
    // Password management methods
    updatePassword,
    handlePasswordRecovery,
    
    // Profile methods
    updateProfile,
    updateSettings,
    
    // Utility methods
    refreshProfile,
    refreshSettings,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
