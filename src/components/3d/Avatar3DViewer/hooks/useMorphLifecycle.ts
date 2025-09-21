import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { applyMorphDataToModel, applyLimbMassDataToModel } from '../core/morphApplier';
import { useMorphologyMapping } from '../../../../hooks/useMorphologyMapping';
import logger from '../../../../lib/utils/logger';

interface UseMorphLifecycleProps {
  finalGender: 'male' | 'female';
  morphologyMapping?: any;
  serverScanId?: string;
}

/**
 * Hook for managing morph application lifecycle with React state
 */
export function useMorphLifecycle({
  finalGender,
  morphologyMapping,
  serverScanId
}: UseMorphLifecycleProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const morphsAppliedRef = useRef<boolean>(false);
  const lastAppliedHashRef = useRef<string | null>(null);

  // Apply morphs to model
  const applyMorphs = useCallback(async (
    model: THREE.Group,
    morphData: Record<string, number>,
    faceMorphData?: Record<string, number> // ADDED
  ) => {
    if (!model || (!morphData && !faceMorphData) || (Object.keys(morphData).length === 0 && Object.keys(faceMorphData || {}).length === 0)) { // MODIFIED
      logger.warn('MORPH_LIFECYCLE', 'Cannot apply morphs - invalid input', {
        hasModel: !!model,
        hasMorphData: !!morphData,
        morphDataKeys: morphData ? Object.keys(morphData).length : 0,
        hasFaceMorphData: !!faceMorphData, // ADDED
        faceMorphDataKeys: faceMorphData ? Object.keys(faceMorphData).length : 0, // ADDED
        serverScanId,
        philosophy: 'input_validation'
      });
      return;
    }

    // Generate hash for deduplication
    const morphHash = JSON.stringify(Object.keys(morphData).sort().map(k => [k, morphData[k]]));
    const faceMorphHash = JSON.stringify(Object.keys(faceMorphData || {}).sort().map(k => [k, (faceMorphData || {})[k]])); // ADDED
    const combinedHash = `${morphHash}-${faceMorphHash}`; // ADDED
    
    if (lastAppliedHashRef.current === combinedHash) { // MODIFIED
      logger.debug('MORPH_LIFECYCLE', 'Skipping morph application - same data', {
        serverScanId,
        philosophy: 'deduplication'
      });
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      logger.info('MORPH_LIFECYCLE', 'Applying morphs to model', {
        morphDataCount: Object.keys(morphData).length,
        faceMorphDataCount: Object.keys(faceMorphData || {}).length, // ADDED
        serverScanId,
        philosophy: 'morph_application_start'
      });

      await applyMorphDataToModel({
        model,
        morphData,
        gender: finalGender,
        morphologyMapping,
        serverScanId,
        faceMorphData // ADDED
      });

      lastAppliedHashRef.current = combinedHash; // MODIFIED
      morphsAppliedRef.current = true;

      logger.info('MORPH_LIFECYCLE', 'Morphs applied successfully', {
        serverScanId,
        philosophy: 'morph_application_complete'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      
      logger.error('MORPH_LIFECYCLE', 'Morph application failed', {
        error: errorMessage,
        serverScanId,
        philosophy: 'morph_application_error'
      });
    } finally {
      setIsApplying(false);
    }
  }, [finalGender, morphologyMapping, serverScanId]);

  // Apply limb masses to model
  const applyLimbMasses = useCallback(async (
    model: THREE.Group,
    limbMasses: Record<string, number>
  ) => {
    if (!model || !limbMasses || Object.keys(limbMasses).length === 0) {
      logger.warn('MORPH_LIFECYCLE', 'Cannot apply limb masses - invalid input', {
        hasModel: !!model,
        hasLimbMasses: !!limbMasses,
        limbMassesKeys: limbMasses ? Object.keys(limbMasses).length : 0,
        serverScanId,
        philosophy: 'limb_mass_input_validation'
      });
      return;
    }

    try {
      logger.info('MORPH_LIFECYCLE', 'Applying limb masses to model', {
        limbMassesCount: Object.keys(limbMasses).length,
        serverScanId,
        philosophy: 'limb_mass_application_start'
      });

      await applyLimbMassDataToModel({
        model,
        limbMasses,
        serverScanId
      });

      logger.info('MORPH_LIFECYCLE', 'Limb masses applied successfully', {
        serverScanId,
        philosophy: 'limb_mass_application_complete'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('MORPH_LIFECYCLE', 'Limb mass application failed', {
        error: errorMessage,
        serverScanId,
        philosophy: 'limb_mass_application_error'
      });
    }
  }, [serverScanId]);

  // Reset morph state
  const resetMorphs = useCallback(async () => {
    // This function needs to be implemented based on how you want to reset.
    // For now, it's a placeholder. You might want to re-apply initial morphs.
    logger.warn('MORPH_LIFECYCLE', 'resetMorphs called - not fully implemented yet', { serverScanId });
  }, [serverScanId]);

  return {
    // State
    isApplying,
    error,
    morphsApplied: morphsAppliedRef.current,
    
    // Actions
    applyMorphs,
    applyLimbMasses,
    resetMorphs,
    forceMorphsUpdate: useCallback(async (model?: THREE.Group, morphData?: Record<string, number>, faceMorphData?: Record<string, number>) => { // MODIFIED
      lastAppliedHashRef.current = null;
      logger.debug('MORPH_LIFECYCLE', 'Forced morph cache reset with immediate reapplication', {
        serverScanId,
        hasModel: !!model,
        hasMorphData: !!morphData,
        hasFaceMorphData: !!faceMorphData, // ADDED
        philosophy: 'force_morph_reapplication_immediate'
      });
      
      // Force immediate reapplication if model and morphData are provided
      if (model && (morphData || faceMorphData) && (Object.keys(morphData || {}).length > 0 || Object.keys(faceMorphData || {}).length > 0)) { // MODIFIED
        await applyMorphs(model, morphData || {}, faceMorphData || {}); // MODIFIED
        logger.debug('MORPH_LIFECYCLE', 'Immediate morph reapplication completed', {
          serverScanId,
          philosophy: 'immediate_reapplication_after_cache_reset'
        });
      }
    }, [serverScanId, applyMorphs])
  };
}
