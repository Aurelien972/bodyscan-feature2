/**
 * Rate Limiting Utilities
 * Prevents audio chaos through intelligent rate limiting and debouncing
 */

import type { FeedbackType, RateLimitState } from '../definitions/soundTypes';

// Constants for rate limiting
export const MAX_SOUNDS_PER_SECOND = 4;
export const DEBOUNCE_THRESHOLD_MS = 60;
export const RATE_LIMIT_WINDOW_MS = 1000;

// Global rate limiting state
let rateLimitState: RateLimitState = {
  soundQueue: [],
  lastPlayTime: 0,
  debounceMap: new Map()
};

/**
 * Check if sound should be played based on rate limiting
 */
export function shouldPlaySound(soundType: FeedbackType, soundId?: string): boolean {
  const now = Date.now();
  
  // Debounce check for rapid taps
  if (soundId) {
    const lastPlayTime = rateLimitState.debounceMap.get(soundId) || 0;
    if (now - lastPlayTime < DEBOUNCE_THRESHOLD_MS) {
      console.log('TWINFORGE_AUDIO', 'Sound debounced', {
        soundId,
        timeSinceLastMs: now - lastPlayTime,
        threshold: DEBOUNCE_THRESHOLD_MS
      });
      return false;
    }
    rateLimitState.debounceMap.set(soundId, now);
  }
  
  // Rate limiting check (max 4 sounds per second, excluding scan loop)
  if (soundType !== 'scan') {
    // Clean old entries from queue
    rateLimitState.soundQueue = rateLimitState.soundQueue.filter(
      entry => now - entry.timestamp < RATE_LIMIT_WINDOW_MS
    );
    
    // Check if we're at the limit
    if (rateLimitState.soundQueue.length >= MAX_SOUNDS_PER_SECOND) {
      console.log('TWINFORGE_AUDIO', 'Sound rate limited', {
        soundType,
        queueLength: rateLimitState.soundQueue.length,
        maxAllowed: MAX_SOUNDS_PER_SECOND
      });
      return false;
    }
    
    // Add to queue
    rateLimitState.soundQueue.push({ timestamp: now, type: soundType });
  }
  
  return true;
}

/**
 * Reset rate limiting state (useful for testing)
 */
export function resetRateLimitState(): void {
  rateLimitState = {
    soundQueue: [],
    lastPlayTime: 0,
    debounceMap: new Map()
  };
}