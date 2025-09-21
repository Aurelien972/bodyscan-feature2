/**
 * Material Compiler
 * Handles material compilation and updates
 */

import * as THREE from 'three';
import logger from '../../../utils/logger';

/**
 * Force material compilation for immediate rendering
 */
export function forceMaterialCompilation(
  scene: THREE.Scene,
  materialName: string
): boolean {
  try {
    const renderer = (window as any).__THREE_RENDERER__;
    const camera = (window as any).__THREE_CAMERA__;
    
    if (renderer && camera) {
      renderer.compile(scene, camera);
      
      logger.debug('MATERIAL_COMPILER', 'Material compilation forced', {
        materialName,
        compilationAttempted: true,
        hasRenderer: !!renderer,
        hasCamera: !!camera,
        philosophy: 'forced_compilation_success'
      });
      
      return true;
    } else {
      logger.warn('MATERIAL_COMPILER', 'Cannot force compilation - renderer/camera not available', {
        materialName,
        hasRenderer: !!renderer,
        hasCamera: !!camera,
        philosophy: 'compilation_dependencies_missing'
      });
      
      return false;
    }
  } catch (compileError) {
    logger.warn('MATERIAL_COMPILER', 'Material compilation failed (non-critical)', {
      materialName,
      compileError: compileError instanceof Error ? compileError.message : 'Unknown error',
      philosophy: 'compilation_error_non_critical'
    });
    
    return false;
  }
}

/**
 * Update all materials in scene to trigger re-render
 */
export function updateAllMaterials(scene: THREE.Scene): number {
  let updatedCount = 0;
  
  scene.traverse((obj: THREE.Object3D) => {
    const material = (obj as any).material;
    if (material) {
      const materials = Array.isArray(material) ? material : [material];
      materials.forEach((mat: THREE.Material) => {
        mat.needsUpdate = true;
        updatedCount++;
      });
    }
  });
  
  logger.debug('MATERIAL_COMPILER', 'Updated all materials for re-render', {
    updatedCount,
    philosophy: 'global_material_update'
  });
  
  return updatedCount;
}