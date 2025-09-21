/**
 * Status Sound Effects
 * Success, error, and form submission sounds
 */

import { playEnhancedSound } from '../core/soundSynthesis';
import { shouldPlaySound } from '../utils/rateLimiting';
import { isAudioEnabled, applyAccessibilityMods, addPitchVariance } from '../utils/accessibility';
import { STRIKE_LAYER_PARAMS, BODY_LAYER_PARAMS, BLOOM_LAYER_PARAMS } from '../definitions/soundLayers';
import type { SoundDefinition } from '../definitions/soundTypes';

/**
 * Play enhanced sound with rate limiting and accessibility checks
 */
function playSound(soundDef: SoundDefinition, soundType: 'success' | 'error' = 'success', soundId?: string): void {
  if (!isAudioEnabled() || !shouldPlaySound(soundType, soundId)) {
    return;
  }
  
  const finalSoundDef = applyAccessibilityMods(soundDef);
  playEnhancedSound(finalSoundDef, soundType, soundId);
}

/**
 * Confirm - STRIKE 60% + BLOOM 40% (tf_confirm.wav equivalent)
 */
export function formSubmit(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(STRIKE_LAYER_PARAMS.frequency),
        gain: STRIKE_LAYER_PARAMS.gain * 0.6
      },
      {
        ...BLOOM_LAYER_PARAMS,
        frequency: addPitchVariance(BLOOM_LAYER_PARAMS.frequency),
        gain: BLOOM_LAYER_PARAMS.gain * 0.4
      }
    ],
    masterGain: 1.26 // +1 dB relative
  };
  playSound(soundDef, 'success');
}

/**
 * Success minor - STRIKE 60% + micro BLOOM 20% + cooling hiss (tf_success_minor.wav equivalent)
 */
export function success(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(STRIKE_LAYER_PARAMS.frequency),
        gain: STRIKE_LAYER_PARAMS.gain * 0.6
      },
      {
        ...BLOOM_LAYER_PARAMS,
        frequency: addPitchVariance(BLOOM_LAYER_PARAMS.frequency),
        gain: BLOOM_LAYER_PARAMS.gain * 0.2
      }
    ],
    masterGain: 1.58 // +2 dB relative
  };
  playSound(soundDef, 'success');
}

/**
 * Error - Double knock sequence (tf_error.wav equivalent)
 */
export function error(): void {
  // First knock at 220 Hz (90ms duration)
  const firstKnock: SoundDefinition = {
    layers: [
      {
        frequency: 220,
        waveform: 'sine',
        adsr: {
          attack: 0.005,
          decay: 0.080,    // 85ms total (5+80)
          sustain: 0,
          release: 0.010
        },
        gain: 0.6,
        // No filter for error sounds - clean sine waves
      }
    ],
    masterGain: 0.79 // -1 dB relative
  };
  
  playSound(firstKnock, 'error');
  
  // Second knock at 180 Hz after 110ms (110ms duration)
  setTimeout(() => {
    const secondKnock: SoundDefinition = {
      layers: [
        {
          frequency: 180,
          waveform: 'sine',
          adsr: {
            attack: 0.005,
            decay: 0.100,   // 105ms total (5+100)
            sustain: 0,
            release: 0.010
          },
          gain: 0.6,
          // No filter for error sounds - clean sine waves
        }
      ],
      masterGain: 0.79 // -1 dB relative
    };
    playSound(secondKnock, 'error');
  }, 110);
}

/**
 * Success major - Forge Stamp sequence (tf_success_major_stamp.wav equivalent)
 */
export function successMajor(): void {
  // Stage 1: STRIKE fort (0-120ms)
  const stage1: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(STRIKE_LAYER_PARAMS.frequency),
        gain: STRIKE_LAYER_PARAMS.gain * 1.0, // Full STRIKE power
        adsr: {
          attack: 0.005,
          decay: 0.110,  // Extended decay for "stamp" effect
          sustain: 0,
          release: 0.015
        }
      }
    ],
    masterGain: 2.51 // +4 dB relative (success major)
  };
  playSound(stage1, 'success');
  
  // Stage 2: BLOOM cuivré with EQ "smile" (120-280ms)
  setTimeout(() => {
    const stage2: SoundDefinition = {
      layers: [
        {
          ...BLOOM_LAYER_PARAMS,
          frequency: 1400, // Centered around 1.4 kHz for "smile" EQ
          gain: BLOOM_LAYER_PARAMS.gain * 0.8, // Enhanced BLOOM
          adsr: {
            attack: 0.010,
            decay: 0.150,
            sustain: 0,
            release: 0.030
          },
          filter: {
            type: 'bandpass', // "Smile" EQ effect
            frequency: 1400,
            Q: 1.5
          }
        }
      ],
      masterGain: 2.51 // +4 dB relative
    };
    playSound(stage2, 'success');
  }, 120);
  
  // Stage 3: Cooling cyan down-swell (220-380ms)
  setTimeout(() => {
    const stage3: SoundDefinition = {
      layers: [
        {
          frequency: 600, // Start frequency
          waveform: 'sine',
          adsr: {
            attack: 0.020,
            decay: 0.140,   // 160ms total duration
            sustain: 0,
            release: 0.020
          },
          gain: 0.35, // -12 dB as specified
          filter: {
            type: 'lowpass',
            frequency: 800, // Muffled down-swell
            Q: 1.2
          }
        }
      ],
      masterGain: 2.51 // +4 dB relative
    };
    playSound(stage3, 'success');
  }, 220);
}