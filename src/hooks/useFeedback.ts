// src/hooks/useFeedback.ts
/**
 * Feedback Hook - TwinForge "Strike & Bloom" Audio System
 * Modularized implementation using the new audio system
 */

import {
  // Interaction sounds
  click,
  glassClick,
  formInput,
  toggle,
  notif,
  timer,
  
  // Status sounds
  formSubmit,
  success,
  error,
  successMajor,
  
  // Navigation sounds
  tabClick,
  sidebarClick,
  headerClick,
  navOpen,
  navClose,
  
  // Avatar sounds
  avatarReveal,
  
  // Scan sounds
  scanProgress,
  scanTick,
  scan,
  
  // Features
  startScanLoop,
  stopScanLoop,
  
  // Utilities
  setAudioPreferences,
  getAudioPreferences,
  playEnhancedSound,
  playSoundLegacy,
  
  // Exports
  TWINFORGE_AUDIO_LAYERS,
  TWINFORGE_AUDIO_CONTROLS
} from '../audio';

/**
 * TwinForge Feedback Hook with "Strike & Bloom" DNA
 * Now using modular audio system for better maintainability
 */
export function useFeedback() {
  return {
    // Basic interactions
    click,
    glassClick,
    formInput,
    toggle,
    notif,
    timer,
    
    // Status feedback
    formSubmit,
    success,
    error,
    successMajor,
    
    // Navigation feedback
    tabClick,
    sidebarClick,
    headerClick,
    navOpen,
    navClose,
    
    // Avatar feedback
    avatarReveal,
    
    // Scan feedback
    scan,
    scanTick,
    scanProgress,
    
    // Scan loop control
    startScanLoop,
    stopScanLoop,
    
    // Audio preferences control
    setAudioEnabled: (enabled: boolean) => {
      setAudioPreferences({ enabled });
    },
    
    setDiscreteMode: (discrete: boolean) => {
      setAudioPreferences({ discreteMode: discrete });
    },
    
    getAudioPreferences
  };
}

// Re-export for backward compatibility
export { 
  playEnhancedSound,
  playSoundLegacy,
  TWINFORGE_AUDIO_LAYERS,
  TWINFORGE_AUDIO_CONTROLS
};
