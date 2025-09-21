/**
 * Scan Sound Effects
 * Sounds specifically for scan progression and feedback
 */

import { playEnhancedSound } from '../core/soundSynthesis';
import { shouldPlaySound } from '../utils/rateLimiting';
import { isAudioEnabled, applyAccessibilityMods } from '../utils/accessibility';
import { playScanTick } from '../features/scanLoop';
import type { SoundDefinition } from '../definitions/soundTypes';

/**
 * Play enhanced sound with rate limiting and accessibility checks
 */
function playSound(soundDef: SoundDefinition, soundId?: string): void {
  if (!isAudioEnabled() || !shouldPlaySound('scan', soundId)) {
    return;
  }
  
  const finalSoundDef = applyAccessibilityMods(soundDef);
  playEnhancedSound(finalSoundDef, 'scan', soundId);
}

/**
 * Scan progress - Legacy compatibility with enhanced tick
 */
export function scanProgress(): void {
  playScanTick();
}

/**
 * Scan tick - Direct access to scan tick functionality
 */
export function scanTick(): void {
  playScanTick();
}

/**
 * Scan - Subtle scan feedback
 */
export function scan(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        frequency: 320,
        waveform: 'sine',
        adsr: { attack: 0.020, decay: 0.180, sustain: 0, release: 0.020 },
        gain: 0.3,
        filter: {
          type: 'lowpass',
          frequency: 1500,
          Q: 0.8
        }
      }
    ],
    masterGain: 0.4 // -8 dB for background scan sounds
  };
  playSound(soundDef);
}