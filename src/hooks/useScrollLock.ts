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
}

// Global reference counter for managing multiple modals
let lockCount = 0;
let originalBodyStyle: string | null = null;
let scrollbarWidth: number | null = null;

/**
 * Calculates the width of the browser's scrollbar
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
 * Checks if the body currently has a scrollbar
 */
const hasScrollbar = (): boolean => {
  return document.body.scrollHeight > window.innerHeight;
};

/**
 * Applies scroll lock to the body element
 */
const applyScrollLock = (): void => {
  const body = document.body;
  
  // Store original style if this is the first lock
  if (lockCount === 0) {
    originalBodyStyle = body.getAttribute('style');
  }
  
  lockCount++;
  
  // Only apply lock if we actually have a scrollbar to prevent unnecessary padding
  if (hasScrollbar()) {
    const scrollWidth = getScrollbarWidth();
    
    // Set CSS variable for padding compensation
    body.style.setProperty('--removed-body-scroll-bar-size', `${scrollWidth}px`);
    
    // Add data attribute to trigger CSS scroll lock
    body.setAttribute('data-scroll-locked', 'true');
    
    console.log('🔒 Scroll locked with scrollbar width compensation:', scrollWidth);
  } else {
    // Still add the attribute for consistency, but no padding needed
    body.setAttribute('data-scroll-locked', 'true');
    body.style.setProperty('--removed-body-scroll-bar-size', '0px');
    
    console.log('🔒 Scroll locked (no scrollbar detected)');
  }
};

/**
 * Removes scroll lock from the body element
 */
const removeScrollLock = (): void => {
  lockCount = Math.max(0, lockCount - 1);
  
  // Only remove lock when no modals are open
  if (lockCount === 0) {
    const body = document.body;
    
    // Remove data attribute
    body.removeAttribute('data-scroll-locked');
    
    // Remove CSS variable
    body.style.removeProperty('--removed-body-scroll-bar-size');
    
    // Restore original body style
    if (originalBodyStyle) {
      body.setAttribute('style', originalBodyStyle);
    } else {
      // If there was no original style, remove the style attribute entirely
      // but preserve any styles that might have been added by other components
      const currentStyle = body.getAttribute('style') || '';
      const cleanedStyle = currentStyle
        .split(';')
        .filter(rule => {
          const trimmed = rule.trim();
          return trimmed && 
                 !trimmed.startsWith('--removed-body-scroll-bar-size') &&
                 !trimmed.startsWith('overflow') &&
                 !trimmed.startsWith('padding-right');
        })
        .join(';');
      
      if (cleanedStyle) {
        body.setAttribute('style', cleanedStyle);
      } else {
        body.removeAttribute('style');
      }
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
    cleanup: cleanup as any
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