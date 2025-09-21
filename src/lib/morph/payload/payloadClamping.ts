/**
 * Payload Clamping - Range Validation Functions
 * Functions for clamping morphological values to database physiological ranges
 */

import logger from '../../utils/logger';
import type { MorphologyMappingData } from '../../../hooks/useMorphologyMapping';

/**
 * Clamp values to DB ranges
 */
export function clampToDBRange(
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

/**
 * Clamp limb masses to DB ranges
 */
export function clampLimbMassesToDBRange(
  limbMasses: Record<string, number>,
  mapping: MorphologyMappingData,
  gender: 'male' | 'female'
): Record<string, number> {
  const genderMapping = gender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  const clamped = { ...limbMasses };
  
  Object.entries(clamped).forEach(([key, value]) => {
    const range = genderMapping.limb_masses[key];
    if (range && typeof value === 'number') {
      const clampedValue = Math.max(range.min, Math.min(range.max, value));
      if (Math.abs(value - clampedValue) > 0.001) {
        logger.debug('MORPH_CONSTRAINTS', 'Clamped limb mass to DB range', {
          key,
          original: value.toFixed(3),
          clamped: clampedValue.toFixed(3),
          range: `[${range.min}, ${range.max}]`,
          philosophy: 'ai_driven_db_only'
        });
        clamped[key] = clampedValue;
      }
    }
  });
  
  return clamped;
}