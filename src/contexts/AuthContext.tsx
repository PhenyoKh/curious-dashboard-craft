
import * as React from 'react';
const { useEffect, useState, useRef } = React;
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { AuthContext, AuthContextType } from '@/contexts/auth-context-def';
import { getRedirectUrl, getRedirectUrlWithPath, getRedirectUrlWithIntent } from '@/utils/getRedirectUrl';
import { logger } from '@/utils/logger';
import { 
  recordRender, 
  recordEffectExecution, 
  type ContextRenderMetrics, 
  type EffectExecutionMetrics 
} from '@/utils/performanceBaseline';

// Phase 0: Enhanced monitoring configuration for AuthContext
const BURST_DETECTION_WINDOW = 100; // 100ms window for burst detection
const BURST_THRESHOLD = 5; // >5 renders in window = potential loop
const PERFORMANCE_TRACKING_WINDOW = 60000; // 1 minute sliding window
const MAX_RENDER_HISTORY = 100; // Keep last 100 render records

interface AuthRenderMetrics {
  timestamp: number;
  renderNumber: number;
  timeSinceLastRender: number;
  authState: {
    hasUser: boolean;
    userId: string | null;
    hasSession: boolean;
    hasProfile: boolean;
    hasSettings: boolean;
    isLoading: boolean;
    isEmailVerified: boolean;
  };
  performanceEntry?: PerformanceEntry;
}

interface AuthPerformanceBaseline {
  averageRenderTime: number;
  renderFrequency: number;
  burstEvents: number;
  totalRenders: number;
  windowStart: number;
}

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

// Session persistence configuration
const SESSION_STORAGE_KEY = 'scola_auth_session';
const SESSION_BACKUP_KEY = 'scola_auth_backup';
const SESSION_EXPIRY_HOURS = 24;

interface AuthProviderProps {
  children: React.ReactNode;
}

// Session persistence utilities
const saveSessionToStorage = (session: Session | null, backup: boolean = false) => {
  const key = backup ? SESSION_BACKUP_KEY : SESSION_STORAGE_KEY;
  try {
    if (session) {
      const sessionData = {
        session,
        timestamp: Date.now(),
        expiresAt: Date.now() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
      };
      localStorage.setItem(key, JSON.stringify(sessionData));
      logger.auth(`Session saved to ${backup ? 'backup' : 'primary'} storage`, {
        userId: session.user?.id,
        expiresAt: new Date(sessionData.expiresAt).toISOString()
      });
    } else {
      localStorage.removeItem(key);
      logger.auth(`Session removed from ${backup ? 'backup' : 'primary'} storage`);
    }
  } catch (error) {
    logger.error(`Failed to save session to ${backup ? 'backup' : 'primary'} storage:`, error);
  }
};

const loadSessionFromStorage = (backup: boolean = false): Session | null => {
  const key = backup ? SESSION_BACKUP_KEY : SESSION_STORAGE_KEY;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const sessionData = JSON.parse(stored);
    
    // Check if session has expired
    if (Date.now() > sessionData.expiresAt) {
      localStorage.removeItem(key);
      logger.auth(`Expired session removed from ${backup ? 'backup' : 'primary'} storage`);
      return null;
    }

    logger.auth(`Session restored from ${backup ? 'backup' : 'primary'} storage`, {
      userId: sessionData.session?.user?.id,
      age: Math.round((Date.now() - sessionData.timestamp) / 1000 / 60) + ' minutes'
    });
    
    return sessionData.session;
  } catch (error) {
    logger.error(`Failed to load session from ${backup ? 'backup' : 'primary'} storage:`, error);
    localStorage.removeItem(key);
    return null;
  }
};

