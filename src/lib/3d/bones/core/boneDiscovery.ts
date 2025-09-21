/**
 * Bone Discovery Functions
 * Functions for finding and categorizing bones in 3D models
 */

import * as THREE from 'three';
import type { BoneGroupConfig } from '../boneMapping';

/**
 * Find bones using regex patterns from configuration
 */
function findBonesUsingPatterns(root: THREE.Object3D, patterns: string[]): THREE.Bone[] {
  const bones: THREE.Bone[] = [];
  
  root.traverse(obj => {
    if ((obj as any).isBone) {
      const boneName = obj.name || '';
      
      // Check if bone name matches any pattern
      const matches = patterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(boneName);
        } catch (error) {
          console.warn('BONE_MAPPING', 'Invalid regex pattern', { pattern, error });
          return false;
        }
      });
      
      if (matches) {
        bones.push(obj as THREE.Bone);
      }
    }
  });
  
  return bones;
}

/**
 * Categorize bones by groups using configuration
 */
export function categorizeBonesByGroups(
  root: THREE.Object3D,
  boneGroups: Record<string, BoneGroupConfig>
): Record<string, THREE.Bone[]> {
  const categorizedBones: Record<string, THREE.Bone[]> = {};
  
  Object.entries(boneGroups).forEach(([groupName, groupConfig]) => {
    categorizedBones[groupName] = findBonesUsingPatterns(root, groupConfig.patterns);
  });
  
  return categorizedBones;
}

/**
 * Find all bones in a model
 */
function findAllBones(root: THREE.Object3D): THREE.Bone[] {
  const bones: THREE.Bone[] = [];
  
  root.traverse(obj => {
    if ((obj as any).isBone) {
      bones.push(obj as THREE.Bone);
    }
  });
  
  return bones;
}

/**
 * Validate bone exists and is valid
 */
function validateBone(bone: THREE.Bone): boolean {
  return !!(bone && bone.name && bone.scale && bone.updateMatrixWorld);
}