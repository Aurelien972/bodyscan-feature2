/**
 * Payload Validators - Strict Allowlisting Functions
 * Functions for validating and filtering morphological data against database constraints
 */

import logger from '../../utils/logger';
import { toCanonicalDBKey } from '../keys/index';
import type { MorphologyMappingData } from '../../../hooks/useMorphologyMapping';

/**
 * PHASE A.4: Apply strict allowlisting to shape parameters
 * Only allows keys that are present in DB mapping for the specific gender
 * Uses stable union of masculine + feminine keys for consistent allowlist
 */
export function applyStrictAllowlisting(
  shapeParams: Record<string, number>,
  mapping: MorphologyMappingData,
  gender: 'male' | 'female',
  source: string
): Record<string, number> {
  // PHASE 2: Use stable union of both gender mappings for consistent allowlist
  const masculineKeys = new Set(Object.keys(mapping.mapping_masculine.morph_values));
  const feminineKeys = new Set(Object.keys(mapping.mapping_feminine.morph_values));
  const stableAllowlist = new Set([...masculineKeys, ...feminineKeys]);
  
  // Still use gender-specific mapping for validation
  const genderMapping = gender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  
  const allowlistedParams: Record<string, number> = {};
  let rejectedCount = 0;
  
  Object.entries(shapeParams).forEach(([key, value]) => {
    const canonicalKey = toCanonicalDBKey(key);
    
    // Check if key is in stable allowlist (union of both genders)
    if (stableAllowlist.has(canonicalKey)) {
      allowlistedParams[canonicalKey] = value;
    } else {
      rejectedCount++;
      logger.warn('MORPH_PAYLOAD', 'PHASE A.4: Rejected non-DB key', {
        originalKey: key,
        canonicalKey,
        value: typeof value === 'number' ? value.toFixed(3) : value,
        gender,
        source,
        reason: 'key_not_in_stable_allowlist',
        philosophy: 'strict_allowlisting'
      });
    }
  });
  
  logger.info('MORPH_PAYLOAD', 'PHASE A.4: Stable allowlisting applied to shape params', {
    originalKeys: Object.keys(shapeParams).length,
    allowlistedKeys: Object.keys(allowlistedParams).length,
    rejectedKeys: rejectedCount,
    stableAllowlistSize: stableAllowlist.size,
    gender,
    source,
    philosophy: 'stable_union_allowlisting'
  });
  
  return allowlistedParams;
}

/**
 * PHASE A.4: Apply strict allowlisting to limb masses
 * Only allows keys that are present in DB mapping for the specific gender
 * Uses stable union of masculine + feminine keys for consistent allowlist
 */
export function applyStrictLimbMassAllowlisting(
  limbMasses: Record<string, number>,
  mapping: MorphologyMappingData,
  gender: 'male' | 'female',
  source: string
): Record<string, number> {
  // PHASE 2: Use stable union of both gender mappings for consistent allowlist
  const masculineKeys = new Set(Object.keys(mapping.mapping_masculine.limb_masses));
  const feminineKeys = new Set(Object.keys(mapping.mapping_feminine.limb_masses));
  const stableAllowlist = new Set([...masculineKeys, ...feminineKeys]);
  
  // Still use gender-specific mapping for validation
  const genderMapping = gender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  
  const allowlistedMasses: Record<string, number> = {};
  let rejectedCount = 0;
  
  Object.entries(limbMasses).forEach(([key, value]) => {
    // Check if key is in stable allowlist (union of both genders)
    if (stableAllowlist.has(key)) {
      allowlistedMasses[key] = value;
    } else {
      rejectedCount++;
      logger.warn('MORPH_PAYLOAD', 'PHASE A.4: Rejected non-DB limb mass key', {
        key,
        value: typeof value === 'number' ? value.toFixed(3) : value,
        gender,
        source,
        reason: 'key_not_in_stable_allowlist',
        philosophy: 'strict_allowlisting'
      });
    }
  });
  
  logger.info('MORPH_PAYLOAD', 'PHASE A.4: Stable allowlisting applied to limb masses', {
    originalKeys: Object.keys(limbMasses).length,
    allowlistedKeys: Object.keys(allowlistedMasses).length,
    rejectedKeys: rejectedCount,
    stableAllowlistSize: stableAllowlist.size,
    gender,
    source,
    philosophy: 'stable_union_allowlisting'
  });
  
  return allowlistedMasses;
}