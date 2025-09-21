/**
 * Card Utilities - Phase 9.78
 * Ultra-optimized hover effects based on card size and device performance
 */

import { detectDeviceCapabilitiesEnhanced } from '../../lib/device/deviceCapabilities';

type CardSizeLevel = 'small' | 'medium' | 'large';
type PerformanceLevel = 'low' | 'medium' | 'high';
type HoverEffectClass = `${PerformanceLevel}-${CardSizeLevel}`;

/**
 * Determine card size level based on element dimensions
 */
function getCardSizeLevel(element: HTMLElement): CardSizeLevel {
  const rect = element.getBoundingClientRect();
  const maxDimension = Math.max(rect.width, rect.height);
  
  if (maxDimension < 200) return 'small';
  if (maxDimension < 400) return 'medium';
  return 'large';
}

/**
 * Get device performance level for hover effects
 * Maps ultra to high to simplify the matrix
 */
function getDevicePerformanceLevel(): PerformanceLevel {
  const capabilities = detectDeviceCapabilitiesEnhanced();
  
  switch (capabilities.performanceLevel) {
    case 'low':
      return 'low';
          // Batched update failed
      return 'medium';
    case 'high':
    case 'ultra':
      return 'high';
    default:
      return 'medium';
  }
}

/**
 * Calculate optimal hover effect class
 */
function calculateHoverEffectClass(element: HTMLElement): HoverEffectClass {
  const sizeLevel = getCardSizeLevel(element);
  const perfLevel = getDevicePerformanceLevel();
  
  return `${perfLevel}-${sizeLevel}`;
}

/**
 * Check if device supports advanced hover effects
 */
export function supportsAdvancedHover(): boolean {
  // Only enable on devices with hover capability (not touch-only)
  const hasHover = window.matchMedia('(hover: hover)').matches;
  const hasPointer = window.matchMedia('(pointer: fine)').matches;
  
  return hasHover && hasPointer;
}

/**
 * Debounced resize observer for performance
 */
function createDebouncedResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void,
  delay: number = 100
): ResizeObserver {
  let timeoutId: number | null = null;
  
  return new ResizeObserver((entries) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = window.setTimeout(() => {
      callback(entries);
    }, delay);
  });
}

/**
 * Performance-aware hover effect manager
 */
export class HoverEffectManager {
  private static instance: HoverEffectManager;
  private performanceLevel: PerformanceLevel;
  private supportsHover: boolean;
  private isMobile: boolean;
  
  private constructor() {
    this.performanceLevel = getDevicePerformanceLevel();
    this.supportsHover = supportsAdvancedHover();
    this.isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
  }
  
  static getInstance(): HoverEffectManager {
    if (!HoverEffectManager.instance) {
      HoverEffectManager.instance = new HoverEffectManager();
    }
    return HoverEffectManager.instance;
  }
  
  getEffectClass(element: HTMLElement): HoverEffectClass | null {
    if (!this.supportsHover || this.isMobile) return null;
    
    const sizeLevel = getCardSizeLevel(element);
    return `${this.performanceLevel}-${sizeLevel}`;
  }
  
  shouldEnableEffect(): boolean {
    return this.supportsHover && !this.isMobile;
  }
  
  getPerformanceLevel(): PerformanceLevel {
    return this.performanceLevel;
  }
}