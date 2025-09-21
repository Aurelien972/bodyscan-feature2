/**
 * Payload Extractors - Data Extraction Utilities
 * Functions for extracting and gathering morphological data from scan results
 */

import logger from '../../utils/logger';
import { getMorphologyFeatureFlags } from '../../../config/featureFlags';
import { normalizeShapeParams } from '../keys/index';
import { generateStrictDBOnlyFallback, generateFallbackLimbMasses } from './payloadGenerators';
import type { ScanResults } from './types';
import type { MorphologyMappingData } from '../../../hooks/useMorphologyMapping';

/**
 * Extract photos from scan results for AI refinement
 */
export function extractPhotosFromScanResults(scanResults: ScanResults): Array<{ view: string; url: string; report?: any }> {
  const photos: Array<{ view: string; url: string; report?: any }> = [];
  
  // Try to extract from photos_metadata
  if (scanResults.commit?.photos_metadata && Array.isArray(scanResults.commit.photos_metadata)) {
    scanResults.commit.photos_metadata.forEach((photo: any) => {
      if (photo.type && photo.url) {
        photos.push({
          view: photo.type,
          url: photo.url,
          report: photo.captureReport || photo.report
        });
      }
    });
  }
  
  // Try to extract from estimate photos_metadata
  if (photos.length === 0 && scanResults.estimate?.photos_metadata && Array.isArray(scanResults.estimate.photos_metadata)) {
    scanResults.estimate.photos_metadata.forEach((photo: any) => {
      if (photo.view && photo.url) {
        photos.push({
          view: photo.view,
          url: photo.url,
          report: photo.report
        });
      }
    });
  }
  
  logger.debug('MORPH_PAYLOAD', 'Extracted photos for AI refinement', {
    photosCount: photos.length,
    photoViews: photos.map(p => p.view),
    hasReports: photos.filter(p => !!p.report).length
  });
  
  return photos;
}

/**
 * Gather morph data from scan results with priority strategy
 * PHASE A.4: Enhanced with robust strategy handling
 */
