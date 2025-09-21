/**
 * Audio System Barrel Export
 * Main entry point for the modular audio system
 */

// Core functionality
export { playEnhancedSound } from './core/soundSynthesis';
export { getAudioContext, isAudioContextReady, cleanupAudioContext } from './core/audioContext';

// Sound definitions
export { TWINFORGE_AUDIO_LAYERS } from './definitions/soundLayers';
export type { 
  FeedbackType, 
  AudioPreferences, 
  SoundDefinition, 
  SoundLayer, 
  ADSREnvelope 
} from './definitions/soundTypes';

// Utilities
import { setAudioPreferences, getAudioPreferences, isAudioEnabled } from './utils/accessibility';
import { shouldPlaySound, resetRateLimitState } from './utils/rateLimiting';
import { playSoundLegacy } from './utils/legacyCompat';

// Features
import { startScanLoop, stopScanLoop, playScanTick, isScanLoopActive } from './features/scanLoop';

// Sound effects
export * from './effects/interactionSounds';
export * from './effects/statusSounds';
export * from './effects/navigationSounds';
export { avatarReveal } from './effects/avatarSounds';
export * from './effects/scanSounds';

// Audio controls collection
export const TWINFORGE_AUDIO_CONTROLS = {
  setAudioPreferences,
  startScanLoop,
  stopScanLoop,
  playScanTick
}

// Explicit exports for functions that need to be imported directly
export { getAudioPreferences, setAudioPreferences, isAudioEnabled };
export { playSoundLegacy };
export { startScanLoop, stopScanLoop, playScanTick, isScanLoopActive };