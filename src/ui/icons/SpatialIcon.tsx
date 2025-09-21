// src/ui/icons/SpatialIcon.tsx
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { useOptimizedWillChange } from '../../lib/motion/useOptimizedWillChange';
import { usePreferredMotion, useHasTouch } from '../../system/device/DeviceProvider';
import { designKernel } from '../../styles/designKernel';
import { visionCurves } from '../../lib/motion/gpuVariants';

interface SpatialIconProps {
  Icon?: LucideIcon; // rendu optionnel pour éviter le crash si undefined
  size?: number;
  className?: string;
  animate?: boolean;
  color?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * Get standardized stroke width based on icon size
 */
function getStrokeWidth(size: number): number {
  if (size <= 24) return 2;
  if (size >= 24) return 2.5;
  return 2;
}

/**
 * Get standardized halo radius based on icon size
 */
function getHaloRadius(size: number): number {
  if (size <= 20) return 8;
  if (size <= 32) return 10;
  if (size <= 48) return 12;
  return 14;
}

const SpatialIcon: React.FC<SpatialIconProps> = ({
  Icon,
  size = 24,
  className = '',
  animate = true,
  color,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  'aria-describedby': ariaDescribedBy,
  role,
  tabIndex,
  onClick,
  onKeyDown,
}) => {
  const preferredMotion = usePreferredMotion();
  const shouldAnimate = animate && preferredMotion === 'full';
  const hasTouch = useHasTouch();
  const iconRef = useRef<HTMLDivElement>(null);

  
  // TwinForge color system
  const iconColor = color ?? 'var(--text-icon-idle)'; // Default to TwinForge idle color
  const hoverColor = 'var(--text-icon-active)'; // Plasma Cyan for active/hover
  const strokeWidth = getStrokeWidth(size);
  const haloRadius = getHaloRadius(size);

  // will-change optimisé
  const willChangeProps = shouldAnimate && animate ? ['transform'] : [];
  useOptimizedWillChange(iconRef, willChangeProps, 100); // Reduced timeout for TwinForge

  const iconVariants = {
    initial: { scale: 1, transition: { duration: 0 } },
    hover: shouldAnimate && !hasTouch
      ? { 
          scale: 1.03, 
          transition: { duration: 0.1, ease: visionCurves.gentle } 
        }
      : {},
    tap: shouldAnimate
      ? { 
          scale: 0.98, 
          transition: { duration: 0.08, ease: visionCurves.smooth } 
        }
      : {},
  };
  
  // TwinForge hover handlers with cyan glow
  const handleMouseEnter = () => {
    if (!shouldAnimate || hasTouch) return;
    
    if (iconRef.current) {
      // TwinForge cyan glow effect - subtle and precise
      const plasmaCyan = getComputedStyle(document.documentElement).getPropertyValue('--color-plasma-cyan').trim() || '#18E3FF';
      iconRef.current.style.filter = `drop-shadow(0 0 ${haloRadius}px ${plasmaCyan}15)`;
      iconRef.current.style.color = hoverColor;
    }
  };
  
  const handleMouseLeave = () => {
    if (!shouldAnimate || hasTouch) return;
    
    if (iconRef.current) {
      iconRef.current.style.filter = '';
      iconRef.current.style.color = iconColor;
    }
  };

  // Keyboard event handler for interactive icons
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Call custom onKeyDown first if provided
    onKeyDown?.(e);
    
    // Default keyboard interaction for clickable icons
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  // Determine if icon should be interactive
  const isInteractive = !!onClick;
  const shouldHaveTabIndex = isInteractive ? (tabIndex !== undefined ? tabIndex : 0) : undefined;
  
  // CRITICAL FIX: Proper aria-hidden logic to prevent accessibility warnings
  // aria-hidden should ONLY be true for purely decorative icons (no interaction, no label)
  const shouldBeAriaHidden = ariaHidden !== undefined ? ariaHidden : 
    (!isInteractive && !ariaLabel && !role);

  return (
    <motion.div
      ref={iconRef}
      className={`inline-flex items-center justify-center spatial-icon icon-container gpu-only-transform ${isInteractive ? 'cursor-pointer focus-ring' : ''} ${className}`}
      style={{ 
        transform: 'translateZ(0)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        willChange: shouldAnimate ? 'transform, filter' : 'auto',
        // TwinForge icon container - subtle indigo background
        background: isInteractive ? 'color-mix(in srgb, var(--brand-primary) 8%, transparent)' : 'transparent',
        borderRadius: '50%',
        padding: `${Math.max(4, size * 0.15)}px`,
        border: isInteractive ? '1px solid color-mix(in srgb, var(--color-plasma-cyan) 10%, transparent)' : 'none',
      }}
      variants={iconVariants}
      initial="initial"
      whileHover="hover"
      whileTap={!isInteractive ? {} : {
        scale: 0.98,
        transition: { duration: 0.08, ease: [0.16, 1, 0.3, 1] }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={role || (isInteractive ? 'button' : undefined)}
      tabIndex={shouldHaveTabIndex}
      aria-label={ariaLabel}
      aria-hidden={shouldBeAriaHidden}
      aria-describedby={ariaDescribedBy}
    >
      {/* TwinForge halo effect - cyan, subtle */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-200"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, var(--color-plasma-cyan) 6%, transparent) 0%, transparent 70%)`,
          opacity: 0,
          transform: `scale(${1 + haloRadius / size})`,
          filter: `blur(${Math.max(2, haloRadius / 4)}px)`,
          zIndex: -1
        }}
        ref={(node) => {
          if (node && iconRef.current) {
            (iconRef.current as any)._haloNode = node;
          }
        }}
      />
      
      {Icon ? (
        <Icon 
          size={size} 
          color={iconColor} 
          strokeWidth={strokeWidth}
          style={{
            filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.2))`,
            transition: 'color 200ms ease, filter 200ms ease',
            transform: 'translateZ(0)',
            // TwinForge stroke styling
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
        />
      ) : (
        <span style={{ fontSize: size, color: iconColor }}>⚠️</span> // fallback emoji
      )}
    </motion.div>
  );
};

export default SpatialIcon;
