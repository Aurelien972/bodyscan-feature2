/**
 * Morphological Constraints System - Data-Driven
 * Unified constraints based on database truth, no hard-coded gender bans
 */

import logger from '../utils/logger';
import { toCanonicalDBKey } from './keys/index';
import type { MorphologyMappingData } from '../../hooks/useMorphologyMapping';

export interface MorphPolicy {
  requiredKeys: string[];
  optionalKeys: string[];
  ranges: Record<string, { min: number; max: number }>;
}

interface ConstraintApplication {
  type: 'db_ban' | 'physiological_range';
  field: string;
  original_value: number;
  adjusted_value: number;
  reason: string;
}

/**
 * Build morph policy from database mapping
 */
export function buildMorphPolicy(mapping: MorphologyMappingData, gender: 'male' | 'female'): MorphPolicy {
  const genderMapping = gender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  
  // AUDIT: Ensure genderMapping exists and has required properties
  if (!genderMapping || !genderMapping.morph_values) {
    logger.error('MORPH_POLICY', 'Invalid gender mapping - missing morph_values', {
      gender,
      hasGenderMapping: !!genderMapping,
      genderMappingKeys: genderMapping ? Object.keys(genderMapping) : [],
      philosophy: 'db_validation_failed'
    });
    throw new Error(`Invalid gender mapping for ${gender} - missing morph_values`);
  }
  
  // PHASE 0: Log which gender mapping is being used for policy building
  logger.info('MORPH_POLICY', 'Building morph policy from gender-specific mapping', {
    gender,
    mappingMorphValuesCount: Object.keys(genderMapping.morph_values).length,
    mappingLimbMassesCount: Object.keys(genderMapping.limb_masses).length,
    philosophy: 'ai_driven_db_bounds_only_no_caps_mutex'
  }
  )
  
  const requiredKeys: string[] = [];
  const optionalKeys: string[] = [];
  const ranges: Record<string, { min: number; max: number }> = {};
  
  // Classify keys based on DB ranges
  Object.entries(genderMapping.morph_values).forEach(([key, range]) => {
    // AUDIT: Validate range object
    if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') {
      logger.warn('MORPH_POLICY', 'Invalid range for morph key', {
        key,
        range,
        gender,
        philosophy: 'db_validation_warning'
      });
      return;
    }
    
    const canonicalKey = toCanonicalDBKey(key);
    ranges[canonicalKey] = range;
    
    // If range is [0,0], it's effectively banned but we don't call it "banned"
    // If range allows variation, it's required for complete morphology
    if (range.min === 0 && range.max === 0) {
      // Effectively disabled morph - add to optional so it doesn't block rendering
      optionalKeys.push(canonicalKey);
      logger.debug('MORPH_POLICY', 'Morph banned by DB range [0,0]', {
        key: canonicalKey,
        gender,
        philosophy: 'db_banned_morph'
      });
    } else {
      // Active morph - required for complete representation
      requiredKeys.push(canonicalKey);
    }
  });
  
  // Face morphs are optional (may not exist in all models)
  const faceKeys = [
    'FaceLowerEyelashLength', 'eyelashLength', 'eyelashesSpecial',
    'eyesShape', 'eyesSpacing', 'eyesDown', 'eyesUp', 'eyesSpacingWide',
    'eyesClosedL', 'eyesClosedR'
  ];
  
  faceKeys.forEach(key => {
    const canonicalKey = toCanonicalDBKey(key);
    if (!optionalKeys.includes(canonicalKey) && !requiredKeys.includes(canonicalKey)) {
      optionalKeys.push(canonicalKey);
      // Add default range for face keys if not present
      if (!ranges[canonicalKey]) {
        ranges[canonicalKey] = { min: -2, max: 2 };
      }
    }
  });
  
  logger.info('MORPH_POLICY', 'DB-only morph policy built', {
    gender,
    mappingSource: gender === 'male' ? 'mapping_masculine' : 'mapping_feminine',
    requiredKeys: requiredKeys.length,
    optionalKeys: optionalKeys.length,
    totalRanges: Object.keys(ranges).length,
    philosophy: 'ai_driven_db_bounds_only'
  });
  
  return {
    requiredKeys,
    optionalKeys,
    ranges
  };
}

