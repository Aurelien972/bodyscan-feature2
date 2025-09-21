import React from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '../icons/registry';
import SpatialIcon from '../icons/SpatialIcon';
import { CIRCUIT_COLORS, type CircuitKey } from '../theme/circuits';

type Props = {
  icon?: keyof typeof ICONS;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  circuit?: CircuitKey;
  iconColor?: string;
};

export default function PageHeader({ 
  icon = 'Home', 
  title, 
  subtitle, 
  actions, 
  className = '',
  circuit = 'home',
  iconColor
}: Props) {
  // Gestion spéciale pour certains circuits
  const finalIcon = (() => {
    if (circuit === 'avatar') return ICONS.Eye;
    if (circuit === 'track') return ICONS.Target;
    return ICONS[icon];
  })();

  // Utiliser la couleur spécifique ou celle du circuit
  const finalCircuitColor = iconColor || CIRCUIT_COLORS[circuit];
  
  return (
    <header
      className={`pt-6 md:pt-8 mb-4 md:mb-6 ${className}`}
      style={{ willChange: 'transform' }}
      role="banner"
      aria-labelledby="page-title"
    >
      <div className="flex flex-col items-center text-center space-y-4 md:space-y-5">
        {/* Icône avec effet de glow */}
        <div
          className="p-3 md:p-4 rounded-full transform-gpu"
          style={{
            background: `color-mix(in srgb, ${finalCircuitColor} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${finalCircuitColor} 12%, transparent)`,
            willChange: 'transform, box-shadow',
            transform: 'translateZ(0)',
          }}
          role="img"
          aria-label={`Icône de la page ${title}`}
        >
          {/* Halo cyan discret derrière l'icône */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${finalCircuitColor} 6%, transparent) 0%, transparent 70%)`,
              filter: 'blur(12px)',
              transform: 'scale(1.2)',
              zIndex: -1
            }}
          />
          <SpatialIcon
            Icon={finalIcon}
            size={
              typeof window !== 'undefined' && window.innerWidth < 768
                ? 32
                : 56
            }
            color={finalCircuitColor}
            aria-hidden="true"
          />
        </div>

        {/* Titre et sous-titre centrés */}
        <div className="space-y-1 md:space-y-2">
          <h1 
            id="page-title"
            className="text-visionos-h2 font-bold leading-tight tracking-visionos-adaptive"
            style={{
              color: 'var(--text-primary)',
              fontWeight: 700,
              letterSpacing: '-0.01em'
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p 
              className="text-visionos-body max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
              aria-describedby="page-title"
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {actions && (
        <div className="mt-3 md:mt-4 flex justify-center" role="group" aria-label="Actions de la page">
          {actions}
        </div>
      )}
    </header>
  );
}