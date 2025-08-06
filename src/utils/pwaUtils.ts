/**
 * PWA Detection Utilities
 * Provides functions to detect if the app is running as a PWA vs in a browser
 */

/**
 * Check if the app is running as a standalone PWA
 */
export const isPWAInstalled = (): boolean => {
  // Check for display-mode: standalone
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check for iOS standalone mode
  if ('standalone' in window.navigator && (window.navigator as Record<string, unknown>).standalone === true) {
    return true;
  }

  // Check for Android PWA indicators
  if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) {
    return true;
  }

  return false;
};

/**
 * Check if running in standalone display mode
 */
export const isDisplayModeStandalone = (): boolean => {
  return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
};

/**
 * Check if running as iOS PWA specifically
 */
export const isIOSPWA = (): boolean => {
  return 'standalone' in window.navigator && (window.navigator as Record<string, unknown>).standalone === true;
};

/**
 * Check if running on a mobile device
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Get PWA installation status and type
 */
export const getPWAStatus = () => {
  const isInstalled = isPWAInstalled();
  const isStandalone = isDisplayModeStandalone();
  const isIOS = isIOSPWA();
  const isMobile = isMobileDevice();
  
  return {
    isInstalled,
    isStandalone,
    isIOS,
    isMobile,
    isBrowser: !isInstalled,
    installationType: isIOS ? 'ios-pwa' : isStandalone ? 'android-pwa' : 'browser'
  };
};

/**
 * Check if user should see the marketing landing page
 * Browser users: true, PWA users: false
 */
export const shouldShowMarketingPage = (): boolean => {
  return !isPWAInstalled();
};