export function gatherMorphData(
  scanResults: ScanResults,
  policy: any,
  finalGender: 'male' | 'female',
  flags: any,
  mapping: MorphologyMappingData
): {
  shape_params: Record<string, number>;
  limb_masses: Record<string, number>;
  strategy: string;
} {
  // PHASE A.4: Enhanced strategy tracking with robust defaults
  let detectedStrategy = 'comprehensive_fallback'; // Always start with a valid default
  
  // DB-ONLY MODE: Strict fallback hierarchy
  if (flags.FALLBACK_MODE === 'DB_ONLY') {
    logger.info('MORPH_PAYLOAD', 'Using DB-ONLY fallback mode', {
      finalGender,
      philosophy: 'phase_a_strict_db_only_no_generic_morphs'
    });
    
    // Priority 1: AI-refined results from scan results
    if (scanResults.match?.ai_refinement?.ai_refine && scanResults.match?.ai_refinement?.final_shape_params) {
      logger.info('MORPH_PAYLOAD', 'Using AI-refined results from scan results');
      detectedStrategy = 'ai_refined_from_scan_results';
      return {
        shape_params: normalizeShapeParams(scanResults.match.ai_refinement.final_shape_params ?? {}, finalGender, mapping),
        limb_masses: scanResults.match.ai_refinement.final_limb_masses ?? {},
        strategy: detectedStrategy
      };
    }
    
    // Priority 2: Primary archetype from DB (strict)
    if (scanResults.match?.selected_archetypes && scanResults.match.selected_archetypes.length > 0) {
      const primaryArchetype = scanResults.match.selected_archetypes[0];
      logger.info('MORPH_PAYLOAD', 'Using primary archetype (DB-only mode)', {
        archetypeId: primaryArchetype.id,
        archetypeName: primaryArchetype.name,
        philosophy: 'phase_a_strict_db_archetype_only'
      });
      detectedStrategy = 'primary_archetype_db_only';
      return {
        shape_params: normalizeShapeParams(primaryArchetype.morph_values ?? {}, finalGender, mapping),
        limb_masses: primaryArchetype.limb_masses ?? {},
        strategy: detectedStrategy
      };
    }
    
    // Priority 3: Generate DB-only fallback (no generic morphs)
    logger.warn('MORPH_PAYLOAD', 'No archetype data available, using strict DB-only fallback');
    detectedStrategy = 'strict_db_only_fallback';
    return {
      shape_params: generateStrictDBOnlyFallback(policy, finalGender),
      limb_masses: generateStrictDBOnlyLimbMasses(policy, finalGender),
      strategy: detectedStrategy
    };
  }
  
  // Strategy 1: Use blended data from match result (preferred)
  if (scanResults.match?.blended_shape_params && Object.keys(scanResults.match.blended_shape_params).length > 0) {
    logger.debug('MORPH_PAYLOAD', 'Using blended data from match result');
    detectedStrategy = scanResults.match?.strategy_used ?? scanResults.match?.strategy ?? 'match_blended_data';
    return {
      shape_params: normalizeShapeParams(scanResults.match.blended_shape_params, finalGender, mapping),
      limb_masses: scanResults.match.blended_limb_masses ?? {},
      strategy: detectedStrategy
    };
  }
  
  // Strategy 2: Use primary archetype from selected archetypes
  if (scanResults.match?.selected_archetypes && scanResults.match.selected_archetypes.length > 0) {
    const primaryArchetype = scanResults.match.selected_archetypes[0];
    logger.debug('MORPH_PAYLOAD', 'Using primary archetype data', {
      archetypeId: primaryArchetype.id,
      archetypeName: primaryArchetype.name
    });
    detectedStrategy = scanResults.match?.strategy_used ?? scanResults.match?.strategy ?? 'primary_archetype';
    return {
      shape_params: normalizeShapeParams(primaryArchetype.morph_values ?? {}, finalGender, mapping),
      limb_masses: primaryArchetype.limb_masses ?? {},
      strategy: detectedStrategy
    };
  }
  
  // Strategy 3: Use validated morph values from semantic analysis
  if (scanResults.semantic?.semantic_profile?.validated_morph_values) {
    logger.debug('MORPH_PAYLOAD', 'Using validated morph values from semantic');
    detectedStrategy = scanResults.match?.strategy_used ?? scanResults.match?.strategy ?? 'semantic_validated';
    return {
      shape_params: normalizeShapeParams(scanResults.semantic.semantic_profile.validated_morph_values, finalGender, mapping),
      limb_masses: {},
      strategy: detectedStrategy
    };
  }
  
  // Strategy 4: Use shape params from estimate
  if (scanResults.estimate?.extracted_data?.shape_params) {
    logger.debug('MORPH_PAYLOAD', 'Using shape params from estimate');
    detectedStrategy = scanResults.match?.strategy_used ?? scanResults.match?.strategy ?? 'estimate_data';
    return {
      shape_params: normalizeShapeParams(scanResults.estimate.extracted_data.shape_params, finalGender, mapping),
      limb_masses: scanResults.estimate.extracted_data.limb_masses ?? {},
      strategy: detectedStrategy
    };
  }
  
  // Strategy 5: Generate comprehensive fallback
  logger.warn('MORPH_PAYLOAD', 'PHASE A.4: No morph data found, using comprehensive fallback');
  detectedStrategy = scanResults.match?.strategy_used ?? scanResults.match?.strategy ?? 'comprehensive_fallback';
  return {
    shape_params: generateDBOnlyFallback(policy, finalGender),
    limb_masses: generateFallbackLimbMasses(),
    strategy: detectedStrategy
  };
}

/**
 * PHASE A.4: Generate DB-only fallback with only valid DB keys (no generic morphs)
 */
function generateDBOnlyFallback(policy: any, gender: 'male' | 'female'): Record<string, number> {
  return generateStrictDBOnlyFallback(policy, gender);
}