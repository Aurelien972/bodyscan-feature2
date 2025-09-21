/**
 * Material Configurator - Core Three.js Material Operations
 * Pure functions for material configuration and skin tone application
 */

import * as THREE from 'three';
import { applySkinToneToScene as coreConfigureMaterials } from '../../../../lib/3d/materials/applySkinTone';
import type { SkinToneV2 } from '../../../../lib/scan/normalizeSkinTone';
import logger from '../../../../lib/utils/logger';

interface MaterialConfigOptions {
  scene: THREE.Scene;
  skinTone: SkinToneV2;
  serverScanId?: string;
}

interface MaterialConfigResult {
  success: boolean;
  materialsUpdated: number;
  error?: string;
}

/**
 * Configure model materials with skin tone
 */
export async function configureModelMaterials(options: MaterialConfigOptions): Promise<MaterialConfigResult> {
  const { scene, skinTone, serverScanId } = options;

  logger.info('MATERIAL_CONFIGURATOR', 'Starting material configuration', {
    serverScanId,
    skinToneRGB: `rgb(${skinTone.rgb.r}, ${skinTone.rgb.g}, ${skinTone.rgb.b})`,
    skinToneHex: skinTone.hex,
    philosophy: 'core_material_configuration'
  });

  try {
    const result = await coreConfigureMaterials(scene, skinTone);
    
    if (!result || !result.success) {
      logger.error('MATERIAL_CONFIGURATOR', 'Material configuration failed', {
        reason: result?.errorMessage || result?.reason || 'Unknown error',
        serverScanId,
        philosophy: 'core_material_config_failed'
      });
      
      return {
        success: false,
        materialsUpdated: result?.materialsUpdated || 0,
        error: result?.errorMessage || result?.reason || 'Unknown error'
      };
    }
    
    logger.info('MATERIAL_CONFIGURATOR', 'Material configuration completed successfully', {
      materialsUpdated: result?.materialsUpdated || 0,
      serverScanId,
      philosophy: 'core_material_config_success'
    });
    
    return {
      success: true,
      materialsUpdated: result?.materialsUpdated || 0
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('MATERIAL_CONFIGURATOR', 'Material configuration error', {
      error: errorMessage,
      serverScanId,
      philosophy: 'core_material_config_error'
    });
    
    return {
      success: false,
      materialsUpdated: 0,
      error: errorMessage
    };
  }
}

/**
 * Validate scene for material configuration
 */
function validateSceneForMaterials(scene: THREE.Scene): { isValid: boolean; reason?: string } {
  if (!scene) {
    return { isValid: false, reason: 'Scene is null' };
  }

  if (!scene.isScene) {
    return { isValid: false, reason: 'Not a Three.js Scene object' };
  }

  if (!scene.children) {
    return { isValid: false, reason: 'Scene has no children property' };
  }

  if (scene.children.length === 0) {
    return { isValid: false, reason: 'Scene is empty' };
  }

  return { isValid: true };
}

/**
 * Force material updates on all meshes in scene
 */
function forceMaterialUpdates(scene: THREE.Scene): void {
  scene.traverse((obj: THREE.Object3D) => {
    if (obj instanceof THREE.Mesh && obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach(material => {
        material.needsUpdate = true;
      });
    }
  });
}