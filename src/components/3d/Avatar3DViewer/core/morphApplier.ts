import * as THREE from 'three';
import { applyMorphTargetsToMesh } from '../../../../lib/3d/morph/application/morphTargetApplier';
import { applyLimbMassToBones } from '../../../../lib/3d/bones/applyLimbMassToBones';
import type { MorphologyMappingData } from '../../../../hooks/useMorphologyMapping';
import logger from '../../../../lib/utils/logger';

interface MorphApplicationOptions {
  model: THREE.Group;
  morphData: Record<string, number>;
  gender: 'male' | 'female';
  morphologyMapping?: MorphologyMappingData;
  minMaxBounds?: Record<string, { min: number; max: number }>;
  serverScanId?: string;
  faceMorphData?: Record<string, number>; // NOUVEAU: Ajouter faceMorphData
}

interface LimbMassApplicationOptions {
  model: THREE.Group;
  limbMasses: Record<string, number>;
  shapeParams?: Record<string, number>;
  serverScanId?: string;
}

/**
 * Apply morph data to model
 */
export async function applyMorphDataToModel(options: MorphApplicationOptions): Promise<void> {
  const { model, morphData, gender, morphologyMapping, minMaxBounds, serverScanId, faceMorphData } = options; // NOUVEAU: Récupérer faceMorphData

  logger.debug('MORPH_APPLIER', 'Applying morph data to model', {
    serverScanId,
    morphDataCount: Object.keys(morphData).length,
    gender,
    hasFaceMorphData: !!faceMorphData, // NOUVEAU: Log faceMorphData
    philosophy: 'core_morph_application'
  });

  // Find main mesh
  let mainMesh: THREE.SkinnedMesh | null = null;
  
  model.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
      if (!mainMesh || 
          Object.keys(child.morphTargetDictionary).length > Object.keys(mainMesh.morphTargetDictionary || {}).length) {
        mainMesh = child;
      }
    }
  });
  
  if (!mainMesh) {
    throw new Error('No main mesh found for morph application');
  }

  // Apply morphs using existing system
  // MODIFIED: Passer faceMorphData à applyMorphTargetsToMesh
  await applyMorphTargetsToMesh(mainMesh, morphData, gender, morphologyMapping, minMaxBounds, faceMorphData);

  logger.info('MORPH_APPLIER', 'Morph application completed', {
    appliedMorphsCount: Object.keys(morphData).length,
    serverScanId,
    philosophy: 'core_morph_applied'
  });
}

/**
 * Apply limb mass data to model bones
 */
export async function applyLimbMassDataToModel(options: LimbMassApplicationOptions): Promise<void> {
  const { model, limbMasses, shapeParams = {}, serverScanId } = options;

  logger.debug('MORPH_APPLIER', 'Applying limb masses to bones', {
    serverScanId,
    limbMassesCount: Object.keys(limbMasses).length,
    philosophy: 'core_limb_mass_application'
  });

  const massesForBones = {
    gate: limbMasses.gate ?? 1,
    isActive: limbMasses.isActive ?? true,
    armMass: limbMasses.armMass,
    forearmMass: limbMasses.forearmMass,
    thighMass: limbMasses.thighMass,
    calfMass: limbMasses.calfMass,
    neckMass: limbMasses.neckMass,
    hipMass: limbMasses.hipMass,
  };
  
  applyLimbMassToBones(model, massesForBones, shapeParams, {
    lengthAxis: 'y',
    log: true
  });

  logger.info('MORPH_APPLIER', 'Limb mass application completed', {
    serverScanId,
    philosophy: 'core_limb_masses_applied'
  });
}

/**
 * Apply simple morphs to mesh (direct morph target application)
 */
function applySimpleMorphs(model: THREE.Group, morphs: Record<string, number>, serverScanId?: string): void {
  logger.debug('MORPH_APPLIER', 'Applying simple morphs to model', {
    serverScanId,
    morphsCount: Object.keys(morphs).length,
    philosophy: 'core_simple_morph_application'
  });

  let appliedCount = 0;
  let skippedCount = 0;

  model.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh & { 
      morphTargetDictionary?: Record<string, number>; 
      morphTargetInfluences?: number[] 
    };
    
    const dict = mesh.morphTargetDictionary;
    const infl = mesh.morphTargetInfluences;
    
    if (!dict || !infl) return;
    
    for (const [key, value] of Object.entries(morphs)) {
      const targetIndex = dict[key];
      if (targetIndex == null) {
        skippedCount++;
        continue;
      }
      
      const clampedValue = Math.max(-1, Math.min(1, value));
      infl[targetIndex] = clampedValue;
      appliedCount++;
    }
  });

  logger.info('MORPH_APPLIER', 'Simple morphs applied', {
    appliedCount,
    skippedCount,
    serverScanId,
    philosophy: 'core_simple_morphs_complete'
  });
}

/**
 * Update model geometry after morph changes
 */
function updateModelGeometry(model: THREE.Group): void {
  model.traverse((obj: THREE.Object3D) => {
    if (obj instanceof THREE.SkinnedMesh) {
      if (obj.geometry) {
        obj.geometry.attributes.position.needsUpdate = true;
        if (obj.geometry.attributes.normal) {
          obj.geometry.attributes.normal.needsUpdate = true;
        }
        obj.geometry.computeBoundingBox();
        obj.geometry.computeBoundingSphere();
      }
      
      if (obj.material) {
        obj.material.needsUpdate = true;
      }
      
      obj.updateMatrix();
      obj.updateMatrixWorld(true);
      
      // Ensure mesh is visible
      if (!obj.visible) {
        obj.visible = true;
      }
    }
  });
}

