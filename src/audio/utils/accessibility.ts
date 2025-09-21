/**
 * Audio Accessibility Utilities
 * Handles user preferences and accessibility modifications
 */

import type { AudioPreferences, SoundDefinition } from '../definitions/soundTypes';

// Global audio preferences
let audioPreferences: AudioPreferences = {
  enabled: true,
  discreteMode: false,
  reducedMotion: false
};

/**
 * Set audio preferences for accessibility
 */
export function setAudioPreferences(prefs: Partial<AudioPreferences>): void {
  audioPreferences = { ...audioPreferences, ...prefs };
  
  console.log('TWINFORGE_AUDIO', 'Audio preferences updated', {
    enabled: audioPreferences.enabled,
    discreteMode: audioPreferences.discreteMode,
    reducedMotion: audioPreferences.reducedMotion,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get current audio preferences
 */
export function getAudioPreferences(): AudioPreferences {
  return { ...audioPreferences };
}

/**
 * Check if audio is enabled
 */
export function isAudioEnabled(): boolean {
  return audioPreferences.enabled;
}

/**
 * Apply accessibility modifications to sound definition
 */
export function applyAccessibilityMods(soundDef: SoundDefinition): SoundDefinition {
  const modifiedDef = JSON.parse(JSON.stringify(soundDef)); // Deep clone
  
  // Discrete Mode: -6dB all sounds, remove BLOOM & hiss layers
  if (audioPreferences.discreteMode) {
    modifiedDef.masterGain = (modifiedDef.masterGain || 1) * 0.5; // -6dB
    
    // Remove BLOOM and cooling hiss layers
    modifiedDef.layers = modifiedDef.layers.filter(layer => {
      const isBloom = layer.frequency >= 1200 && layer.frequency <= 1800;
      const isCoolingHiss = layer.frequency >= 450 && layer.frequency <= 600 && layer.filter?.type === 'bandpass';
      return !isBloom && !isCoolingHiss;
    });
  }
  
  return modifiedDef;
}

/**
 * Add pitch variance for anti-fatigue (±2%)
 */
export function addPitchVariance(baseFrequency: number, variancePercent: number = 2): number {
  // Skip variance if reduced motion is enabled
  if (audioPreferences.reducedMotion) {
    return baseFrequency;
  }
  
  const variance = (Math.random() - 0.5) * 2 * (variancePercent / 100);
  return baseFrequency * (1 + variance);
}