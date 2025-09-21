/**
 * Bone Scaling Core Functions
 * Core bone scaling operations for limb mass application
 */

import * as THREE from 'three';
import type { BoneMappingConfig } from '../boneMapping';

interface BoneScaleTarget {
  bone: THREE.Bone;
  scaleFactor: number;
  limbMassKey: string;
  enabled: boolean;
}

/**
 * Set bone thickness using configuration-driven approach
 */
function setBoneThickness(
  bone: THREE.Bone, 
  scaleFactor: number, 
  lengthAxis: 'x'|'y'|'z' = 'y'
): void {
  // Apply axis-specific scaling (preserve length axis)
  const sx = lengthAxis === 'x' ? 1 : scaleFactor;
  const sy = lengthAxis === 'y' ? 1 : scaleFactor;
  const sz = lengthAxis === 'z' ? 1 : scaleFactor;
  
  bone.scale.set(sx, sy, sz);
  bone.updateMatrixWorld(true);
}

/**
 * Calculate scale factor using mapping configuration
 */
export function calculateScaleFactor(mass: number, mapping: BoneMappingConfig): number {
  // Clamp mass to mapping-specific range
  const clampedMass = Math.max(mapping.clamp[0], Math.min(mapping.clamp[1], mass));
  
  // Apply smooth curve for torso width to avoid abrupt changes
  if (mapping.key === 'torsoMass') {
    const delta = clampedMass - 1;
    const smoothFactor = Math.tanh(delta * 1.2) / Math.tanh(1.2);
    return 1 + 0.6 * smoothFactor;
  }
  
  // Standard calculation for other limb masses
  return 1 + (clampedMass - 1) * 0.6;
}

/**
 * Apply bone scaling to target bones
 */
export function applyBoneScaling(
  boneScaleTargets: Map<THREE.Bone, number>,
  lengthAxis: 'x'|'y'|'z' = 'y'
): number {
  let touched = 0;
  
  boneScaleTargets.forEach((scaleFactor, bone) => {
    setBoneThickness(bone, scaleFactor, lengthAxis);
    touched++;
  });
  
  return touched;
}