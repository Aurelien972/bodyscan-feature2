/**
 * Morph Adjustment Controls Component
 * Interactive controls for adjusting avatar morphology before saving
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';
import { useFeedback } from '../../../../../hooks/useFeedback';
import type { MorphologyMappingData } from '../../../../../hooks/useMorphologyMapping';
import type { MorphPolicy } from '../../../../../lib/morph/constraints';
import { useDebounce } from '../../../../../lib/utils/hooks';
import logger from '../../../../../lib/utils/logger';

// Constante pour le pas d'ajustement des boutons +/-
const ADJUSTMENT_STEP = 0.05; // Pas fixe pour les boutons +/-

interface MorphAdjustmentControlsProps {
  currentMorphData: Record<string, number>;
  setCurrentMorphData: (morphData: Record<string, number>) => void;
  resetMorphsToInitial: () => void;
  morphPolicy: MorphPolicy;
  morphologyMapping: MorphologyMappingData;
  resolvedGender: 'male' | 'female';
  isViewerReady: boolean;
  avatar3DRef: React.RefObject<any>;
}

// Curated list of key morphs with significant visual impact
const KEY_MORPHS = {
  bodyShape: [
    { key: 'bodybuilderSize', label: 'Développement musculaire', icon: 'Zap' as const, color: '#8B5CF6' },
    { key: 'pearFigure', label: 'Masse grasse', icon: 'Triangle' as const, color: '#F59E0B' },
    { key: 'narrowWaist', label: 'Tour de taille', icon: 'Minimize2' as const, color: '#10B981' },
    { key: 'emaciated', label: 'Gabarit', icon: 'Minus' as const, color: '#06B6D4' },
  ],
  curves: [
    { key: 'bigHips', label: 'Hanches', icon: 'Circle' as const, color: '#EC4899' },
    { key: 'assLarge', label: 'Fessiers', icon: 'Circle' as const, color: '#F97316' },
  ],
  chest: []
};

/**
 * Get available morphs based on gender and policy
 */
function getAvailableMorphs(
  gender: 'male' | 'female',
  morphPolicy: MorphPolicy
): Array<{ key: string; label: string; icon: keyof typeof ICONS; color: string; category: string }> {
  const availableMorphs: Array<{ key: string; label: string; icon: keyof typeof ICONS; color: string; category: string }> = [];
  
  // Add body shape morphs (available for all genders)
  KEY_MORPHS.bodyShape.forEach(morph => {
    const range = morphPolicy.ranges[morph.key];
    if (range && !(range.min === 0 && range.max === 0)) {
      availableMorphs.push({ ...morph, category: 'Corps' });
    }
  });
  
  // Add curves morphs (available for all genders)
  KEY_MORPHS.curves.forEach(morph => {
    const range = morphPolicy.ranges[morph.key];
    if (range && !(range.min === 0 && range.max === 0)) {
      availableMorphs.push({ ...morph, category: 'Courbes' });
    }
  });
  
  // Add chest morphs (check gender-specific availability)
  KEY_MORPHS.chest.forEach(morph => {
    const range = morphPolicy.ranges[morph.key];
    if (range && !(range.min === 0 && range.max === 0)) {
      availableMorphs.push({ ...morph, category: 'Poitrine' });
    }
  });
  
  return availableMorphs;
}

/**
 * Morph adjustment controls component
 */
