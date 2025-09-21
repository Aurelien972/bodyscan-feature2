/**
 * Navigation Sound Effects
 * Sounds for navigation events (tabs, sidebar, header)
 */

import { playEnhancedSound } from '../core/soundSynthesis';
import { shouldPlaySound } from '../utils/rateLimiting';
import { isAudioEnabled, applyAccessibilityMods, addPitchVariance } from '../utils/accessibility';
import { STRIKE_LAYER_PARAMS, BODY_LAYER_PARAMS, BLOOM_LAYER_PARAMS } from '../definitions/soundLayers';
import type { SoundDefinition } from '../definitions/soundTypes';

/**
 * Play enhanced sound with rate limiting and accessibility checks
 */
function playSound(soundDef: SoundDefinition, soundId?: string): void {
  if (!isAudioEnabled() || !shouldPlaySound('navigation', soundId)) {
    return;
  }
  
  const finalSoundDef = applyAccessibilityMods(soundDef);
  playEnhancedSound(finalSoundDef, 'navigation', soundId);
}

/**
 * Tab click - Higher pitch for tab distinction
 */
export function tabClick(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(660), // Higher pitch for tab distinction
        gain: STRIKE_LAYER_PARAMS.gain * 0.5
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef);
}

/**
 * Sidebar click - Navigation feedback
 */
export function sidebarClick(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(350), // Lower pitch for sidebar
        gain: STRIKE_LAYER_PARAMS.gain * 0.4
      },
      {
        ...BODY_LAYER_PARAMS,
        frequency: addPitchVariance(BODY_LAYER_PARAMS.frequency),
        gain: BODY_LAYER_PARAMS.gain * 0.2
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef);
}

/**
 * Header click - Header navigation feedback
 */
export function headerClick(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        frequency: 880,
        waveform: 'sine',
        adsr: { attack: 0.006, decay: 0.026, sustain: 0, release: 0.006 },
        gain: 0.4
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef);
}

/**
 * Navigation open - Sidebar/drawer opening
 */
export function navOpen(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(400), // Lower for "opening"
        gain: STRIKE_LAYER_PARAMS.gain * 0.4
      },
      {
        ...BLOOM_LAYER_PARAMS,
        frequency: addPitchVariance(1200),
        gain: BLOOM_LAYER_PARAMS.gain * 0.3
      }
    ],
    masterGain: 1.0
  };
  playSound(soundDef);
}

/**
 * Navigation close - Sidebar/drawer closing
 */
export function navClose(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        ...STRIKE_LAYER_PARAMS,
        frequency: addPitchVariance(350), // Slightly lower for "closing"
        gain: STRIKE_LAYER_PARAMS.gain * 0.3
      }
    ],
    masterGain: 0.9
  };
  playSound(soundDef);
}