/**
 * Sound Synthesis Core
 * Low-level sound generation and ADSR envelope application
 */

import { getAudioContext, isAudioContextReady } from './audioContext';
import type { SoundLayer, SoundDefinition, FeedbackType } from '../definitions/soundTypes';

/**
 * Create a single sound layer with ADSR envelope and optional filtering
 */
export function createSoundLayer(
  audioContext: AudioContext,
  layerDef: SoundLayer,
  startTime: number
): { oscillator: OscillatorNode; gainNode: GainNode; duration: number } {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Configure oscillator
  oscillator.frequency.setValueAtTime(layerDef.frequency, startTime);
  oscillator.type = layerDef.waveform;
  
  // Create filter if specified
  let filterNode: BiquadFilterNode | null = null;
  if (layerDef.filter) {
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = layerDef.filter.type;
    filterNode.frequency.setValueAtTime(layerDef.filter.frequency, startTime);
    if (layerDef.filter.Q !== undefined) {
      filterNode.Q.setValueAtTime(layerDef.filter.Q, startTime);
    }
  }
  
  // Connect audio graph
  if (filterNode) {
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
  } else {
    oscillator.connect(gainNode);
  }
  
  // Configure ADSR envelope
  const { attack, decay, sustain, release } = layerDef.adsr;
  const peakGain = layerDef.gain;
  const sustainGain = peakGain * sustain;
  
  // Calculate timing
  const attackEnd = startTime + attack;
  const decayEnd = attackEnd + decay;
  const releaseStart = decayEnd; // No sustain phase since sustain = 0 in spec
  const releaseEnd = releaseStart + release;
  const totalDuration = attack + decay + release;
  
  // Apply ADSR envelope
  gainNode.gain.setValueAtTime(0, startTime);
  
  // Attack phase
  gainNode.gain.linearRampToValueAtTime(peakGain, attackEnd);
  
  // Decay phase
  if (sustain > 0) {
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, sustainGain), decayEnd);
  } else {
    // Direct decay to near-zero if no sustain
    gainNode.gain.exponentialRampToValueAtTime(0.001, decayEnd);
  }
  
  // Release phase
  gainNode.gain.exponentialRampToValueAtTime(0.001, releaseEnd);
  
  return { oscillator, gainNode, duration: totalDuration };
}

/**
 * Enhanced playSound function with layered synthesis
 */
export function playEnhancedSound(
  soundDef: SoundDefinition, 
  soundType: FeedbackType = 'click', 
  soundId?: string
): void {
  try {
    const audioContext = getAudioContext();
    
    // Skip audio if context is not running
    if (!isAudioContextReady()) {
      console.warn('AUDIO_FEEDBACK_WARNING', 'AudioContext not running, skipping layered audio', {
        contextState: audioContext.state,
        layersCount: soundDef.layers.length,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const startTime = audioContext.currentTime;
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    
    // Set master gain
    const masterGainValue = (soundDef.masterGain || 1) * 0.1; // Global volume scaling
    masterGain.gain.setValueAtTime(masterGainValue, startTime);
    
    // Create and start all layers
    const layerNodes: Array<{ oscillator: OscillatorNode; gainNode: GainNode; duration: number }> = [];
    let maxDuration = 0;
    
    soundDef.layers.forEach((layerDef) => {
      const layerNodes_item = createSoundLayer(audioContext, layerDef, startTime);
      layerNodes.push(layerNodes_item);
      
      // Connect layer to master gain
      layerNodes_item.gainNode.connect(masterGain);
      
      // Track maximum duration
      maxDuration = Math.max(maxDuration, layerNodes_item.duration);
    });
    
    // Start all oscillators
    layerNodes.forEach(({ oscillator }) => {
      oscillator.start(startTime);
    });
    
    // Stop all oscillators after max duration
    const stopTime = startTime + maxDuration;
    layerNodes.forEach(({ oscillator }) => {
      oscillator.stop(stopTime);
    });
    
    console.log('TWINFORGE_AUDIO', 'Layered sound played', {
      layersCount: soundDef.layers.length,
      totalDuration: (maxDuration * 1000).toFixed(1) + 'ms',
      masterGain: masterGainValue.toFixed(3),
      soundType,
      soundId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AUDIO_FEEDBACK_ERROR', 'Layered audio playback failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      layersCount: soundDef.layers.length,
      soundType,
      audioContextSupported: !!(window.AudioContext || (window as any).webkitAudioContext),
      timestamp: new Date().toISOString()
    });
  }
}