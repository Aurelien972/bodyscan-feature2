/**
 * Design Kernel - VisionOS26+ Premium System
 * Central design tokens and utilities for ultra-premium experience
 */

export const designKernel = {
  // Glass V2 System
  glass: {
    // Radius / Blur / Opacity tokens
    radius: { sm: '12px', lg: '22px', xl: '28px' },
    blur: { sm: '8px', base: '12px', lg: '16px', xl: '24px' },
    opacity: { background: 0.06, border: 0.18, tint: 0.03, hover: 0.08, active: 0.04 },

    // Visual styling tokens
    stroke: 'rgba(255,255,255,0.16)',
    innerHighlight: 'rgba(255,255,255,0.08)',
    shadow: '0 12px 36px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)',
    background: `
      radial-gradient(1100px 720px at 50% -10%, rgba(255,255,255,0.08), transparent 58%),
      linear-gradient(180deg, rgba(18,24,40,0.78), rgba(14,18,32,0.86))
    `,
    saturate: '140%',
  },
  
  // Animation System
  animation: {
    // Unified motion timings for VisionOS-like feel
    hoverMs: 180,
    tapMs: 110,
    focusMs: 160,
    ease: [0.22, 0.55, 0.12, 0.98] as [number, number, number, number],
    
    curves: {
      glass: 'cubic-bezier(0.16, 1, 0.3, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    durations: {
      fast: 150,
      base: 200,
      slow: 300,
      slower: 500,
    },
    scales: {
      hover: 1.02,
      active: 0.985,
      press: 0.95,
    },
  },
  
  // Typography Scale
  typography: {
    scales: {
      xs: { size: '0.75rem', lineHeight: 1.5 },
      sm: { size: '0.875rem', lineHeight: 1.5 },
      base: { size: '1rem', lineHeight: 1.5 },
      lg: { size: '1.125rem', lineHeight: 1.4 },
      xl: { size: '1.25rem', lineHeight: 1.4 },
      '2xl': { size: '1.5rem', lineHeight: 1.3 },
      '3xl': { size: '1.875rem', lineHeight: 1.2 },
      '4xl': { size: '2.25rem', lineHeight: 1.2 },
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
    },
  },
  
  // Spacing System (8px grid)
  spacing: {
    unit: 8,
    scales: {
      xs: 4,
      sm: 8,
      base: 16,
      lg: 24,
      xl: 32,
      '2xl': 48,
      '3xl': 64,
    },
    optimizations: {
      willChangeTimeout: 250,
      debounceResize: 16,
      throttleScroll: 16,
    },
  },
  
  // Breakpoints
  breakpoints: {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
    wide: 1440,
  },
  
  // Accessibility
  a11y: {
    touchTargets: {
      minimum: 44,
      recommended: 48,
    },
    focusRing: {
      width: 2,
      offset: 2,
      color: 'var(--color-primary-500)',
    },
    contrastRatios: {
      normal: 4.5,
      large: 3,
      enhanced: 7,
    },
  },
} as const;

type DesignKernel = typeof designKernel;