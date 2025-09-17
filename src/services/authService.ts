import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// In-memory cache of current user ID
let cachedUserId: string | null = null;
let cacheExpiryTime: number | null = null;
let authStateChangeListener: any = null;

// Reduced cache TTL to 3 minutes (auth tokens refresh every hour, so this is safe)
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Clears the user ID cache
 * Call this when logging out or when auth state changes
 */
export const clearUserIdCache = () => {
  logger.log('🔍 clearUserIdCache: Clearing user ID cache');
  cachedUserId = null;
  cacheExpiryTime = null;
};

/**
 * Initializes the auth state change listener to manage cache invalidation
 * This ensures the cache stays in sync with authentication state changes
 */
export const initializeAuthCache = () => {
  if (!authStateChangeListener) {
    logger.log('🔍 initializeAuthCache: Setting up auth state listener');
    
    authStateChangeListener = supabase.auth.onAuthStateChange((event, session) => {
      logger.log(`🔍 Auth state changed: ${event}`);
      
      // Clear cache on any significant auth state change
      switch (event) {
        case 'SIGNED_OUT':
        case 'TOKEN_REFRESHED': 
        case 'SIGNED_IN':
          clearUserIdCache();
          break;
        default:
          // For other events like INITIAL_SESSION, we might keep the cache
          break;
      }
    });
  }
};

/**
 * Cleanup function to remove the auth state listener
 * Call this when your app is unmounting or you no longer need the service
 */
export const cleanupAuthCache = () => {
  if (authStateChangeListener) {
    logger.log('🔍 cleanupAuthCache: Removing auth state listener');
    authStateChangeListener.data.subscription.unsubscribe();
    authStateChangeListener = null;
  }
  clearUserIdCache();
};

/**
 * Gets the current user ID with intelligent caching and auth state management
 * Returns cached ID if valid, otherwise fetches fresh data from Supabase
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  // Initialize auth listener on first call
  if (!authStateChangeListener) {
    initializeAuthCache();
  }

  const currentTime = Date.now();
  
  // Return cached ID if valid
  if (cachedUserId && cacheExpiryTime && currentTime < cacheExpiryTime) {
    logger.log('🔍 getCurrentUserId: Using cached user ID');
    return cachedUserId;
  }
  
  try {
    // Check for session first to avoid unnecessary user API calls
    // This is a quick check that doesn't hit the network
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logger.error('❌ getCurrentUserId: Session error:', sessionError);
      clearUserIdCache(); // Clear potentially stale cache
      return null;
    }

    if (!session) {
      logger.log('🔍 getCurrentUserId: No active session');
      clearUserIdCache(); // Clear cache since there's no session
      return null;
    }
    
    // Now get the user data (this validates the token)
    // Always use getUser() for security - it revalidates the auth token
    const { data: { user }, error } = await supabase.auth.getUser();
    
    logger.log('🔍 getCurrentUserId: Auth response:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      error 
    });
    
    if (error) {
      logger.error('❌ getCurrentUserId: Auth error:', error);
      clearUserIdCache(); // Clear potentially stale cache
      return null;
    }
    
    if (!user) {
      logger.error('❌ getCurrentUserId: No user found');
      clearUserIdCache(); // Clear cache since user doesn't exist
      return null;
    }
    
    // Update cache with fresh data
    cachedUserId = user.id;
    cacheExpiryTime = currentTime + CACHE_TTL;
    
    logger.log('🔍 getCurrentUserId: Successfully got user ID:', user.id);
    return user.id;

  } catch (error) {
    logger.error('❌ getCurrentUserId: Unexpected error:', error);
    clearUserIdCache(); // Clear potentially stale cache on errors
    return null;
  }
};

/**
 * Forces a fresh fetch of the user ID, bypassing the cache
 * Useful when you need to ensure you have the latest user data
 */
export const refreshCurrentUserId = async (): Promise<string | null> => {
  logger.log('🔍 refreshCurrentUserId: Forcing cache refresh');
  clearUserIdCache();
  return getCurrentUserId();
};

/**
 * Gets the cached user ID without making any API calls
 * Returns null if cache is expired or empty
 */
export const getCachedUserId = (): string | null => {
  const currentTime = Date.now();
  
  if (cachedUserId && cacheExpiryTime && currentTime < cacheExpiryTime) {
    logger.log('🔍 getCachedUserId: Returning cached user ID');
    return cachedUserId;
  }
  
  logger.log('🔍 getCachedUserId: No valid cached user ID');
  return null;
};

// Export cache status for debugging
export const getAuthCacheStatus = () => ({
  cachedUserId: cachedUserId ? '***cached***' : null,
  cacheExpiryTime,
  isExpired: cacheExpiryTime ? Date.now() > cacheExpiryTime : true,
  hasListener: !!authStateChangeListener,
  timeUntilExpiry: cacheExpiryTime ? Math.max(0, cacheExpiryTime - Date.now()) : 0
});