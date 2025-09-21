/**
 * Sound Types and Interfaces
 * TypeScript definitions for the audio feedback system
 */

export type FeedbackType = 'click' | 'success' | 'error' | 'scan' | 'navigation';

/**
 * Audio Preferences and Accessibility
 */
export interface AudioPreferences {
  enabled: boolean;
  discreteMode: boolean;  // -6dB all sounds, removes BLOOM & hiss
  reducedMotion: boolean; // Remove pitch variance ±2%
}

/**
 * Rate Limiting State
 */
export interface RateLimitState {
  soundQueue: Array<{ timestamp: number; type: FeedbackType }>;
  lastPlayTime: number;
  debounceMap: Map<string, number>;
}

/**
 * ADSR Envelope Definition
 */
export interface ADSREnvelope {
  attack: number;   // Attack time in seconds
  decay: number;    // Decay time in seconds
  sustain: number;  // Sustain level (0-1)
  release: number;  // Release time in seconds
}

/**
 * Filter Definition
 */
export interface FilterDefinition {
  type: 'lowpass' | 'highpass' | 'bandpass';
  frequency: number;  // Cutoff frequency in Hz
  Q?: number;        // Quality factor (default: 1)
}

/**
 * Sound Layer Definition
 */
export interface SoundLayer {
  frequency: number;
  waveform: OscillatorType;
  adsr: ADSREnvelope;
  gain: number;      // Peak gain (0-1)
  filter?: FilterDefinition;
}

/**
 * Complete Sound Definition
 */
export interface SoundDefinition {
  layers: SoundLayer[];
  masterGain?: number;  // Overall volume multiplier
}

/**
 * Scan Loop State
 */
export interface ScanLoopState {
  isActive: boolean;
  intervalId: number | null;
  gainNode: GainNode | null;
  oscillator: OscillatorNode | null;
}