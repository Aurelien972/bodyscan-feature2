// src/app/shell/Header/DynamicProgressHeader.tsx
import React, { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useProgressStore } from '../../../system/store/progressStore';
import GlassCard from '../../../ui/cards/GlassCard';
import logger from '../../../lib/utils/logger';

// Use individual primitive selectors to prevent infinite loops
const useIsActive = () => useProgressStore((state) => state.isActive);
// Removed: const useHideHeader = () => useProgressStore((state) => state.hideHeader);
const useCurrentStep = () => useProgressStore((state) => state.currentStep);
const useOverallProgress = () => useProgressStore((state) => state.overallProgress);
const useMessage = () => useProgressStore((state) => state.message);
const useSubMessage = () => useProgressStore((state) => state.subMessage);
const useSteps = () => useProgressStore((state) => state.steps);
const useTotalSteps = () => useProgressStore((state) => state.totalSteps);

/**
 * Dynamic Progress Header - VisionOS 26 "Orbe Central" Edition
 * Composant de progression TwinForge avec anneau standard et pills d'étapes
 * Design "acier sur verre" avec Plasma Cyan comme accent principal
 */
const DynamicProgressHeaderInner: React.FC = () => {
  // Use individual primitive selectors
  const isActive = useIsActive();
  // Removed: const hideHeader = useHideHeader();
  const currentStep = useCurrentStep();
  const overallProgress = useOverallProgress();
  const message = useMessage();
  const subMessage = useSubMessage();
  const steps = useSteps();
  const totalSteps = useTotalSteps();
  
  // Dedupe progress updates to reduce log noise
  const lastLoggedRef = useRef<{ step: string; progress: number } | null>(null);

  // CRITICAL: Add defensive logging for NaN detection
  React.useEffect(() => {
    // Only log error if progress is not null/undefined AND is invalid
    if (overallProgress !== null && overallProgress !== undefined && (!Number.isFinite(overallProgress) || Number.isNaN(overallProgress))) {
      logger.error('Invalid progress detected', { 
        progress: overallProgress, 
        progressType: typeof overallProgress, 
        currentStep 
      });
    }
  }, [overallProgress, currentStep]);

  // Map currentStep to step data and index
  const currentStepData = useMemo(() => {
    return steps.find(step => step.id === currentStep) || {
      id: currentStep,
      title: message || 'En cours',
      subtitle: subMessage || '',
      icon: 'Settings' as const,
      color: '#18E3FF' // Plasma Cyan pour tous les états
    };
  }, [steps, currentStep, message, subMessage]);
  
  const currentStepIndex = useMemo(() => {
    const index = steps.findIndex(step => step.id === currentStep);
    return index >= 0 ? index : 0;
  }, [steps, currentStep]);
  
  const safeProgress = Number.isFinite(overallProgress) && !Number.isNaN(overallProgress) ? 
    Math.max(0, Math.min(100, overallProgress)) : 0;

  // Log safe progress for debugging (deduplicated)
  React.useEffect(() => {
    const safePhaseProgress = Number.isFinite(safeProgress) && !Number.isNaN(safeProgress) ? 
      Math.max(0, Math.min(100, safeProgress)) : 0;
    
    // Only log if step or progress changed significantly
    const current = { step: currentStep, progress: Math.floor(safePhaseProgress / 5) * 5 }; // Round to 5%
    const last = lastLoggedRef.current;
    
    if (!last || last.step !== current.step || last.progress !== current.progress) {
      lastLoggedRef.current = current;
      
      logger.info('Progress header state update', {
        currentStep,
        phaseProgress: safePhaseProgress,
        overallProgress: overallProgress,
        message,
        subMessage,
        stepIndex: steps.findIndex(step => step.id === currentStep),
        totalSteps
      });
    }
  }, [currentStep, safeProgress, overallProgress, message, subMessage, steps, totalSteps]);

  // MODIFIED: Only check isActive for this component's visibility
  if (!isActive) return null;

  return (
    <div className="w-full orbe-entrance-animation">
      {/* Dynamic Progress Leader - TwinForge Standard */}
      <GlassCard 
        className="dpl-container relative overflow-visible p-6 md:p-8 w-full"
        style={{
          background: `
            color-mix(in srgb, var(--brand-primary) 8%, transparent),
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'color-mix(in srgb, var(--color-plasma-cyan) 16%, transparent)',
          boxShadow: `
            0 18px 40px rgba(0,0,0,0.18),
            0 0 20px color-mix(in srgb, var(--color-plasma-cyan) 8%, transparent),
            inset 0 2px 0 rgba(255,255,255,0.15),
            inset 0 -2px 0 rgba(0,0,0,0.1)
          `,
          backdropFilter: 'blur(24px) saturate(160%)',
          borderRadius: '32px',
          willChange: 'transform, filter, box-shadow',
          transform: 'translateZ(0)',
        }}
      >
        {/* Contenu Principal DPL */}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          {/* Icône de Section avec Halo Cyan Discret */}
          <div
            className="relative flex-shrink-0"
            style={{
              width: 'fit-content',
            }}
          >
            {/* Halo Cyan Discret */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, color-mix(in srgb, var(--color-plasma-cyan) 6%, transparent) 0%, transparent 70%)',
                filter: 'blur(8px)', // Reduced blur for better performance
                transform: 'scale(1.5)',
              }}
            />

            {/* Conteneur Icône */}
            <div
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center"
              style={{
                background: `
                  color-mix(in srgb, var(--brand-primary) 10%, transparent),
                  radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, transparent 60%)
                `,
                border: '1px solid color-mix(in srgb, var(--color-plasma-cyan) 12%, transparent)',
                boxShadow: `
                  0 0 16px color-mix(in srgb, var(--color-plasma-cyan) 8%, transparent),
                  inset 0 2px 0 rgba(255,255,255,0.15),
                  inset 0 -2px 0 rgba(0,0,0,0.1)
                `,
                backdropFilter: 'blur(8px)', // Reduced blur for better performance
              }}
            >
              <SpatialIcon 
                Icon={ICONS[currentStepData?.icon] || ICONS.Settings} 
                size={32} 
                color="var(--color-plasma-cyan)"
                style={{
                  filter: 'drop-shadow(0 2px 8px color-mix(in srgb, var(--color-plasma-cyan) 40%, transparent))',
                }}
              />
            </div>
          </div>

          {/* Zone Contenu Principal */}
          <div className="flex-1 space-y-4">
            {/* Titre Principal - Display 700, sans italique */}
            <h2
              className="text-2xl md:text-3xl font-bold leading-tight"
              style={{ 
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                fontWeight: 700
              }}
            >
              {message}
            </h2>
            
            {/* Sous-titre */}
            <p
              className="text-sm md:text-base font-medium leading-relaxed"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              {subMessage}
            </p>

            {/* Pills d'Étapes Horizontales avec Pourcentage Mobile */}
            <div className="flex items-center gap-2 mt-4">
              {/* Pills Container */}
              <div className="flex items-center gap-2 flex-1">
              {steps.map((step, index) => {
                const isCurrentStep = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                const isFuture = index > currentStepIndex;
                
                return (
                  <div
                    key={step.id}
                    className="dpl-step-pill"
                    style={{
                      height: '8px',
                      borderRadius: '4px',
                      flex: '1',
                      background: isCurrentStep 
                        ? 'color-mix(in srgb, var(--color-plasma-cyan) 100%, transparent)'
                        : isCompleted 
                        ? 'color-mix(in srgb, var(--color-ember-copper) 80%, transparent)'
                        : 'color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                      border: isCurrentStep 
                        ? '1px solid color-mix(in srgb, var(--color-plasma-cyan) 40%, transparent)'
                        : isCompleted
                        ? '1px solid color-mix(in srgb, var(--color-ember-copper) 30%, transparent)'
                        : '1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)',
                      position: 'relative',
                      transition: 'all 240ms cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                  >
                    {/* Trait cuivre pour étapes complétées */}
                    {isCompleted && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '12px',
                          height: '2px',
                          background: 'var(--color-ember-copper)',
                          borderRadius: '1px'
                        }}
                      />
                    )}
                  </div>
                );
              })}
              </div>
              
              {/* Pourcentage Mobile - Aligné à droite */}
              <div
                className="md:hidden flex-shrink-0 text-right"
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '18px',
                  fontWeight: 600,
                  minWidth: '60px'
                }}
              >
                {Math.round(safeProgress)}%
              </div>
            </div>

            {/* État textuel et Pourcentage Desktop */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Étape {currentStepIndex + 1} sur {totalSteps}
              </div>
              
              {/* Pourcentage Desktop - Masqué sur mobile */}
              <div
                className="hidden md:block text-xs font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                {Math.round(safeProgress)}% complété
              </div>
            </div>
          </div>

          {/* Anneau de Progression Standard TwinForge - Desktop et Tablette uniquement */}
          <div
            className="relative flex-shrink-0 hidden md:flex"
            style={{
              width: '56px',
              height: '56px',
            }}
          >
            {/* Track de l'Anneau */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from -90deg, 
                  var(--color-plasma-cyan) 0%, 
                  var(--color-plasma-cyan) ${safeProgress * 3.6}deg, 
                  color-mix(in srgb, var(--brand-primary) 18%, transparent) ${safeProgress * 3.6}deg, 
                  color-mix(in srgb, var(--brand-primary) 18%, transparent) 360deg
                )`,
                mask: 'radial-gradient(circle at center, transparent 70%, black 75%, black 100%)',
                WebkitMask: 'radial-gradient(circle at center, transparent 70%, black 75%, black 100%)',
              }}
            />
            
            {/* Valeur Textuelle au Centre */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {Math.round(safeProgress)}%
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
const DynamicProgressHeader = React.memo(DynamicProgressHeaderInner);

export default DynamicProgressHeader;
