import * as THREE from 'three';
import { 
  DIRECT_BLENDER_SHAPE_KEY_MAPPING,
  LIMB_MASS_TO_BLENDER_MAPPING,
  getBlenderShapeKey 
} from '../morphTypes';
import { isValidDBKey, isKeyBannedForGender, isValidFaceMorphKey } from '../../../morph/keys/keyValidators'; // MODIFIED: Import isValidFaceMorphKey
import type { MorphologyMappingData } from '../../../../hooks/useMorphologyMapping';
import logger from '../../../../lib/utils/logger';
import { toDbGender } from '../../../morph/keys/keyNormalizers';

/**
 * PHASE A.6: Apply morph targets to mesh with strict DB allowlisting
 * Only applies morphs that are valid and non-banned for the specific gender
 */
export async function applyMorphTargetsToMesh(
  mainMesh: THREE.SkinnedMesh,
  morphData: Record<string, number>,
  gender: 'male' | 'female',
  morphologyMapping?: MorphologyMappingData,
  minMaxBounds?: Record<string, { min: number; max: number }>,
  faceMorphData?: Record<string, number> // NOUVEAU: Ajouter faceMorphData
): Promise<void> {
  if (!morphData && !faceMorphData) { // MODIFIED: Vérifier les deux types de morphs
    logger.warn('MORPH_TARGET_APPLIER', 'PHASE A.6: No morph data provided', { 
      gender,
      philosophy: 'phase_a_no_data'
    });
    return;
  }

  // Validate mesh has morph target data
  if (!mainMesh.morphTargetDictionary || !mainMesh.morphTargetInfluences) {
    logger.error('MORPH_TARGET_APPLIER', 'PHASE A.6: Mesh missing morph target data', {
      hasDictionary: !!mainMesh.morphTargetDictionary,
      hasInfluences: !!mainMesh.morphTargetInfluences,
      philosophy: 'phase_a_mesh_validation'
    });
    return;
  }

  const morphTargetDictionary = mainMesh.morphTargetDictionary;
  const morphTargetInfluences = mainMesh.morphTargetInfluences;

  let appliedCount = 0;
  let skippedCount = 0;
  let bannedCount = 0;
  let invalidCount = 0;

  // MODIFIED: Fusionner les morphs corporels et faciaux, en donnant priorité aux faciaux
  const combinedMorphData = { ...morphData, ...faceMorphData };

  logger.debug('MORPH_TARGET_APPLIER', 'PHASE A.6: Starting strict DB-allowlisted morph application', {
    totalMorphData: Object.keys(combinedMorphData).length,
    gender,
    availableTargets: Object.keys(morphTargetDictionary).length,
    hasMorphologyMapping: !!morphologyMapping,
    philosophy: 'phase_a_strict_db_allowlisting'
  });

  // PHASE A.6: Apply each morph parameter with strict DB validation
  Object.entries(combinedMorphData).forEach(([morphKey, value]) => { // MODIFIED: Itérer sur les morphs combinés
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      invalidCount++;
      logger.warn('MORPH_TARGET_APPLIER', 'PHASE A.6: Invalid morph value', {
        morphKey,
        value,
        valueType: typeof value,
        philosophy: 'phase_a_value_validation'
      });
      skippedCount++;
      return;
    }
    
    // PHASE A.6: Validate key against DB mapping
    // MODIFIED: Check both body and face morph keys
    if (!isValidDBKey(morphKey, gender, morphologyMapping)) { 
      invalidCount++;
      logger.warn('MORPH_TARGET_APPLIER', 'PHASE A.6: Invalid DB key, skipping', {
        morphKey,
        value: value.toFixed(3),
        gender,
        reason: 'key_not_in_db_mapping',
        mappingKeysSample: morphologyMapping ? Object.keys(morphologyMapping.mapping_masculine?.morph_values || {}).slice(0, 5) : 'N/A',
        philosophy: 'phase_a_strict_db_validation'
      });
      skippedCount++;
      return;
    }
    
    // PHASE A.6: Check if key is banned for this gender
    if (morphologyMapping && isKeyBannedForGender(morphKey, gender, morphologyMapping)) {
      bannedCount++;
      logger.debug('MORPH_TARGET_APPLIER', 'PHASE A.6: Banned key for gender, forcing to 0', {
        morphKey,
        originalValue: value.toFixed(3),
        gender,
        reason: 'banned_by_db_range_0_0',
        philosophy: 'phase_a_gender_ban_enforcement'
      });
      
      // Still apply to mesh but force value to 0
      const blenderKey = getBlenderShapeKey(morphKey);
      if (blenderKey && blenderKey in morphTargetDictionary) {
        const targetIndex = morphTargetDictionary[blenderKey];
        morphTargetInfluences[targetIndex] = 0;
        appliedCount++;
      }
      return;
    }

    // Get Blender shape key
    const blenderKey = getBlenderShapeKey(morphKey); // Use the utility function to get the Blender key
    
    if (blenderKey && blenderKey in morphTargetDictionary) {
      const targetIndex = morphTargetDictionary[blenderKey];
      const previousValue = morphTargetInfluences[targetIndex];
      
      // PHASE A.6: Apply value with DB range validation
      let finalValue = value;
      
      // Apply DB range clamping if mapping available
      if (morphologyMapping) {
        const genderMapping = toDbGender(gender) === 'masculine' ? 
          morphologyMapping.mapping_masculine : 
          morphologyMapping.mapping_feminine;
        
        // MODIFIED: Check both morph_values and face_values for range
        let range = genderMapping.morph_values[morphKey];
        if (!range) {
          range = genderMapping.face_values[morphKey];
        }

        if (range) {
          const originalValueBeforeK5Clamp = value; // Store original value before K5 clamp
          finalValue = Math.max(range.min, Math.min(range.max, value));
          
          if (Math.abs(originalValueBeforeK5Clamp - finalValue) > 0.001) {
            logger.debug('MORPH_TARGET_APPLIER', 'PHASE A.6: Clamped value to DB range', {
              morphKey,
              originalValue: originalValueBeforeK5Clamp.toFixed(3),
              clampedValue: finalValue.toFixed(3),
              dbRange: `[${range.min.toFixed(3)}, ${range.max.toFixed(3)}]`,
              philosophy: 'phase_a_db_range_clamping'
            });
          }
        }
      }
      
      morphTargetInfluences[targetIndex] = finalValue;
      appliedCount++;
      
      logger.debug('MORPH_TARGET_APPLIER', 'PHASE A.6: Applied DB-validated morph target', {
        morphKey,
        blenderKey,
        originalValue: value.toFixed(3),
        finalValue: finalValue.toFixed(3),
        previousValue: previousValue.toFixed(3),
        wasClampedToDB: Math.abs(value - finalValue) > 0.001,
        philosophy: 'phase_a_db_validated_application'
      });
    } else {
      skippedCount++;
      logger.trace('MORPH_TARGET_APPLIER', 'PHASE A.6: Skipped morph - no Blender target found (graceful)', {
        morphKey,
        attemptedBlenderKey: getBlenderShapeKey(morphKey), // Log the attempted Blender key
        availableTargets: Object.keys(morphTargetDictionary).slice(0, 5),
        philosophy: 'phase_a_graceful_skip_missing_targets'
      });
    }
  });

  // Force mesh updates
  if (appliedCount > 0) {
    if (mainMesh.geometry) {
      mainMesh.geometry.attributes.position.needsUpdate = true;
      if (mainMesh.geometry.attributes.normal) {
        mainMesh.geometry.attributes.normal.needsUpdate = true;
      }
      mainMesh.geometry.computeBoundingBox();
      mainMesh.geometry.computeBoundingSphere();
    }
    
    if (mainMesh.material) {
      mainMesh.material.needsUpdate = true;
    }
    
    mainMesh.updateMatrix();
    mainMesh.updateMatrixWorld(true);
    
    // Ensure mesh is visible
    if (!mainMesh.visible) {
      mainMesh.visible = true;
      logger.warn('MORPH_TARGET_APPLIER', 'PHASE A.6: Forced mesh visibility after morph application');
    }
  }

  logger.info('MORPH_TARGET_APPLIER', 'PHASE A.6: Strict DB-allowlisted morph application completed', {
    appliedCount,
    skippedCount,
    bannedCount,
    invalidCount,
    gender,
    meshVisible: mainMesh.visible,
    hasMorphologyMapping: !!morphologyMapping,
    philosophy: 'phase_a_strict_db_allowlisting_complete'
  });
}

/**
 * PHASE A.6: Set bone thickness using configuration-driven approach
 */
function setBoneThickness(
  bone: THREE.Bone, 
  scaleFactor: number, 
  lengthAxis: 'x'|'y'|'z' = 'y',
  config: any
) {
  // Apply axis-specific scaling (preserve length axis)
  const sx = lengthAxis === 'x' ? 1 : scaleFactor;
  const sy = lengthAxis === 'y' ? 1 : scaleFactor;
  const sz = lengthAxis === 'z' ? 1 : scaleFactor;
  
  bone.scale.set(sx, sy, sz);
  bone.updateMatrixWorld(true);
}

