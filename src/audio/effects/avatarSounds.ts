/**
 * Avatar Sound Effects
 * Sounds related to avatar events and reveals
 */

import { playEnhancedSound } from '../core/soundSynthesis';
import { shouldPlaySound } from '../utils/rateLimiting';
import { isAudioEnabled, applyAccessibilityMods, addPitchVariance } from '../utils/accessibility';
import { STRIKE_LAYER_PARAMS, BLOOM_LAYER_PARAMS } from '../definitions/soundLayers';
import type { SoundDefinition } from '../definitions/soundTypes';

/**
 * Play enhanced sound with rate limiting and accessibility checks
 */
function playSound(soundDef: SoundDefinition, soundId?: string): void {
  if (!isAudioEnabled() || !shouldPlaySound('success', soundId)) {
    return;
  }
  
  const finalSoundDef = applyAccessibilityMods(soundDef);
  playEnhancedSound(finalSoundDef, 'success', soundId);
}

/**
 * Avatar reveal - Enhanced with BLOOM layer
 */
export function avatarReveal(): void {
  // Stage 1: STRIKE foundation
  const soundDef1: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(440), // A4 note
        gain: STRIKE_LAYER_PARAMS.gain * 0.6
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef1, 'avatar-reveal-1');
  
  // Stage 2: BLOOM harmony after 120ms
  setTimeout(() => {
    const soundDef2: SoundDefinition = {
      layers: [
        {
          ...BLOOM_LAYER_PARAMS,
          frequency: addPitchVariance(554), // C#5 note
          gain: BLOOM_LAYER_PARAMS.gain * 0.5
        }
      ],
      masterGain: 1.0
    };
    playSound(soundDef2, 'avatar-reveal-2');
  }, 120);
  
  // Stage 3: Enhanced BLOOM resolution after 240ms
  setTimeout(() => {
    const soundDef3: SoundDefinition = {
      layers: [
        {
          ...BLOOM_LAYER_PARAMS,
          frequency: addPitchVariance(659), // E5 note
          gain: BLOOM_LAYER_PARAMS.gain * 0.6
        }
      ],
      masterGain: 1.0
    };
    playSound(soundDef3, 'avatar-reveal-3');
  }, 240);
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