/**
 * Apply ONLY physiological constraints - SIMPLIFIED
 * NO MORE family caps, mutex groups - ONLY clamp to database min/max ranges
 */
export function applyMorphologicalConstraints(
  shapeParams: Record<string, number>,
  policy: MorphPolicy,
  gender: 'male' | 'female'
): {
  constrainedParams: Record<string, number>;
  constraintsApplied: ConstraintApplication[];
} {
  logger.debug('MORPH_CONSTRAINTS', 'Applying ONLY physiological constraints (AI-driven)', {
    inputKeys: Object.keys(shapeParams).length,
    gender,
    policyRanges: Object.keys(policy.ranges).length,
    philosophy: 'ai_driven_db_bounds_only'
  });
  
  const constrainedParams = { ...shapeParams };
  const constraintsApplied: ConstraintApplication[] = [];
  
  // Step 1: Apply DB-based disables (range [0,0]) - DATABASE-DRIVEN ONLY
  Object.entries(policy.ranges).forEach(([key, range]) => {
    if (range.min === 0 && range.max === 0 && key in constrainedParams) {
      const originalValue = constrainedParams[key];
      if (Math.abs(originalValue) > 0.001) {
        constraintsApplied.push({
          type: 'db_ban',
          field: key,
          original_value: originalValue,
          adjusted_value: 0,
          reason: `Disabled by DB (min=max=0) - not hardcoded rule`
        });
        constrainedParams[key] = 0;
      }
    }
  });
  
  // Step 2: Clamp to DB physiological ranges (ONLY remaining constraint)
  Object.entries(policy.ranges).forEach(([key, range]) => {
    if (key in constrainedParams) {
      const originalValue = constrainedParams[key];
      const clampedValue = Math.max(range.min, Math.min(range.max, originalValue));
      
      if (Math.abs(originalValue - clampedValue) > 0.001) {
        constraintsApplied.push({
          type: 'physiological_range',
          field: key,
          original_value: originalValue,
          adjusted_value: clampedValue,
          reason: `DB physiological range [${range.min}, ${range.max}] - AI handles everything else`
        });
        constrainedParams[key] = clampedValue;
      }
    }
  });
  
  logger.info('MORPH_CONSTRAINTS', 'Simplified constraints applied (AI-driven)', {
    constraintsCount: constraintsApplied.length,
    dbBansApplied: constraintsApplied.filter(c => c.type === 'db_ban').length,
    physiologicalClamps: constraintsApplied.filter(c => c.type === 'physiological_range').length,
    philosophy: 'ai_driven_db_bounds_only'
  });
  
  return {
    constrainedParams,
    constraintsApplied
  };
}

/**
 * Clamp values to DB ranges
 */
function clampToDBRange(
  shapeParams: Record<string, number>,
  mapping: MorphologyMappingData,
  gender: 'male' | 'female'
): Record<string, number> {
  const genderMapping = gender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  const clamped = { ...shapeParams };
  
  Object.entries(clamped).forEach(([key, value]) => {
    const range = genderMapping.morph_values[key];
    if (range && typeof value === 'number') {
      const clampedValue = Math.max(range.min, Math.min(range.max, value));
      if (Math.abs(value - clampedValue) > 0.001) {
        logger.debug('MORPH_CONSTRAINTS', 'Clamped value to DB range', {
          key,
          original: value.toFixed(3),
          clamped: clampedValue.toFixed(3),
          range: `[${range.min}, ${range.max}]`
        });
        clamped[key] = clampedValue;
      }
    }
  });
  
  return clamped;
}