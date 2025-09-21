/**
 * TwinForge Sound Layer Definitions
 * "Strike & Bloom" DNA sound parameters
 */

import type { SoundLayer } from './soundTypes';

// STRIKE Layer - Grave compact (290 Hz, square filtered) - TwinForge DNA
export const STRIKE_LAYER_PARAMS: SoundLayer = {
  frequency: 290,
  waveform: 'square',
  adsr: {
    attack: 0.005,   // 5ms
    decay: 0.070,    // 70ms
    sustain: 0,      // 0 (no sustain phase)
    release: 0.015   // 15ms
  },
  gain: 0.8,
  filter: {
    type: 'lowpass',
    frequency: 1800, // 1.8 kHz
    Q: 0.7
  }
};

// BODY Layer - Sub-thump (95-110 Hz, sine) - TwinForge DNA
export const BODY_LAYER_PARAMS: SoundLayer = {
  frequency: 102,  // Middle of 95-110 Hz range
  waveform: 'sine',
  adsr: {
    attack: 0.008,   // 8ms
    decay: 0.055,    // 55ms
    sustain: 0,      // 0 (no sustain phase)
    release: 0.012   // 12ms
  },
  gain: 0.6,
  filter: {
    type: 'highpass',
    frequency: 60,   // HPF at 60 Hz
    Q: 1
  }
};

// BLOOM Layer - Brillance métallique (1.2-1.8 kHz, triangle) - TwinForge DNA
export const BLOOM_LAYER_PARAMS: SoundLayer = {
  frequency: 1500, // Middle of 1.2-1.8 kHz range
  waveform: 'triangle',
  adsr: {
    attack: 0.010,   // 10ms
    decay: 0.150,    // 150ms
    sustain: 0,      // 0 (no sustain phase)
    release: 0.030   // 30ms
  },
  gain: 0.4, // -12 dB vs STRIKE (roughly 0.4 vs 0.8)
  filter: {
    type: 'lowpass',
    frequency: 6000, // Cut >6 kHz
    Q: 1
  }
};

/**
 * COOLING HISS Layer - Band-limited cooling effect for success sounds
 */
export const COOLING_HISS_LAYER_PARAMS: SoundLayer = {
  frequency: 525, // Middle of 450-600 Hz range
  waveform: 'triangle',
  adsr: {
    attack: 0.020,   // 20ms
    decay: 0.100,    // 100ms
    sustain: 0,      // 0 (no sustain phase)
    release: 0.020   // 20ms
  },
  gain: 0.15, // -18 dB as specified
  filter: {
    type: 'bandpass',
    frequency: 525,  // Center frequency
    Q: 2.5          // Narrow band for "hiss" effect
  }
};

// Export all layers as a collection
export const TWINFORGE_AUDIO_LAYERS = {
  STRIKE: STRIKE_LAYER_PARAMS,
  BODY: BODY_LAYER_PARAMS,
  BLOOM: BLOOM_LAYER_PARAMS,
  COOLING_HISS: COOLING_HISS_LAYER_PARAMS
};