const clearAllStoredSessions = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_BACKUP_KEY);
    logger.auth('All stored sessions cleared');
  } catch (error) {
    logger.error('Failed to clear stored sessions:', error);
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Generate unique context instance ID for debugging
  const contextId = useRef(Math.random().toString(36).substr(2, 9));
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const renderHistory = useRef<AuthRenderMetrics[]>([]);
  const performanceBaseline = useRef<AuthPerformanceBaseline>({
    averageRenderTime: 0,
    renderFrequency: 0,
    burstEvents: 0,
    totalRenders: 0,
    windowStart: Date.now()
  });

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // PHASE 0: Ultra-detailed render tracking and burst detection for AuthContext
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTime.current;
  renderCount.current++;

  // Create detailed render metrics
  const currentRenderMetrics: AuthRenderMetrics = {
    timestamp: currentTime,
    renderNumber: renderCount.current,
    timeSinceLastRender,
    authState: {
      hasUser: !!user,
      userId: user?.id || null,
      hasSession: !!session,
      hasProfile: !!profile,
      hasSettings: !!settings,
      isLoading: loading,
      isEmailVerified
    },
    performanceEntry: performance.getEntriesByType('measure').slice(-1)[0]
  };

  // Add to render history (maintain sliding window)
  renderHistory.current.push(currentRenderMetrics);
  if (renderHistory.current.length > MAX_RENDER_HISTORY) {
    renderHistory.current.shift();
  }

  // BURST DETECTION: Check for potential render loops
  const recentRenders = renderHistory.current.filter(
    render => currentTime - render.timestamp <= BURST_DETECTION_WINDOW
  );

  const isBurstDetected = recentRenders.length >= BURST_THRESHOLD;
  if (isBurstDetected) {
    performanceBaseline.current.burstEvents++;
    logger.error(`🚨 BURST DETECTED [AUTH-${contextId.current}] - ${recentRenders.length} renders in ${BURST_DETECTION_WINDOW}ms:`, {
      renderNumbers: recentRenders.map(r => r.renderNumber),
      timestamps: recentRenders.map(r => new Date(r.timestamp).toISOString()),
      timings: recentRenders.map(r => r.timeSinceLastRender),
      authStates: recentRenders.map(r => r.authState),
      burstEventCount: performanceBaseline.current.burstEvents,
      stackTrace: new Error().stack
    });
  }

  // PERFORMANCE BASELINE: Update sliding window metrics
  const windowStart = performanceBaseline.current.windowStart;
  if (currentTime - windowStart >= PERFORMANCE_TRACKING_WINDOW) {
    // Calculate performance metrics for this window
    const windowRenders = renderHistory.current.filter(r => r.timestamp >= windowStart);
    const totalRenderTime = windowRenders.reduce((sum, r) => sum + r.timeSinceLastRender, 0);
    
    performanceBaseline.current = {
      averageRenderTime: windowRenders.length > 0 ? totalRenderTime / windowRenders.length : 0,
      renderFrequency: windowRenders.length / (PERFORMANCE_TRACKING_WINDOW / 1000), // renders per second
      burstEvents: performanceBaseline.current.burstEvents,
      totalRenders: renderCount.current,
      windowStart: currentTime
    };

    // Log performance baseline
    logger.log(`📊 AUTH CONTEXT PERFORMANCE BASELINE [AUTH-${contextId.current}]:`, {
      window: `${new Date(windowStart).toISOString()} to ${new Date(currentTime).toISOString()}`,
      averageRenderTime: `${performanceBaseline.current.averageRenderTime.toFixed(2)}ms`,
      renderFrequency: `${performanceBaseline.current.renderFrequency.toFixed(2)} renders/sec`,
      burstEvents: performanceBaseline.current.burstEvents,
      totalRenders: performanceBaseline.current.totalRenders,
      windowRenderCount: windowRenders.length
    });
  }

  // PHASE 0.1: Record render metrics to centralized performance baseline
  const contextRenderMetrics: ContextRenderMetrics = {
    ...currentRenderMetrics,
    contextType: 'AUTH',
    contextId: contextId.current,
    state: currentRenderMetrics.authState
  };
  
  // Update centralized performance baseline
  const updatedBaseline = recordRender(contextRenderMetrics);

  // Enhanced logging for auth context usage
  logger.log(`🔄 AUTH CONTEXT [AUTH-${contextId.current}] - Render #${renderCount.current}:`, {
    timing: {
      timestamp: new Date(currentTime).toISOString(),
      timeSinceLastRender: `${timeSinceLastRender}ms`,
      isBurstDetected,
      recentRenderCount: recentRenders.length
    },
    authState: currentRenderMetrics.authState,
    performance: {
      local: {
        averageRenderTime: `${performanceBaseline.current.averageRenderTime.toFixed(2)}ms`,
        renderFrequency: `${performanceBaseline.current.renderFrequency.toFixed(2)}/sec`,
        totalBursts: performanceBaseline.current.burstEvents
      },
      baseline: {
        healthScore: updatedBaseline.healthScore,
        isHealthy: updatedBaseline.isHealthy,
        p95RenderTime: `${updatedBaseline.p95RenderTime.toFixed(2)}ms`,
        issues: updatedBaseline.issues.length,
        recommendations: updatedBaseline.recommendations.length
      }
    }
  });

  // Update last render time
  lastRenderTime.current = currentTime;

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
      
      logger.log('🎯 PAYMENT DEBUG - AuthContext signUp redirect URL:', {
        finalRedirectUrl: redirectUrl,
        paymentIntentReceived: paymentIntent,
        willCallGetRedirectUrlWithIntent: !!paymentIntent,
        baseUrl: paymentIntent ? 'with-intent' : 'basic'
      });
      
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
          emailRedirectTo: redirectUrl
        },
      });


      return { error: result.error };
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
      
      // Clear stored sessions
      clearAllStoredSessions();

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
        redirectTo: getRedirectUrlWithPath('/auth/callback/reset-password'),
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

  // Resend verification email
  const resendVerificationEmail = async () => {
    try {
      if (!user?.email) {
        return { error: new Error('No user email available') as AuthError };
      }

      const result = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: getRedirectUrl()
        }
      });


      return { error: result.error };
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

  // PHASE 0.1: Enhanced effect execution logging - Initialize auth state and set up auth listener
  useEffect(() => {
    const effectStartTime = performance.now();
    const effectExecutionId = Math.random().toString(36).substr(2, 9);
    const stackTrace = new Error().stack;
    
    logger.log(`🔧 EFFECT EXECUTION START [AUTH-${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
      effectName: 'Auth-Initialization-And-State-Listener',
      trigger: 'Component mount (empty dependency array)',
      executionStartTime: effectStartTime,
      renderNumber: renderCount.current,
      initialAuthState: {
        hasUser: !!user,
        hasSession: !!session,
        hasProfile: !!profile,
        hasSettings: !!settings,
        isLoading: loading,
        isEmailVerified
      },
      stackTrace: stackTrace?.split('\n').slice(1, 4).join('\n') || 'No stack trace',
      timestamp: new Date().toISOString()
    });

    let mounted = true;
    let hasInitialized = false; // Track if we've already fetched initial data

    // Set up auth state listener first
    logger.log(`🎧 SETTING UP AUTH STATE LISTENER [AUTH-${contextId.current}]:`, {
      effectId: effectExecutionId,
      listenerSetupTime: performance.now() - effectStartTime
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authEventStartTime = performance.now();
        const authEventId = Math.random().toString(36).substr(2, 9);
        
        if (!mounted) {
          logger.log(`⚠️ AUTH EVENT IGNORED - COMPONENT UNMOUNTED [AUTH-${contextId.current}]:`, {
            effectId: effectExecutionId,
            authEventId,
            event,
            sessionExists: !!session,
            timestamp: new Date().toISOString()
          });
          return;
        }

        logger.log(`🔄 AUTH STATE CHANGE EVENT [AUTH-${contextId.current}] - Auth Event ID: ${authEventId}:`, {
          effectId: effectExecutionId,
          event,
          sessionExists: !!session,
          userExists: !!session?.user,
          emailVerified: !!session?.user?.email_confirmed_at,
          userId: session?.user?.id,
          hasInitialized,
          mounted,
          eventStartTime: authEventStartTime,
          timestamp: new Date().toISOString()
        });

        logger.auth('Auth state change with persistence:', event, session?.user?.id, {
          sessionExists: !!session,
          userExists: !!session?.user,
          emailVerified: !!session?.user?.email_confirmed_at,
          event,
          effectId: effectExecutionId,
          authEventId,
          timestamp: new Date().toISOString()
        });
        
        // Enhanced session state management with persistence
        setSession(session);
        setUser(session?.user ?? null);
        
        // Save session to storage for persistence across redirects
        saveSessionToStorage(session);
        
        // Also save a backup copy for critical payment flows
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          saveSessionToStorage(session, true);
        }
        
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
          
          // Check if we're not already on a password reset page
          const currentPath = window.location.pathname;
          if (!currentPath.includes('reset-password') && !currentPath.includes('auth/callback')) {
            // User accessed recovery state but not through reset link - redirect them
            logger.auth('Redirecting to password reset page');
            setTimeout(() => {
              window.location.href = '/auth/callback/reset-password' + window.location.search + window.location.hash;
            }, 100);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear user data and stored sessions on sign out
          setProfile(null);
          setSettings(null);
          setIsEmailVerified(false);
          clearAllStoredSessions();
          hasInitialized = false; // Reset initialization flag
        }

        if (mounted) {
          setLoading(false);
        }
        
        const authEventExecutionTime = performance.now() - authEventStartTime;
        logger.log(`✅ AUTH STATE CHANGE EVENT COMPLETE [AUTH-${contextId.current}] - Auth Event ID: ${authEventId}:`, {
          effectId: effectExecutionId,
          event,
          finalState: {
            hasUser: !!session?.user,
            userId: session?.user?.id,
            hasInitialized,
            isLoading: false
          },
          eventExecutionTime: authEventExecutionTime,
          timestamp: new Date().toISOString()
        });
      }
    );

    // PHASE 0.1: Enhanced logging for auth initialization
    const initializeAuth = async () => {
      const initStartTime = performance.now();
      const initId = Math.random().toString(36).substr(2, 9);
      
      logger.log(`🚀 AUTH INITIALIZATION START [AUTH-${contextId.current}] - Init ID: ${initId}:`, {
        effectId: effectExecutionId,
        initStartTime,
        timestamp: new Date().toISOString()
      });
      
      try {
        // First try to get session from Supabase
        logger.log(`📡 FETCHING SUPABASE SESSION [AUTH-${contextId.current}]:`, {
          effectId: effectExecutionId,
          initId,
          step: 'supabase-session-fetch'
        });
        
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        logger.log(`📡 SUPABASE SESSION RESULT [AUTH-${contextId.current}]:`, {
          effectId: effectExecutionId,
          initId,
          hasSupabaseSession: !!supabaseSession,
          userId: supabaseSession?.user?.id,
          sessionFetchTime: performance.now() - initStartTime
        });
        
        // If no Supabase session, try to restore from storage
        let initialSession = supabaseSession;
        if (!supabaseSession) {
          const storedSession = loadSessionFromStorage();
          if (storedSession) {
            logger.auth('Attempting to restore session from storage');
            try {
              // Try to restore session in Supabase
              const { data: { session: restoredSession }, error } = await supabase.auth.setSession({
                access_token: storedSession.access_token,
                refresh_token: storedSession.refresh_token
              });
              
              if (!error && restoredSession) {
                initialSession = restoredSession;
                logger.auth('Session successfully restored from storage');
              } else {
                logger.auth('Failed to restore session from storage:', error);
                // Try backup if primary restoration failed
                const backupSession = loadSessionFromStorage(true);
                if (backupSession) {
                  const { data: { session: backupRestoredSession }, error: backupError } = await supabase.auth.setSession({
                    access_token: backupSession.access_token,
                    refresh_token: backupSession.refresh_token
                  });
                  
                  if (!backupError && backupRestoredSession) {
                    initialSession = backupRestoredSession;
                    logger.auth('Session successfully restored from backup storage');
                  }
                }
              }
            } catch (restoreError) {
              logger.error('Error restoring session from storage:', restoreError);
              clearAllStoredSessions();
            }
          }
        }
        
        if (mounted && initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Save the restored session
          saveSessionToStorage(initialSession);
          
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
        // Clear potentially corrupted sessions
        clearAllStoredSessions();
        if (mounted) {
          setLoading(false);
        }
      }
    };

    logger.log(`🎯 CALLING INITIALIZE AUTH [AUTH-${contextId.current}]:`, {
      effectId: effectExecutionId,
      effectSetupTime: performance.now() - effectStartTime,
      timestamp: new Date().toISOString()
    });

    initializeAuth();
    
    const setupExecutionTime = performance.now() - effectStartTime;
    
    // PHASE 0.1: Record effect execution to centralized performance baseline
    const effectMetrics: EffectExecutionMetrics = {
      effectId: effectExecutionId,
      effectName: 'Auth-Initialization-And-State-Listener',
      contextType: 'AUTH',
      contextId: contextId.current,
      executionTime: setupExecutionTime,
      timestamp: Date.now(),
      trigger: 'Component mount (empty dependency array)',
      stackTrace: stackTrace?.split('\n').slice(1, 4).join('\n') || 'No stack trace'
    };
    
    recordEffectExecution(effectMetrics);

    // PHASE 0.1: Enhanced cleanup function with comprehensive logging
    return () => {
      const cleanupStartTime = performance.now();
      const effectLifetime = cleanupStartTime - effectStartTime;
      
      logger.log(`🧹 EFFECT CLEANUP START [AUTH-${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
        effectName: 'Auth-Initialization-And-State-Listener',
        effectLifetime,
        finalState: {
          mounted,
          hasUser: !!user,
          hasSession: !!session,
          hasProfile: !!profile,
          hasSettings: !!settings,
          isLoading: loading,
          isEmailVerified
        },
        cleanupStartTime,
        timestamp: new Date().toISOString()
      });

      mounted = false;
      subscription.unsubscribe();
      
      logger.log(`✅ EFFECT CLEANUP COMPLETE [AUTH-${contextId.current}] - Effect ID: ${effectExecutionId}:`, {
        effectLifetime,
        subscriptionUnsubscribed: true,
        mountedSetToFalse: true,
        cleanupExecutionTime: performance.now() - cleanupStartTime,
        timestamp: new Date().toISOString()
      });
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
