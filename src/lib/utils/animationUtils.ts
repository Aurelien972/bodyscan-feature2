/**
 * Animation Utilities - VisionOS 26 Optimized
 * Centralized animation helpers and configurations
 */

import { usePreferredMotion } from '../../system/device/DeviceProvider';

// VisionOS 26 Easing Functions
const visionOSEasing = {
  gentle: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  spring: [0.175, 0.885, 0.32, 1.275] as [number, number, number, number],
  smooth: [0.16, 1, 0.3, 1] as [number, number, number, number],
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
};

// Animation Durations
const animationDurations = {
  fast: 0.3,
  medium: 0.6,
  slow: 1.2,
  extraSlow: 2.0,
};

// Glass Effect Configurations
const glassEffects = {
  blur: {
    light: 'blur(8px)',
    medium: 'blur(12px)',
    heavy: 'blur(16px)',
  },
  saturate: {
    light: 'saturate(120%)',
    medium: 'saturate(140%)',
    heavy: 'saturate(160%)',
  },
  opacity: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.08)',
    heavy: 'rgba(255, 255, 255, 0.12)',
  },
};

/**
 * Get animation configuration based on user preferences
 */
export function getAnimationConfig(complexity: 'simple' | 'medium' | 'complex' = 'medium') {
  const preferredMotion = usePreferredMotion();
  
  if (preferredMotion === 'reduced') {
    return {
      shouldAnimate: false,
      duration: 0.1,
      ease: 'linear' as const,
      particleCount: 0,
    };
  }
  
  const configs = {
    simple: {
      shouldAnimate: true,
      duration: animationDurations.fast,
      ease: visionOSEasing.gentle,
      particleCount: 2,
    },
    medium: {
      shouldAnimate: true,
      duration: animationDurations.medium,
      ease: visionOSEasing.smooth,
      particleCount: 3,
    },
    complex: {
      shouldAnimate: true,
      duration: animationDurations.slow,
      ease: visionOSEasing.spring,
      particleCount: 5,
    },
  };
  
  return configs[complexity];
}

/**
 * Create glass button style with breathing effect
 */
function createGlassButtonStyle(color: string, isActive: boolean = false) {
  return {
    background: `linear-gradient(135deg, ${color}${isActive ? '80' : '20'}, ${color}${isActive ? '' : '40'})`,
    backdropFilter: `${glassEffects.blur.medium} ${glassEffects.saturate.medium}`,
    border: `1px solid ${color}${isActive ? '80' : '40'}`,
    boxShadow: `0 0 ${isActive ? '40' : '20'}px ${color}${isActive ? '60' : '30'}, inset 0 ${isActive ? '2' : '1'}px 0 rgba(255,255,255,${isActive ? '0.3' : '0.2'})`,
  };
}

/**
 * Create ripple effect configuration
 */
function createRippleEffect(color: string, size: 'small' | 'medium' | 'large' = 'medium') {
  const sizes = {
    small: { width: '150%', height: '150%' },
    medium: { width: '200%', height: '200%' },
    large: { width: '300%', height: '300%' },
  };
  
  return {
    background: `radial-gradient(circle, ${color}60 0%, transparent 70%)`,
    ...sizes[size],
  };
}

/**
 * Safe progress value calculation
 */
export function safeProgress(value: number, fallback: number = 0): number {
  // CRITICAL: More robust validation for progress values
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value) || value === undefined || value === null) {
    console.warn('Invalid progress value detected:', value, 'using fallback:', fallback);
    return fallback;
  }
  return Math.max(0, Math.min(100, value));
}

/**
 * Calculate animation delay based on index
 */
function calculateStaggerDelay(index: number, baseDelay: number = 0.1): number {
  return baseDelay * index;
}

/**
 * Create glass overlay style
 */
function createGlassOverlay(color: string, opacity: number = 0.2) {
  return {
    background: `linear-gradient(135deg, ${color}${Math.round(opacity * 100)}, ${color}${Math.round(opacity * 150)})`,
    backdropFilter: `${glassEffects.blur.light} ${glassEffects.saturate.light}`,
    border: `1px solid ${color}${Math.round(opacity * 200)}`,
  };
}