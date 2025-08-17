/**
 * Email retry utilities for handling rate limits and delivery failures
 */

interface RetryState {
  attempts: number;
  lastAttempt: number;
  nextRetryTime: number;
}

const RETRY_STORAGE_KEY = 'email_retry_state';
const MAX_RETRY_ATTEMPTS = 3;
const BASE_DELAY_MS = 60000; // 1 minute base delay

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attemptNumber: number): number {
  return BASE_DELAY_MS * Math.pow(2, attemptNumber - 1);
}

/**
 * Get retry state from localStorage
 */
export function getRetryState(email: string): RetryState {
  try {
    const stored = localStorage.getItem(`${RETRY_STORAGE_KEY}_${email}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to parse retry state:', error);
  }
  
  return {
    attempts: 0,
    lastAttempt: 0,
    nextRetryTime: 0
  };
}

/**
 * Update retry state in localStorage
 */
export function updateRetryState(email: string, state: RetryState): void {
  try {
    localStorage.setItem(`${RETRY_STORAGE_KEY}_${email}`, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to store retry state:', error);
  }
}

/**
 * Clear retry state (call after successful email verification)
 */
export function clearRetryState(email: string): void {
  try {
    localStorage.removeItem(`${RETRY_STORAGE_KEY}_${email}`);
  } catch (error) {
    console.warn('Failed to clear retry state:', error);
  }
}

/**
 * Check if email retry is allowed
 */
export function canRetryEmail(email: string): { 
  canRetry: boolean; 
  timeUntilRetry?: number; 
  attemptsRemaining: number;
} {
  const state = getRetryState(email);
  const now = Date.now();
  
  // If no previous attempts or attempts expired, allow retry
  if (state.attempts === 0 || state.nextRetryTime <= now) {
    return {
      canRetry: true,
      attemptsRemaining: MAX_RETRY_ATTEMPTS - state.attempts
    };
  }
  
  // If max attempts reached, don't allow retry
  if (state.attempts >= MAX_RETRY_ATTEMPTS) {
    return {
      canRetry: false,
      timeUntilRetry: state.nextRetryTime - now,
      attemptsRemaining: 0
    };
  }
  
  // Still within retry window, return time until next retry
  return {
    canRetry: false,
    timeUntilRetry: state.nextRetryTime - now,
    attemptsRemaining: MAX_RETRY_ATTEMPTS - state.attempts
  };
}

/**
 * Record an email attempt (call before sending email)
 */
export function recordEmailAttempt(email: string): void {
  const state = getRetryState(email);
  const now = Date.now();
  
  const newState: RetryState = {
    attempts: state.attempts + 1,
    lastAttempt: now,
    nextRetryTime: now + calculateBackoffDelay(state.attempts + 1)
  };
  
  updateRetryState(email, newState);
}

/**
 * Format time until retry in human-readable format
 */
export function formatRetryTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}

/**
 * Check if error is rate limit related
 */
export function isRateLimitError(error: Error | { message?: string } | unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error) || typeof error.message !== 'string') {
    return false;
  }
  
  const message = error.message.toLowerCase();
  return message.includes('rate') || 
         message.includes('limit') || 
         message.includes('too many');
}

/**
 * Check if error is email delivery related
 */
export function isEmailDeliveryError(error: Error | { message?: string } | unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error) || typeof error.message !== 'string') {
    return false;
  }
  
  const message = error.message.toLowerCase();
  return message.includes('email') && 
         (message.includes('send') || 
          message.includes('deliver') || 
          message.includes('confirmation'));
}