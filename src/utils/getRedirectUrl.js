/**
 * Get the appropriate redirect URL based on the current environment
 * For auth verification callbacks, includes /auth/callback path
 * 
 * Environment detection:
 * - Development: localhost/127.0.0.1 → http://localhost:8083/auth/callback
 * - Preview/Staging: contains 'preview--' or 'lovable.app' → current origin/auth/callback
 * - Production: everything else → https://www.scola.co.za/auth/callback
 * 
 * @returns {string} The redirect URL for auth callbacks
 */
export function getRedirectUrl() {
  // Force localhost in development to override Supabase Dashboard settings
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8083/auth/callback';
  }
  
  // Check for environment variable first
  const appUrl = import.meta.env.VITE_APP_URL;
  if (appUrl) {
    return `${appUrl}/auth/callback`;
  }
  
  // Get current hostname and origin for production
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  
  // Preview/staging environments (Lovable/Netlify previews)
  if (origin.includes('preview--') || origin.includes('lovable.app')) {
    return `${origin}/auth/callback`;
  }
  
  // Production environment - fallback default
  return 'https://www.scola.co.za/auth/callback';
}

/**
 * Get redirect URL with a specific path appended
 * 
 * @param {string} path - Path to append (e.g., '/reset-password')
 * @returns {string} The complete redirect URL with path
 */
export function getRedirectUrlWithPath(path = '/') {
  const baseUrl = getRedirectUrl();
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Get redirect URL with payment intent preserved
 * Used for signup with payment intent
 * 
 * @param {string} intent - Payment intent (e.g., 'plan')
 * @param {string} planId - Plan ID for payment intent
 * @returns {string} The redirect URL with intent parameters
 */
export function getRedirectUrlWithIntent(intent, planId) {
  const baseUrl = getRedirectUrl();
  const params = new URLSearchParams();
  
  if (intent) params.append('intent', intent);
  if (planId) params.append('planId', planId);
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}