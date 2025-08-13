/**
 * useScrollLock Hook
 * 
 * Prevents body scrolling when modals are open while avoiding the scrollbar glitch
 * that causes layout shifts. Works with the existing CSS infrastructure.
 * 
 * Usage:
 * const { lockScroll, unlockScroll } = useScrollLock();
 * 
 * or
 * 
 * const scrollLock = useScrollLock();
 * useEffect(() => {
 *   if (isModalOpen) {
 *     scrollLock.lockScroll();
 *   } else {
 *     scrollLock.unlockScroll();
 *   }
 * }, [isModalOpen, scrollLock]);
 */

import { useCallback, useRef, useEffect } from 'react';

interface ScrollLockAPI {
  lockScroll: () => void;
  unlockScroll: () => void;
  isLocked: () => boolean;
  cleanup: () => void;
}

// Global reference counter for managing multiple modals
let lockCount = 0;
let originalBodyStyle: string | null = null;
let scrollbarWidth: number | null = null;

/**
 * Legacy scrollbar width calculation - no longer needed with scrollbar-gutter approach
 * Kept for compatibility but not used in scroll lock
 */
const getScrollbarWidth = (): number => {
  if (scrollbarWidth !== null) {
    return scrollbarWidth;
  }

  // Create temporary div to measure scrollbar width
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  outer.appendChild(inner);

  scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Clean up
  document.body.removeChild(outer);

  return scrollbarWidth;
};

/**
 * Legacy scrollbar detection - no longer needed with scrollbar-gutter approach
 */
const hasScrollbar = (): boolean => {
  return document.body.scrollHeight > window.innerHeight;
};

/**
 * Applies scroll lock to the body element
 * Simplified approach relying on CSS scrollbar-gutter for layout stability
 */
const applyScrollLock = (): void => {
  const body = document.body;
  
  // Store original style if this is the first lock
  if (lockCount === 0) {
    originalBodyStyle = body.getAttribute('style');
  }
  
  lockCount++;
  
  // Simply add data attribute - CSS scrollbar-gutter prevents layout shift
  body.setAttribute('data-scroll-locked', 'true');
  
  console.log('🔒 Scroll locked (relying on CSS scrollbar-gutter for stability)');
};

/**
 * Removes scroll lock from the body element
 * Simplified approach - just remove the data attribute
 */
const removeScrollLock = (): void => {
  lockCount = Math.max(0, lockCount - 1);
  
  // Only remove lock when no modals are open
  if (lockCount === 0) {
    const body = document.body;
    
    // Remove data attribute
    body.removeAttribute('data-scroll-locked');
    
    // Restore original body style if it existed
    if (originalBodyStyle) {
      body.setAttribute('style', originalBodyStyle);
    } else {
      body.removeAttribute('style');
    }
    
    originalBodyStyle = null;
    console.log('🔓 Scroll unlocked');
  } else {
    console.log(`🔒 Scroll still locked (${lockCount} modals open)`);
  }
};

/**
 * Custom hook for managing scroll lock state
 */
export const useScrollLock = (): ScrollLockAPI => {
  const isComponentMounted = useRef(true);
  
  const lockScroll = useCallback(() => {
    if (!isComponentMounted.current) return;
    applyScrollLock();
  }, []);
  
  const unlockScroll = useCallback(() => {
    if (!isComponentMounted.current) return;
    removeScrollLock();
  }, []);
  
  const isLocked = useCallback(() => {
    return lockCount > 0;
  }, []);
  
  // Track component unmount to prevent operations on unmounted components
  const cleanup = useCallback(() => {
    isComponentMounted.current = false;
  }, []);
  
  // Return API object
  return {
    lockScroll,
    unlockScroll,
    isLocked,
    // Expose cleanup for manual cleanup if needed
    cleanup
  };
};

/**
 * Utility hook that automatically manages scroll lock based on a boolean state
 */
export const useAutoScrollLock = (shouldLock: boolean): void => {
  const { lockScroll, unlockScroll } = useScrollLock();
  
  // Use useCallback to ensure stable references
  const stableLockScroll = useCallback(lockScroll, [lockScroll]);
  const stableUnlockScroll = useCallback(unlockScroll, [unlockScroll]);
  
  // Auto-manage scroll lock based on shouldLock state
  useEffect(() => {
    if (shouldLock) {
      stableLockScroll();
    } else {
      stableUnlockScroll();
    }
    
    // Cleanup on unmount
    return () => {
      if (shouldLock) {
        stableUnlockScroll();
      }
    };
  }, [shouldLock, stableLockScroll, stableUnlockScroll]);
};

// Export individual functions for advanced use cases
export { applyScrollLock, removeScrollLock, getScrollbarWidth, hasScrollbar };

export default useScrollLock;