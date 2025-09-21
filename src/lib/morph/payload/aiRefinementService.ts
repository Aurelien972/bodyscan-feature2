/**
 * AI Refinement Service - Edge Function Integration
 * Service for calling scan-refine-morphs Edge Function for AI-driven morphological refinement
 */

import logger from '../../utils/logger';

/**
 * Call scan-refine-morphs Edge Function for AI refinement
 */
export async function callScanRefineMorphs(request: {
  scan_id: string;
  user_id: string;
  resolvedGender: 'masculine' | 'feminine';
  photos: Array<{ view: string; url: string; report?: any }>;
  blend_shape_params: Record<string, number>;
  blend_limb_masses: Record<string, number>;
  mapping_version: string;
  k5_envelope?: any;
  vision_classification?: any;
  user_measurements?: {
    height_cm: number;
    weight_kg: number;
    estimated_bmi: number;
    raw_measurements: {
      waist_cm: number;
      chest_cm: number;
      hips_cm: number;
    };
  };
}) {
  // PHASE 1: Import strict schema validation
  const { validateRefineResponse } = await import('./types');
  const { RefineResponse } = await import('./types');
  
  const { supabase } = await import('../../../system/supabase/client');
  
  // Filter out non-numeric properties from blend_limb_masses
  const filteredLimbMasses: Record<string, number> = {};
  Object.entries(request.blend_limb_masses).forEach(([key, value]) => {
    if (typeof value === 'number' && isFinite(value)) {
      filteredLimbMasses[key] = value;
    }
  });
  
  logger.info('MORPH_PAYLOAD', 'Calling scan-refine-morphs Edge Function', {
    scanId: request.scan_id,
    userId: request.user_id,
    resolvedGender: request.resolvedGender,
    photosCount: request.photos.length,
    blendShapeParamsCount: Object.keys(request.blend_shape_params).length,
    blendLimbMassesCount: Object.keys(filteredLimbMasses).length,
    originalLimbMassesCount: Object.keys(request.blend_limb_masses).length,
    filteredOutKeys: Object.keys(request.blend_limb_masses).filter(key => 
      typeof request.blend_limb_masses[key] !== 'number' || !isFinite(request.blend_limb_masses[key])
    ),
    mappingVersion: request.mapping_version,
    hasUserMeasurements: !!request.user_measurements,
    philosophy: 'ai_driven_edge_function_call'
  });
  
  const { data, error } = await supabase.functions.invoke('scan-refine-morphs', {
    body: {
      ...request,
      blend_limb_masses: filteredLimbMasses,
      user_measurements: request.user_measurements
    }
  });
  
  if (error) {
    logger.error('MORPH_PAYLOAD', 'scan-refine-morphs Edge Function failed', {
      scanId: request.scan_id,
      error: error.message || error,
      philosophy: 'ai_refinement_failed'
    });
    throw new Error(`AI refinement failed: ${error.message}`);
  }
  
  // PHASE 1: Strict validation of Edge Function response
  if (!data) {
    logger.error('MORPH_PAYLOAD', 'PHASE 1: scan-refine-morphs returned null/undefined data', {
      scanId: request.scan_id,
      philosophy: 'phase_1_null_response_validation'
    });
    throw new Error('AI refinement service returned null or undefined data');
  }
  
  const validation = validateRefineResponse(data);
  
  if (!validation.isValid) {
    logger.error('MORPH_PAYLOAD', 'PHASE 1: scan-refine-morphs response validation failed', {
      scanId: request.scan_id,
      errors: validation.errors,
      warnings: validation.warnings,
      responseData: data,
      philosophy: 'phase_1_edge_function_response_validation_failed'
    });
    throw new Error(`AI refinement response validation failed: ${validation.errors.join(', ')}`);
  }
  
  if (validation.warnings.length > 0) {
    logger.warn('MORPH_PAYLOAD', 'PHASE 1: scan-refine-morphs response has warnings', {
      scanId: request.scan_id,
      warnings: validation.warnings,
      philosophy: 'phase_1_edge_function_response_quality_warnings'
    });
  }
  
  logger.info('MORPH_PAYLOAD', 'scan-refine-morphs Edge Function completed successfully', {
    scanId: request.scan_id,
    aiRefine: data.ai_refine,
    finalShapeParamsCount: Object.keys(data.final_shape_params || {}).length,
    finalLimbMassesCount: Object.keys(data.final_limb_masses || {}).length,
    clampedKeysCount: data.clamped_keys?.length || 0,
    outOfRangeCount: data.out_of_range_count || 0,
    activeKeysCount: data.active_keys_count || 0,
    aiConfidence: data.ai_confidence,
    validationPassed: true,
    philosophy: 'ai_refinement_success'
  });
  
  return data as RefineResponse;
}