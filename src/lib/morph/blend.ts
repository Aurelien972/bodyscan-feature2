/**
 * Archetype Blending System
 * Client-side blending of multiple archetypes for precise morphology
 */

import logger from '../utils/logger';
import { toCanonicalDBKey } from './keys';
import type { MorphologyMappingData } from '../../hooks/useMorphologyMapping';
import type { MorphPolicy } from './constraints';

interface ArchetypeData {
  id: string;
  name: string;
  morph_values: Record<string, number>;
  limb_masses: Record<string, number>;
  distance?: number;
  weight?: number;
}

interface BlendingResult {
  shape_params: Record<string, number>;
  limb_masses: Record<string, number>;
  blend_weights: Array<[string, number]>;
  confidence: number;
  quality_score: number;
}

/**
 * Blend multiple archetypes using weighted interpolation
 */
export function blendArchetypeMorphs(
  archetypes: ArchetypeData[],
  mapping: MorphologyMappingData,
  gender: 'male' | 'female'
): BlendingResult {
  // PHASE 0: Log which gender mapping is being used for blending
  const genderMapping = gender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  
  logger.info('MORPH_BLEND', 'Starting client-side archetype blending', {
    archetypesCount: archetypes.length,
    gender,
    mappingMorphValuesCount: Object.keys(genderMapping.morph_values).length,
    mappingLimbMassesCount: Object.keys(genderMapping.limb_masses).length,
    primaryArchetype: archetypes[0]?.id
  });
  
  if (archetypes.length === 0) {
    throw new Error('No archetypes provided for blending');
  }
  
  // Calculate blend weights using inverse distance weighting
  const weights = calculateBlendWeights(archetypes);
  
  // Get all unique keys from all archetypes
  const allShapeKeys = new Set<string>();
  const allLimbKeys = new Set<string>();
  
  archetypes.forEach(archetype => {
    Object.keys(archetype.morph_values || {}).forEach(key => {
      allShapeKeys.add(toCanonicalDBKey(key));
    });
    Object.keys(archetype.limb_masses || {}).forEach(key => {
      allLimbKeys.add(key);
    });
  });
  
  // Blend shape parameters
  const blended_shape_params: Record<string, number> = {};
  
  for (const canonicalKey of allShapeKeys) {
    let weightedSum = 0;
    let totalWeight = 0;
    
    archetypes.forEach((archetype, index) => {
      const weight = weights[index][1];
      
      // Try to find the value in different key formats
      let value = 0;
      const possibleKeys = [canonicalKey, canonicalKey.toLowerCase(), `Body${canonicalKey}`];
      
      for (const possibleKey of possibleKeys) {
        if (archetype.morph_values && possibleKey in archetype.morph_values) {
          value = archetype.morph_values[possibleKey];
          break;
        }
      }
      
      weightedSum += value * weight;
      totalWeight += weight;
    });
    
    blended_shape_params[canonicalKey] = totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  // Blend limb masses
  const blended_limb_masses: Record<string, number> = {};
  
  for (const limbKey of allLimbKeys) {
    let weightedSum = 0;
    let totalWeight = 0;
    
    archetypes.forEach((archetype, index) => {
      const weight = weights[index][1];
      const value = archetype.limb_masses?.[limbKey] || 1.0;
      
      weightedSum += value * weight;
      totalWeight += weight;
    });
    
    blended_limb_masses[limbKey] = totalWeight > 0 ? weightedSum / totalWeight : 1.0;
  }
  
  // Calculate blending quality metrics
  const confidence = calculateBlendingConfidence(archetypes, weights);
  const quality_score = calculateBlendingQuality(archetypes, weights, blended_shape_params);
  
  logger.info('MORPH_BLEND', 'Archetype blending completed', {
    blendedShapeKeys: Object.keys(blended_shape_params).length,
    blendedLimbKeys: Object.keys(blended_limb_masses).length,
    confidence: confidence.toFixed(3),
    qualityScore: quality_score.toFixed(3),
    weights: weights.map(([id, w]) => ({ id, weight: w.toFixed(3) }))
  });
  
  return {
    shape_params: blended_shape_params,
    limb_masses: blended_limb_masses,
    blend_weights: weights,
    confidence,
    quality_score
  };
}

/**
 * Calculate blend weights using inverse distance weighting with semantic coherence
 */
function calculateBlendWeights(archetypes: ArchetypeData[]): Array<[string, number]> {
  if (archetypes.length === 1) {
    return [[archetypes[0].id, 1.0]];
  }
  
  // Use inverse distance weighting
  const weights = archetypes.map(archetype => {
    const distance = archetype.distance || 1.0;
    const weight = 1.0 / (0.1 + distance); // Add epsilon to avoid division by zero
    return [archetype.id, weight] as [string, number];
  });
  
  // Normalize weights to sum to 1
  const totalWeight = weights.reduce((sum, [_, w]) => sum + w, 0);
  const normalizedWeights = weights.map(([id, w]) => [id, w / totalWeight] as [string, number]);
  
  // Apply softmax for smoother distribution
  const temperature = 2.0;
  const expWeights = normalizedWeights.map(([id, w]) => [id, Math.exp(w / temperature)] as [string, number]);
  const expSum = expWeights.reduce((sum, [_, w]) => sum + w, 0);
  const softmaxWeights = expWeights.map(([id, w]) => [id, w / expSum] as [string, number]);
  
  // Filter out negligible weights (< 1%)
  const significantWeights = softmaxWeights.filter(([_, w]) => w >= 0.01);
  
  // Renormalize after filtering
  const finalSum = significantWeights.reduce((sum, [_, w]) => sum + w, 0);
  const finalWeights = significantWeights.map(([id, w]) => [id, w / finalSum] as [string, number]);
  
  logger.debug('MORPH_BLEND', 'Blend weights calculated', {
    originalCount: archetypes.length,
    significantCount: finalWeights.length,
    weights: finalWeights.map(([id, w]) => ({ id, weight: w.toFixed(3) }))
  });
  
  return finalWeights;
}

/**
 * Calculate blending confidence based on archetype quality
 */
function calculateBlendingConfidence(
  archetypes: ArchetypeData[],
  weights: Array<[string, number]>
): number {
  if (archetypes.length === 0) return 0;
  
  // Base confidence on distance quality and weight distribution
  const avgDistance = archetypes.reduce((sum, arch) => sum + (arch.distance || 1), 0) / archetypes.length;
  const distanceConfidence = Math.max(0.1, 1 / (1 + avgDistance));
  
  // Diversity bonus for multiple archetypes
  const diversityBonus = Math.min(0.2, archetypes.length * 0.05);
  
  // Weight distribution quality (prefer balanced weights over single dominant)
  const weightEntropy = -weights.reduce((sum, [_, w]) => sum + (w > 0 ? w * Math.log(w) : 0), 0);
  const maxEntropy = Math.log(weights.length);
  const entropyBonus = maxEntropy > 0 ? (weightEntropy / maxEntropy) * 0.1 : 0;
  
  return Math.min(0.95, distanceConfidence + diversityBonus + entropyBonus);
}

/**
 * Calculate blending quality score
 */
function calculateBlendingQuality(
  archetypes: ArchetypeData[],
  weights: Array<[string, number]>,
  blendedParams: Record<string, number>
): number {
  // Quality based on consistency of blended values
  let consistencyScore = 1.0;
  
  // Check for extreme values that might indicate poor blending
  Object.entries(blendedParams).forEach(([key, value]) => {
    if (Math.abs(value) > 3.0) {
      consistencyScore *= 0.9; // Penalize extreme values
    }
  });
  
  // Bonus for using multiple archetypes effectively
  const effectiveArchetypes = weights.filter(([_, w]) => w > 0.1).length;
  const diversityBonus = Math.min(0.2, effectiveArchetypes * 0.05);
  
  return Math.max(0.1, Math.min(1.0, consistencyScore + diversityBonus));
}

/**
 * Ensure all required keys are present with valid values
 */
export function ensureCompleteShapeParams(
  shapeParams: Record<string, number>,
  policy: MorphPolicy
): Record<string, number> {
  const complete = { ...shapeParams };
  
  // Add missing required keys with default value 0
  policy.requiredKeys.forEach(key => {
    if (!(key in complete)) {
      const range = policy.ranges[key];
      // Use 0 if it's within range, otherwise use the closest valid value
      const defaultValue = range && range.min <= 0 && range.max >= 0 ? 0 : 
                          range ? (range.min + range.max) / 2 : 0;
      complete[key] = defaultValue;
      
      logger.debug('MORPH_BLEND', 'Added missing required key', {
        key,
        defaultValue: defaultValue.toFixed(3),
        range: range ? `[${range.min}, ${range.max}]` : 'no_range'
      });
    }
  });
  
  logger.debug('MORPH_BLEND', 'Shape params completed', {
    originalKeys: Object.keys(shapeParams).length,
    completeKeys: Object.keys(complete).length,
    addedKeys: Object.keys(complete).length - Object.keys(shapeParams).length
  });
  
  return complete;
}