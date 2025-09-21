/**
 * Payload Generators - Fallback Generation Logic
 * Functions for generating fallback morphological data when primary sources fail
 */

import logger from '../../utils/logger';
import type { MorphologyMappingData } from '../../../hooks/useMorphologyMapping';

/**
 * PHASE A.4: Generate strict DB-only fallback with no generic morphs
 */
export function generateStrictDBOnlyFallback(policy: any, gender: 'male' | 'female'): Record<string, number> {
  const fallback: Record<string, number> = {};
  
  // PHASE A.4: Only initialize keys that are explicitly allowed by DB for this gender
  policy.requiredKeys.forEach((key: string) => {
    const range = policy.ranges[key];
    
    // Skip banned morphs (range [0,0])
    if (range && range.min === 0 && range.max === 0) {
      fallback[key] = 0;
      return;
    }
    
    // For valid morphs, use conservative defaults (prefer 0 if possible)
    if (range) {
      if (range.min <= 0 && range.max >= 0) {
        fallback[key] = 0;
      } else {
        // Use value closest to 0
        fallback[key] = Math.abs(range.min) < Math.abs(range.max) ? range.min : range.max;
      }
    } else {
      fallback[key] = 0;
    }
  });
  
  // PHASE A.4: Ensure no contradictory morphs for common body types
  if (gender === 'male') {
    // Force masculine-appropriate defaults
    if ('pregnant' in fallback) fallback.pregnant = 0;
    if ('nipples' in fallback) fallback.nipples = 0;
    if ('superBreast' in fallback) fallback.superBreast = 0;
    if ('animeProportion' in fallback) fallback.animeProportion = 0;
  }
  
  logger.info('MORPH_PAYLOAD', 'PHASE A.4: Generated strict DB-only fallback', {
    gender,
    keysCount: Object.keys(fallback).length,
    sampleKeys: Object.keys(fallback).slice(0, 5),
    bannedKeysForced: Object.entries(fallback).filter(([k, v]) => v === 0).length,
    philosophy: 'phase_a_strict_db_only_no_contradictory_morphs'
  });
  
  return fallback;
}

/**
 * PHASE A.4: Generate strict DB-only limb masses
 */
function generateStrictDBOnlyLimbMasses(policy: any, gender: 'male' | 'female'): Record<string, number> {
  // Conservative limb masses for fallback
  return {
    gate: 1.0,
    armMass: 1.0,
    calfMass: 1.0,
    neckMass: 1.0,
    thighMass: 1.0,
    torsoMass: 1.0,
    forearmMass: 1.0
  };
}

/**
 * Generate fallback limb masses
 */
export function generateFallbackLimbMasses(): Record<string, number> {
  return {
    gate: 1.0,
    armMass: 1.0,
    calfMass: 1.0,
    neckMass: 1.0,
    thighMass: 1.0,
    torsoMass: 1.0,
    forearmMass: 1.0
  };
}

/**
 * Ensure all limb masses from DB are present
 */
export function ensureCompleteLimbMasses(
  limbMasses: Record<string, number>,
  mapping: MorphologyMappingData,
  gender: 'male' | 'female'
): Record<string, number> {
  const genderMapping = gender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  const complete = { ...limbMasses };
  
  // Add missing limb masses with default values
  Object.keys(genderMapping.limb_masses).forEach(key => {
    if (!(key in complete)) {
      const range = genderMapping.limb_masses[key];
      // Use 1.0 if it's within range, otherwise use middle of range
      complete[key] = range && range.min <= 1.0 && range.max >= 1.0 ? 1.0 : 
                    range ? (range.min + range.max) / 2 : 1.0;
      
      logger.debug('MORPH_PAYLOAD', 'Added missing limb mass with default value', {
        key,
        defaultValue: complete[key],
        range: range ? `[${range.min}, ${range.max}]` : 'no_range',
        gender,
        philosophy: 'ai_driven_completion'
      });
    }
  });
  
  logger.debug('MORPH_PAYLOAD', 'Limb masses completed for AI-driven processing', {
    originalKeys: Object.keys(limbMasses).length,
    completeKeys: Object.keys(complete).length,
    addedKeys: Object.keys(complete).length - Object.keys(limbMasses).length,
    gender,
    philosophy: 'ai_driven_completion'
  });
  
  return complete;
}

/**
 * Generate intelligent limb masses fallback based on BMI and user data
 */
function generateIntelligentLimbMassesFallback(
  estimateResult: any,
  clientScanId: string
): Record<string, number> {
  const estimatedBMI = estimateResult?.extracted_data?.estimated_bmi || 22;
  const bodyFatPerc = estimateResult?.extracted_data?.estimated_body_fat_perc || 15;
  
  // Calculate BMI factor for limb mass variation
  const bmiFactor = Math.max(0.7, Math.min(1.4, estimatedBMI / 22)); // Normal BMI = 22
  const fatFactor = Math.max(0.8, Math.min(1.3, bodyFatPerc / 15)); // Normal body fat = 15%
  
  // Generate varied limb masses based on anthropometric data
  const intelligentLimbMasses = {
    gate: 1.0, // Always 1.0
    armMass: 1.0 + (bmiFactor - 1.0) * 0.3 + (fatFactor - 1.0) * 0.2,
    calfMass: 1.0 + (bmiFactor - 1.0) * 0.25 + (fatFactor - 1.0) * 0.15,
    neckMass: 1.0 + (bmiFactor - 1.0) * 0.2 + (fatFactor - 1.0) * 0.1,
    thighMass: 1.0 + (bmiFactor - 1.0) * 0.4 + (fatFactor - 1.0) * 0.3,
    torsoMass: 1.0 + (bmiFactor - 1.0) * 0.5 + (fatFactor - 1.0) * 0.4,
    forearmMass: 1.0 + (bmiFactor - 1.0) * 0.25 + (fatFactor - 1.0) * 0.15,
  };
  
  // Clamp to reasonable ranges
  Object.keys(intelligentLimbMasses).forEach(key => {
    if (key !== 'gate') {
      intelligentLimbMasses[key] = Math.max(0.6, Math.min(1.6, intelligentLimbMasses[key]));
    }
  });
  
  logger.info('LIMB_MASSES_EXTRACTION', 'Generated intelligent limb masses fallback', {
    clientScanId,
    estimatedBMI: estimatedBMI.toFixed(2),
    bodyFatPerc: bodyFatPerc.toFixed(1),
    bmiFactor: bmiFactor.toFixed(3),
    fatFactor: fatFactor.toFixed(3),
    generatedMasses: Object.entries(intelligentLimbMasses).map(([k, v]) => ({ key: k, value: v.toFixed(3) }))
  });
  
  return intelligentLimbMasses;
}