// src/components/3d/Avatar3DViewer/hooks/useMaterialLifecycle.ts
import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { configureModelMaterials } from '../core/materialConfigurator';
import { resolveSkinTone } from '../../../../lib/scan/normalizeSkinTone';
import logger from '../../../../lib/utils/logger';

interface UseMaterialLifecycleProps {
  scene: THREE.Scene | null;
  skinTone?: SkinToneV2;
  finalGender: 'male' | 'female';
  serverScanId?: string;
}

/**
 * Hook for managing material configuration lifecycle
 */
export function useMaterialLifecycle({
  scene,
  skinTone,
  finalGender,
  serverScanId
}: UseMaterialLifecycleProps) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configure materials
  const configureMaterials = useCallback(async (customSkinTone?: any) => {
    if (!scene) {
      logger.warn('MATERIAL_LIFECYCLE', 'Cannot configure materials - no scene available', {
        serverScanId,
        philosophy: 'material_config_no_scene'
      });
      return;
    }

    const effectiveSkinTone = customSkinTone || skinTone;
    
    if (!effectiveSkinTone) {
      logger.warn('MATERIAL_LIFECYCLE', 'Cannot configure materials - no skin tone data', {
        serverScanId,
        philosophy: 'material_config_no_skin_tone'
      });
      return;
    }

    setIsConfiguring(true);
    setError(null);

    try {
      logger.info('MATERIAL_LIFECYCLE', 'Starting material configuration', {
        serverScanId,
        hasSkinTone: !!effectiveSkinTone,
        finalGender,
        philosophy: 'material_config_start'
      });

      // Explicitly re-resolve the skin tone to ensure correct V2 format
      const resolvedSkinTone = resolveSkinTone({ skin_tone: effectiveSkinTone });
      
      if (!resolvedSkinTone || !resolvedSkinTone.tone) {
        throw new Error('Failed to resolve skin tone to valid V2 format');
      }

      await configureModelMaterials({
        scene,
        skinTone: resolvedSkinTone.tone,
        serverScanId
      });

      logger.info('MATERIAL_LIFECYCLE', 'Material configuration completed successfully', {
        serverScanId,
        philosophy: 'material_config_complete'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      
      logger.error('MATERIAL_LIFECYCLE', 'Material configuration failed', {
        error: errorMessage,
        serverScanId,
        philosophy: 'material_config_error'
      });
    } finally {
      setIsConfiguring(false);
    }
  }, [scene, skinTone, finalGender, serverScanId]);

  return {
    // State
    isConfiguring,
    error,
    
    // Actions
    configureMaterials
  };
}