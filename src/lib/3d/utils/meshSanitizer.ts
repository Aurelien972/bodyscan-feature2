/**
 * Mesh Sanitizer - PG-13 Content Filtering
 * Sanitizes 3D models for appropriate content display
 */

import * as THREE from 'three';
import logger from '../../utils/logger';

/**
 * Sanitize avatar scene for appropriate content display
 */
export function sanitizeAvatarScene(root: THREE.Object3D): THREE.SkinnedMesh | null {
  const startTime = performance.now();
  
  logger.debug('MESH_SANITIZER', 'Starting avatar scene sanitization', { 
    rootName: root.name, 
    rootChildren: root.children.length 
  });
  
  let selectedMainMesh: THREE.SkinnedMesh | null = null;
  const candidateMeshes: THREE.SkinnedMesh[] = [];
  const objectsToRemove: THREE.Object3D[] = [];
  
  // First pass - identify main mesh and unwanted objects
  root.traverse((obj: THREE.Object3D) => {
    if (obj instanceof THREE.SkinnedMesh && obj.morphTargetDictionary) {
      candidateMeshes.push(obj);
      logger.debug('MESH_SANITIZER', 'Found candidate mesh', { meshName: obj.name });
    }
    
    // Identify unwanted objects for removal
    if (obj.name && shouldRemoveObject(obj)) {
      objectsToRemove.push(obj);
    }
  });
  
  // Select main mesh
  const basemeshCandidates = candidateMeshes.filter(mesh => 
    mesh.name.toLowerCase().includes('basemesh')
  );
  
  if (basemeshCandidates.length > 0) {
    selectedMainMesh = basemeshCandidates.reduce((best, current) => {
      const bestCount = Object.keys(best.morphTargetDictionary || {}).length;
      const currentCount = Object.keys(current.morphTargetDictionary || {}).length;
      return currentCount > bestCount ? current : best;
    });
  } else if (candidateMeshes.length > 0) {
    selectedMainMesh = candidateMeshes.reduce((best, current) => {
      const bestCount = Object.keys(best.morphTargetDictionary || {}).length;
      const currentCount = Object.keys(current.morphTargetDictionary || {}).length;
      return currentCount > bestCount ? current : best;
    });
  }
  
  // Remove unwanted objects
  objectsToRemove.forEach(obj => {
    if (obj.parent) {
      obj.parent.remove(obj);
      
      // Dispose geometry and materials
      if ((obj as any).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    }
  });
  
  // Sanitize morph targets
  root.traverse((obj: THREE.Object3D) => {
    if ((obj as THREE.Mesh).isMesh && (obj as THREE.Mesh).morphTargetDictionary) {
      const mesh = obj as THREE.Mesh;
      const dict = mesh.morphTargetDictionary as Record<string, number>;
      const infl = mesh.morphTargetInfluences as number[];

      // Zero out explicit content morphs
      const explicitMorphs = [
        'BS_LOD0.AnimClitorisExpose',
        'BS_LOD0.AnimGensOpen', 
        'BS_LOD0.AnimAnusOpen',
        'BS_LOD0.BodyGenitals',
        'BS_LOD0.BodyPenis',
        'BS_LOD0.BodyVulva'
      ];

      for (const morphKey of explicitMorphs) {
        if (morphKey in dict) {
          infl[dict[morphKey]] = 0;
        }
      }
    }
  });
  
  if (selectedMainMesh) {
    selectedMainMesh.visible = true;
  }
  
  const duration = performance.now() - startTime;
  
  logger.info('MESH_SANITIZER', 'Sanitization completed', {
    selectedMainMesh: selectedMainMesh?.name || 'none',
    removedObjects: objectsToRemove.length,
    durationMs: duration.toFixed(1)
  });
  
  return selectedMainMesh;
}

/**
 * Determine if an object should be removed
 */
function shouldRemoveObject(obj: THREE.Object3D): boolean {
  const objName = obj.name.toLowerCase();
  
  // Remove explicit genitalia
  const explicitPatterns = [
    'genital', 'penis', 'vulva', 'vagina'
  ];
  
  // Remove control shapes and rig elements
  const rigPatterns = [
    'cs_', 'solid_', 'arrow_', 'circle_', 'triangle_', 'bar_', 'torus_'
  ];
  
  const unwantedPatterns = [...explicitPatterns, ...rigPatterns];
  
  return unwantedPatterns.some(pattern => objName.includes(pattern));
}