/**
 * Interaction Sound Effects
 * Basic user interaction sounds (clicks, inputs, toggles)
 */

import { playEnhancedSound } from '../core/soundSynthesis';
import { shouldPlaySound } from '../utils/rateLimiting';
import { isAudioEnabled, applyAccessibilityMods, addPitchVariance } from '../utils/accessibility';
import { STRIKE_LAYER_PARAMS, BODY_LAYER_PARAMS, BLOOM_LAYER_PARAMS } from '../definitions/soundLayers';
import type { SoundDefinition } from '../definitions/soundTypes';

/**
 * Play enhanced sound with rate limiting and accessibility checks
 */
function playSound(soundDef: SoundDefinition, soundType: 'click' | 'scan' = 'click', soundId?: string): void {
  if (!isAudioEnabled() || !shouldPlaySound(soundType, soundId)) {
    return;
  }
  
  const finalSoundDef = applyAccessibilityMods(soundDef);
  playEnhancedSound(finalSoundDef, soundType, soundId);
}

/**
 * Basic tap/click - STRIKE 70% + BODY 30% (tf_tap.wav equivalent)
 */
export function click(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(STRIKE_LAYER_PARAMS.frequency),
        gain: STRIKE_LAYER_PARAMS.gain * 0.7
      },
      {
        ...BODY_LAYER_PARAMS,
        frequency: addPitchVariance(BODY_LAYER_PARAMS.frequency),
        gain: BODY_LAYER_PARAMS.gain * 0.3
      }
    ],
    masterGain: 1.0 // 0 dB relative
  };
  playSound(soundDef, 'click');
}

/**
 * Glass click - Enhanced version of click (tf_tap.wav equivalent)
 */
export function glassClick(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(STRIKE_LAYER_PARAMS.frequency),
        gain: STRIKE_LAYER_PARAMS.gain * 0.7
      },
      {
        ...BODY_LAYER_PARAMS,
        frequency: addPitchVariance(BODY_LAYER_PARAMS.frequency),
        gain: BODY_LAYER_PARAMS.gain * 0.3
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef, 'click');
}

/**
 * Form input - Subtle feedback for form interactions
 */
export function formInput(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        frequency: 800,
        waveform: 'triangle',
        adsr: { 
          attack: 0.005, 
          decay: 0.020, 
          sustain: 0, 
          release: 0.005 
        },
        gain: 0.3,
        filter: {
          type: 'lowpass',
          frequency: 3000,
          Q: 0.8
        }
      }
    ],
    masterGain: 0.8
  };
  playSound(soundDef, 'click');
}

/**
 * Toggle - State change feedback
 */
export function toggle(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        frequency: 520,
        waveform: 'triangle',
        adsr: { attack: 0.010, decay: 0.050, sustain: 0, release: 0.010 },
        gain: 0.5,
        filter: {
          type: 'lowpass',
          frequency: 2500,
          Q: 1.2
        }
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef, 'click');
}

/**
 * Notification - General notification sound
 */
export function notif(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        frequency: 740,
        waveform: 'triangle',
        adsr: { attack: 0.015, decay: 0.105, sustain: 0, release: 0.015 },
        gain: 0.5,
        filter: {
          type: 'lowpass',
          frequency: 4000,
          Q: 1
        }
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef, 'click');
}

/**
 * Timer - Timer/clock feedback
 */
export function timer(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        frequency: 800,
        waveform: 'sine',
        adsr: { attack: 0.010, decay: 0.070, sustain: 0, release: 0.010 },
        gain: 0.4,
        filter: {
          type: 'lowpass',
          frequency: 3500,
          Q: 1
        }
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef, 'click');
}