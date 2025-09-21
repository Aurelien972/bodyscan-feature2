/**
 * Payload Converters - Key Conversion Utilities
 * Functions for converting between different key formats and validating availability
 */

import logger from '../../utils/logger';
import { toBlenderKey } from '../keys/index';

/**
 * Convert canonical DB keys to Blender shape keys
 */
export function convertToBlenderKeys(shapeParams: Record<string, number>): Record<string, number> {
  const blenderKeys: Record<string, number> = {};
  
  Object.entries(shapeParams).forEach(([dbKey, value]) => {
    const blenderKey = toBlenderKey(dbKey);
    if (blenderKey) {
      blenderKeys[blenderKey] = value;
    } else {
      logger.warn('MORPH_PAYLOAD', 'No Blender key mapping found', { dbKey });
    }
  });
  
  logger.debug('MORPH_PAYLOAD', 'Converted to Blender keys', {
    dbKeysCount: Object.keys(shapeParams).length,
    blenderKeysCount: Object.keys(blenderKeys).length
  });
  
  return blenderKeys;
}

/**
 * Validate against available shape keys in GLTF
 */
export function validateAgainstAvailableKeys(
  blenderKeys: Record<string, number>,
  policy: any,
  availableKeys?: string[]
): {
  missing_required: string[];
  missing_optional: string[];
} {
  if (!availableKeys) {
    return { missing_required: [], missing_optional: [] };
  }
  
  const missing_required: string[] = [];
  const missing_optional: string[] = [];
  
  // Check required keys
  policy.requiredKeys.forEach((dbKey: string) => {
    const blenderKey = toBlenderKey(dbKey);
    if (blenderKey && !availableKeys.includes(blenderKey)) {
      missing_required.push(dbKey);
    }
  });
  
  // Check optional keys
  policy.optionalKeys.forEach((dbKey: string) => {
    const blenderKey = toBlenderKey(dbKey);
    if (blenderKey && !availableKeys.includes(blenderKey)) {
      missing_optional.push(dbKey);
    }
  });
  
  return { missing_required, missing_optional };
}