const MorphAdjustmentControls: React.FC<MorphAdjustmentControlsProps> = React.memo(({
  currentMorphData,
  setCurrentMorphData,
  resetMorphsToInitial,
  morphPolicy,
  morphologyMapping,
  resolvedGender,
  isViewerReady,
  avatar3DRef
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [adjustedMorphs, setAdjustedMorphs] = useState<Set<string>>(new Set());
  const { click, formInput } = useFeedback();
  
  // Utiliser useDebounce pour l'application des morphs au modèle 3D
  const debouncedMorphData = useDebounce(currentMorphData, 50); // Délai court pour la fluidité visuelle
  
  // Get available morphs for this gender
  const availableMorphs = useMemo(() => 
    getAvailableMorphs(resolvedGender, morphPolicy), 
    [resolvedGender, morphPolicy]
  );
  
  // Effet pour appliquer les morphs au modèle 3D lorsque debouncedMorphData change
  React.useEffect(() => {
    if (isViewerReady && avatar3DRef.current?.updateMorphData) {
      logger.debug('MORPH_ADJUSTMENT', 'Applying debounced morph data to 3D viewer', {
        morphDataKeys: Object.keys(debouncedMorphData),
        resolvedGender,
      });
      avatar3DRef.current.updateMorphData(debouncedMorphData);
    }
  }, [debouncedMorphData, isViewerReady, avatar3DRef, resolvedGender]);

  const handleMorphChange = useCallback((morphKey: string, newValue: number) => {
    const range = morphPolicy.ranges[morphKey];
    if (!range) return;
    
    // Clamp la nouvelle valeur dans les limites physiologiques
    const clampedValue = Math.max(range.min, Math.min(range.max, newValue));
    
    // Mettre à jour l'état local immédiatement
    const newMorphData = {
      ...currentMorphData,
      [morphKey]: clampedValue
    };
    setCurrentMorphData(newMorphData);
    setAdjustedMorphs(prev => new Set([...prev, morphKey]));
    
    // Audio feedback immédiat
    try {
      formInput();
    } catch (audioError) {
      console.warn('MORPH_ADJUSTMENT', 'Audio feedback failed for button click', { audioError });
    }
    
    logger.debug('MORPH_ADJUSTMENT', 'Morph value updated with direct 3D update', {
      morphKey,
      value: clampedValue.toFixed(3),
      resolvedGender,
      philosophy: 'direct_3d_morph_update'
    });
  }, [currentMorphData, setCurrentMorphData, setAdjustedMorphs, formInput, morphPolicy.ranges, resolvedGender]);
  
  const handleIncrement = useCallback((morphKey: string) => {
    const currentValue = currentMorphData[morphKey] !== undefined && currentMorphData[morphKey] !== null
      ? currentMorphData[morphKey]
      : 0;
    const newValue = currentValue + ADJUSTMENT_STEP;
    handleMorphChange(morphKey, newValue);
  }, [currentMorphData, handleMorphChange]);
  
  const handleDecrement = useCallback((morphKey: string) => {
    const currentValue = currentMorphData[morphKey] !== undefined && currentMorphData[morphKey] !== null
      ? currentMorphData[morphKey]
      : 0;
    const newValue = currentValue - ADJUSTMENT_STEP;
    handleMorphChange(morphKey, newValue);
  }, [currentMorphData, handleMorphChange]);
  
  const initialMorphDataRef = useRef<Record<string, number>>();
  
  const handleResetAll = useCallback(() => {
    click();
    setAdjustedMorphs(new Set());
    resetMorphsToInitial();
  }, [resetMorphsToInitial, click, setAdjustedMorphs]);

  // Group morphs by category
  const morphsByCategory = useMemo(() => {
    const grouped: Record<string, typeof availableMorphs> = {};
    availableMorphs.forEach(morph => {
      if (!grouped[morph.category]) {
        grouped[morph.category] = [];
      }
      grouped[morph.category].push(morph);
    });
    return grouped;
  }, [availableMorphs]);

  if (!isViewerReady || availableMorphs.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >

      <GlassCard 
        className={`morph-adjustment-card p-8 ${isExpanded ? 'morph-adjustment-card--expanded' : ''}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <SpatialIcon Icon={ICONS.Settings} size={16} className="text-purple-400" />
            Ajustements morphologiques
            {adjustedMorphs.size > 0 && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                {adjustedMorphs.size} modifié{adjustedMorphs.size > 1 ? 's' : ''}
              </span>
            )}
          </h4>
          
          <div className="flex items-center gap-2">
            {adjustedMorphs.size > 0 && (
              <button
                onClick={handleResetAll}
                className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
                title="Réinitialiser tous les ajustements"
              >
                <SpatialIcon Icon={ICONS.RotateCcw} size={14} />
                <span>Réinitialiser</span>
              </button>
            )}
            <button
              onClick={() => {
                click();
                setIsExpanded(!isExpanded);
              }}
              className="w-10 h-10 p-3 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 transition-all duration-200 border border-yellow-400/30 hover:border-yellow-400/50"
              style={{
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.3)',
              }}
            >
              <SpatialIcon 
                Icon={isExpanded ? ICONS.ChevronUp : ICONS.ChevronDown} 
                size={18} 
                className="text-yellow-400" 
              />
            </button>
          </div>
        </div>

        {/* Expandable controls */}
        <motion.div
          initial={false}
          animate={{ 
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          {isExpanded && (
            <div className="space-y-10">
              {/* Info text */}
              <p className="text-white/70 text-sm leading-relaxed text-center">
                Ajustez subtilement votre avatar en temps réel. Les modifications sont appliquées instantanément au modèle 3D.
              </p>

              {/* Morph controls by category */}
              {Object.entries(morphsByCategory).map(([category, morphs]) => (
                <div key={category} className="space-y-6 mt-10 first:mt-0">
                  <h5 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <SpatialIcon Icon={ICONS.Circle} size={16} className="text-purple-400" />
                    {category}
                  </h5>
                  {/* Séparateur visuel */}
                  <div className="h-px bg-white/10 mb-6" />
                  
                  <div className="space-y-6">
                    {morphs.map((morph, index) => {
                      const range = morphPolicy.ranges[morph.key];
                      if (!range) return null;
                      
                      // Valeur actuelle avec fallback sécurisé
                      const currentValue = currentMorphData[morph.key] !== undefined && currentMorphData[morph.key] !== null
                        ? currentMorphData[morph.key]
                        : 0;
                      
                      // Vérifier si les boutons doivent être désactivés
                      const canDecrement = currentValue > range.min;
                      const canIncrement = currentValue < range.max;
                      
                      const isAdjusted = adjustedMorphs.has(morph.key);
                      
                      return (
                        <motion.div
                          key={morph.key}
                          className="space-y-4"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index, duration: 0.4 }}
                        >
                          {/* Morph label et contrôles */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <SpatialIcon 
                                Icon={ICONS[morph.icon] || ICONS.Circle} 
                                size={14} 
                                color={morph.color} 
                              />
                              <span className="text-white/90 text-sm font-medium">
                                {morph.label}
                              </span>
                              {isAdjusted && (
                                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                              )}
                            </div>
                            
                            {/* Boutons +/- */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDecrement(morph.key)}
                                disabled={!canDecrement}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  canDecrement 
                                    ? 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30' 
                                    : 'bg-white/5 border border-white/10 opacity-50 cursor-not-allowed'
                                }`}
                                title="Diminuer"
                              >
                                <SpatialIcon 
                                  Icon={ICONS.Minus} 
                                  size={14} 
                                  className={canDecrement ? 'text-white/80' : 'text-white/40'} 
                                />
                              </button>
                              
                              <button
                                onClick={() => handleIncrement(morph.key)}
                                disabled={!canIncrement}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  canIncrement 
                                    ? 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30' 
                                    : 'bg-white/5 border border-white/10 opacity-50 cursor-not-allowed'
                                }`}
                                title="Augmenter"
                              >
                                <SpatialIcon 
                                  Icon={ICONS.Plus} 
                                  size={14} 
                                  className={canIncrement ? 'text-white/80' : 'text-white/40'} 
                                />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Collapsed state preview */}
        {!isExpanded && adjustedMorphs.size > 0 && (
          <div className="text-center py-3">
            <p className="text-white/60 text-sm">
              {adjustedMorphs.size} ajustement{adjustedMorphs.size > 1 ? 's' : ''} appliqué{adjustedMorphs.size > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
});

MorphAdjustmentControls.displayName = 'MorphAdjustmentControls';

export default MorphAdjustmentControls;