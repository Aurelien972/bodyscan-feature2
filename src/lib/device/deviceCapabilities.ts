/**
 * Device Capabilities Detection - Simplified
 * Basic device performance detection for Body Scan environment
 */

type PerformanceLevel = 'low' | 'medium' | 'high' | 'ultra';

interface DeviceCapabilities {
  performanceLevel: PerformanceLevel;
  supportsHover: boolean;
  isMobile: boolean;
  memoryGB: number;
  cores: number;
}

/**
 * Detect device capabilities
 */
export function detectDeviceCapabilitiesEnhanced(): DeviceCapabilities {
  // Basic performance detection
  const memoryGB = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
  const supportsHover = window.matchMedia('(hover: hover)').matches;
  
  // Determine performance level
  let performanceLevel: PerformanceLevel = 'medium';
  
  if (memoryGB >= 8 && cores >= 8) {
    performanceLevel = 'ultra';
  } else if (memoryGB >= 6 && cores >= 6) {
    performanceLevel = 'high';
  } else if (memoryGB >= 4 && cores >= 4) {
    performanceLevel = 'medium';
  } else {
    performanceLevel = 'low';
  }
  
  return {
    performanceLevel,
    supportsHover,
    isMobile,
    memoryGB,
    cores,
  };
}