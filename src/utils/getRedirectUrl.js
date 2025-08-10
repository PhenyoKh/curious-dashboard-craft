/**
 * Get the appropriate redirect URL based on the current environment
 * For auth verification callbacks, includes /auth/callback path
 * 
 * Environment detection:
 * - Development: localhost/127.0.0.1 → http://localhost:8085/auth/callback
 * - Preview/Staging: contains 'preview--' or 'lovable.app' → current origin/auth/callback
 * - Production: everything else → https://scola.co.za/auth/callback
 * 
 * @returns {string} The redirect URL for auth callbacks
 */
export function getRedirectUrl() {
  // Get current hostname and origin
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  
  // Development environment (localhost or 127.0.0.1)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8085/auth/callback';
  }
  
  // Preview/staging environments (Lovable/Netlify previews)
  if (origin.includes('preview--') || origin.includes('lovable.app')) {
    return `${origin}/auth/callback`;
  }
  
  // Production environment - default case
  return 'https://scola.co.za/auth/callback';
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