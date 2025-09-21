/**
 * Scan Loop Audio Feature
 * Background scan audio loop and progression ticks
 */

import { getAudioContext } from '../core/audioContext';
import { playEnhancedSound } from '../core/soundSynthesis';
import type { ScanLoopState, SoundDefinition } from '../definitions/soundTypes';

// Scan loop state
let scanLoopState: ScanLoopState = {
  isActive: false,
  intervalId: null,
  gainNode: null,
  oscillator: null
};

/**
 * Start scan loop - Background pulsation at 100Hz, 1Hz pulse rate
 */
export function startScanLoop(): void {
  if (scanLoopState.isActive) {
    console.log('TWINFORGE_AUDIO', 'Scan loop already active');
    return;
  }
  
  try {
    const audioContext = getAudioContext();
    
    if (audioContext.state !== 'running') {
      console.warn('TWINFORGE_AUDIO', 'AudioContext not running, cannot start scan loop');
      return;
    }
    
    // Create oscillator and gain for scan loop
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime); // 100Hz base
    oscillator.type = 'sine';
    
    // Connect to destination with low gain (-8dB background)
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0.4 * 0.1, audioContext.currentTime); // -8dB + global scaling
    
    // Start oscillator
    oscillator.start();
    
    // Store references
    scanLoopState.oscillator = oscillator;
    scanLoopState.gainNode = gainNode;
    scanLoopState.isActive = true;
    
    // Create pulsation effect (1Hz pulse rate)
    const pulsate = () => {
      if (!scanLoopState.isActive || !scanLoopState.gainNode) return;
      
      const now = audioContext.currentTime;
      const currentGain = scanLoopState.gainNode.gain.value;
      const targetGain = currentGain > 0.2 ? 0.1 : 0.4; // Pulse between 0.1 and 0.4
      
      scanLoopState.gainNode.gain.exponentialRampToValueAtTime(targetGain * 0.1, now + 0.1);
      
      if (scanLoopState.isActive) {
        scanLoopState.intervalId = window.setTimeout(pulsate, 500); // 1Hz = 1000ms, half cycle = 500ms
      }
    };
    
    // Start pulsation
    pulsate();
    
    console.log('TWINFORGE_AUDIO', 'Scan loop started', {
      frequency: '100Hz',
      pulseRate: '1Hz',
      gain: '-8dB',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AUDIO_FEEDBACK_ERROR', 'Failed to start scan loop', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    scanLoopState.isActive = false;
  }
}

/**
 * Stop scan loop - Clean shutdown with fade-out
 */
export function stopScanLoop(): void {
  if (!scanLoopState.isActive) {
    console.log('TWINFORGE_AUDIO', 'Scan loop not active');
    return;
  }
  
  try {
    // Clear interval
    if (scanLoopState.intervalId) {
      clearTimeout(scanLoopState.intervalId);
      scanLoopState.intervalId = null;
    }
    
    // Fade out and stop oscillator
    if (scanLoopState.gainNode && scanLoopState.oscillator) {
      const audioContext = getAudioContext();
      const now = audioContext.currentTime;
      
      // Fade out over 200ms
      scanLoopState.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      scanLoopState.oscillator.stop(now + 0.2);
    }
    
    // Reset state
    scanLoopState.isActive = false;
    scanLoopState.gainNode = null;
    scanLoopState.oscillator = null;
    
    console.log('TWINFORGE_AUDIO', 'Scan loop stopped', {
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AUDIO_FEEDBACK_ERROR', 'Failed to stop scan loop', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    // Force reset state on error
    scanLoopState.isActive = false;
    scanLoopState.gainNode = null;
    scanLoopState.oscillator = null;
    scanLoopState.intervalId = null;
  }
}

/**
 * Play scan tick - Individual scan progression sound
 */
export function playScanTick(): void {
  const soundDef: SoundDefinition = {
    layers: [
      {
        frequency: 500,
        waveform: 'triangle',
        adsr: { 
          attack: 0.003,   // 3ms - very quick attack
          decay: 0.015,    // 15ms - short decay for "tick"
          sustain: 0, 
          release: 0.005   // 5ms - quick release
        },
        gain: 0.3,
        filter: {
          type: 'lowpass',
          frequency: 2000, // Muffled tick sound
          Q: 1
        }
      }
    ],
    masterGain: 0.56 // -5 dB relative as per spec
  };
  playEnhancedSound(soundDef, 'scan', 'scan-tick');
}

/**
 * Check if scan loop is active
 */
export function isScanLoopActive(): boolean {
  return scanLoopState.isActive;
}