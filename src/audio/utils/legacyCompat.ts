/**
 * Legacy Compatibility
 * Backward compatibility functions for existing code
 */

import { playEnhancedSound } from '../core/soundSynthesis';
import type { SoundDefinition } from '../definitions/soundTypes';

/**
 * Legacy export for backward compatibility
 */
export const playSoundLegacy = (frequency: number, duration: number = 100) => {
  const legacySoundDef: SoundDefinition = {
    layers: [
      {
        frequency,
        waveform: 'sine',
        adsr: {
          attack: 0.010,
          decay: duration / 1000 - 0.020,
          sustain: 0,
          release: 0.010
        },
        gain: 0.4
      }
    ],
    masterGain: 1.0
  };
  playEnhancedSound(legacySoundDef);
};