/**
 * Bone Sanitizer
 * Sanitizes skeleton bones for proper avatar display
 */

import * as THREE from 'three';
import logger from '../../utils/logger';

/**
 * Sanitize skeleton with stretch bone neutralization and optional exclusions
 */
export function sanitizeSkeleton(skeleton: THREE.Skeleton, opts?: { exclude?: string[] }): void {
  if (!skeleton || !skeleton.bones) {
    logger.warn('BONE_SANITIZER', 'Invalid skeleton provided');
    return;
  }

  const excludeSet = new Set((opts?.exclude ?? []).map(s => s.toLowerCase()));

  // Reset any problematic bone scales
  let neutralizedCount = 0;

  skeleton.bones.forEach(bone => {
    // Skip excluded bones
    const boneName = (bone.name || '').toLowerCase();
    if (excludeSet.has(boneName)) {
      return;
    }

    // Reset any non-identity scales that might cause stretching
    if (bone.scale.x !== 1 || bone.scale.y !== 1 || bone.scale.z !== 1) {
      bone.scale.set(1, 1, 1);
      bone.updateMatrix();
      bone.updateMatrixWorld(true);
      neutralizedCount++;
    }
  });

  if (neutralizedCount > 0) {
    logger.info('BONE_SANITIZER', `Neutralized ${neutralizedCount} bone scales`);
    skeleton.update();
  }
}