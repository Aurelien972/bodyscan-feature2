/**
 * Audio Context Management
 * Singleton AudioContext management for the application
 */

// Global AudioContext instance to prevent multiple contexts
let globalAudioContext: AudioContext | null = null;

/**
 * Get or create global AudioContext and ensure it's running
 */
export function getAudioContext(): AudioContext {
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  // Resume context if suspended
  if (globalAudioContext.state === 'suspended') {
    globalAudioContext.resume().catch(error => {
      console.error('AUDIO_FEEDBACK_ERROR', 'Failed to resume AudioContext', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contextState: globalAudioContext?.state,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  return globalAudioContext;
}

/**
 * Check if AudioContext is available and running
 */
export function isAudioContextReady(): boolean {
  return globalAudioContext?.state === 'running';
}

/**
 * Cleanup global AudioContext
 */
export function cleanupAudioContext(): void {
  if (globalAudioContext) {
    globalAudioContext.close();
    globalAudioContext = null;
  }
}