/**
 * Payload Builder - Main Orchestration
 * Central orchestrator for morphological payload preparation
 */

import logger from '../../utils/logger';
import { getMorphologyFeatureFlags } from '../../../config/featureFlags';
import { buildMorphPolicy } from '../constraints';
import { blendArchetypeMorphs, ensureCompleteShapeParams } from '../blend';
import { extractPhotosFromScanResults, gatherMorphData } from './payloadExtractors';
import { applyStrictAllowlisting, applyStrictLimbMassAllowlisting } from './payloadValidators';
import { clampToDBRange, clampLimbMassesToDBRange } from './payloadClamping';
import { convertToBlenderKeys, validateAgainstAvailableKeys } from './payloadConverters';
import { ensureCompleteLimbMasses } from './payloadGenerators';
import { callScanRefineMorphs } from './aiRefinementService';
import type { MorphologyMappingData } from '../../../hooks/useMorphologyMapping';
import type { ScanResults, PreparedPayload } from './types';

/**
 * Enhanced PreparedPayload with strict status management
 */
interface EnhancedPreparedPayload extends PreparedPayload {
  status: 'ready' | 'error';
  error?: string;
}
/**
 * AI-DRIVEN pipeline for preparing morphological payload
 * Integrates AI refinement after archetype blending
 * Returns payload with strict status management
 */
export async function prepareMorphologicalPayload(
  scanResults: ScanResults,
  mapping: MorphologyMappingData,
  gender: 'male' | 'female',
  resolvedGender?: 'male' | 'female'
): Promise<EnhancedPreparedPayload> {
  const flags = getMorphologyFeatureFlags();
  
  // PHASE 0: Use explicit resolved gender if provided, otherwise fallback to gender parameter
  const finalGender = resolvedGender || gender;
  
  logger.info('MORPH_PAYLOAD', 'Starting AI-driven morphological payload preparation', {
    gender: finalGender,
    explicitResolvedGender: resolvedGender,
    originalGender: gender,
    hasScanResults: !!scanResults,
    hasMapping: !!mapping,
    featureFlags: flags,
    philosophy: 'phase_a_strict_allowlisting_robust_fallback'
  });
  
  // PHASE 2: Validate critical inputs early
  if (!mapping || !mapping.mapping_masculine || !mapping.mapping_feminine) {
    const error = 'Invalid morphology mapping - missing gender mappings';
    logger.error('MORPH_PAYLOAD', 'PHASE 2: Critical input validation failed', {
      error,
      hasMapping: !!mapping,
      hasMasculineMapping: !!(mapping?.mapping_masculine),
      hasFeminineMapping: !!(mapping?.mapping_feminine),
      philosophy: 'phase_2_critical_input_validation'
    });
    
    return {
      status: 'error',
      shape_params: {},
      limb_masses: {},
      blender_shape_keys: {},
      metadata: {
        strategy: 'critical_input_validation_failed',
        finalGender,
        confidence: 0,
        quality_score: 0,
        constraints_applied: 0,
        missing_required: [],
        missing_optional: [],
        ai_refined: false,
        mapping_version: 'unknown',
        allowlisted_keys_count: 0,
        rejected_keys_count: 0,
        envelope_constrained: false,
        morph_generation_fallback: true
      },
      error
    };
  }

  // Step 1: Build morph policy from DB
  let policy;
  try {
    policy = buildMorphPolicy(mapping, finalGender);
  } catch (policyError) {
    const error = `Failed to build morph policy: ${policyError instanceof Error ? policyError.message : 'Unknown error'}`;
    logger.error('MORPH_PAYLOAD', 'PHASE 2: Morph policy building failed', {
      error,
      finalGender,
      philosophy: 'phase_2_policy_building_failure'
    });
    
    return {
      status: 'error',
      shape_params: {},
      limb_masses: {},
      blender_shape_keys: {},
      metadata: {
        strategy: 'morph_policy_building_failed',
        finalGender,
        confidence: 0,
        quality_score: 0,
        constraints_applied: 0,
        missing_required: [],
        missing_optional: [],
        ai_refined: false,
        mapping_version: 'unknown',
        allowlisted_keys_count: 0,
        rejected_keys_count: 0,
        envelope_constrained: false,
        morph_generation_fallback: true
      },
      error
    };
  }
  
  // PHASE 0: Log which gender mapping is being used
  const genderMapping = finalGender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  logger.info('MORPH_PAYLOAD', 'Using gender-specific mapping for AI-driven processing', {
    finalGender,
    mappingMorphValuesCount: Object.keys(genderMapping.morph_values).length,
    mappingLimbMassesCount: Object.keys(genderMapping.limb_masses).length,
    policyRequiredKeys: policy.requiredKeys.length,
    policyOptionalKeys: policy.optionalKeys.length,
    philosophy: 'ai_driven_db_mapping'
  });
  
  // Step 2: Check for AI-refined results first
  if (scanResults.match?.ai_refinement?.ai_refine === true && scanResults.match?.ai_refinement?.final_shape_params) {
    // PHASE 1: Validate AI refinement response structure
    const { validateRefineResponse } = await import('./types');
    const validation = validateRefineResponse(scanResults.match.ai_refinement);
    
    if (!validation.isValid) {
      logger.error('MORPH_PAYLOAD', 'PHASE 1: AI refinement response validation failed', {
        finalGender,
        errors: validation.errors,
        warnings: validation.warnings,
        philosophy: 'phase_1_strict_schema_validation'
      });
      throw new Error(`AI refinement data validation failed: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      logger.warn('MORPH_PAYLOAD', 'PHASE 1: AI refinement response has warnings', {
        finalGender,
        warnings: validation.warnings,
        philosophy: 'phase_1_data_quality_warnings'
      });
    }
    
    // PHASE 1: Explicit validation of critical properties
    const aiRefinement = scanResults.match.ai_refinement;
    if (!aiRefinement.final_shape_params || Object.keys(aiRefinement.final_shape_params).length === 0) {
      logger.error('MORPH_PAYLOAD', 'PHASE 1: AI refinement missing final_shape_params', {
        finalGender,
        aiRefine: aiRefinement.ai_refine,
        hasFinalShapeParams: !!aiRefinement.final_shape_params,
        finalShapeParamsKeys: aiRefinement.final_shape_params ? Object.keys(aiRefinement.final_shape_params) : [],
        philosophy: 'phase_1_critical_data_validation'
      });
      throw new Error('AI refinement succeeded but final_shape_params is missing or empty');
    }
    
    if (!aiRefinement.final_limb_masses || Object.keys(aiRefinement.final_limb_masses).length === 0) {
      logger.error('MORPH_PAYLOAD', 'PHASE 1: AI refinement missing final_limb_masses', {
        finalGender,
        aiRefine: aiRefinement.ai_refine,
        hasFinalLimbMasses: !!aiRefinement.final_limb_masses,
        finalLimbMassesKeys: aiRefinement.final_limb_masses ? Object.keys(aiRefinement.final_limb_masses) : [],
        philosophy: 'phase_1_critical_data_validation'
      });
      throw new Error('AI refinement succeeded but final_limb_masses is missing or empty');
    }
    
    logger.info('MORPH_PAYLOAD', 'Using AI-refined results directly', {
      finalGender,
      aiRefined: true,
      mappingVersion: scanResults.match.ai_refinement.mapping_version,
      validationPassed: true,
      philosophy: 'phase_a_ai_refined_direct_use'
    });
    
    // PHASE A.4: Apply strict allowlisting and clamp for defense in depth
    const allowlistedShapeParams = applyStrictAllowlisting(
      aiRefinement.final_shape_params, 
      mapping, 
      finalGender, 
      'ai_refined'
    );
    const finalShapeParams = clampToDBRange(allowlistedShapeParams, mapping, finalGender);
    const allowlistedLimbMasses = applyStrictLimbMassAllowlisting(
      aiRefinement.final_limb_masses, 
      mapping, 
      finalGender, 
      'ai_refined'
    );
    const finalLimbMasses = clampLimbMassesToDBRange(allowlistedLimbMasses, mapping, finalGender);
    
    return {
      shape_params: finalShapeParams,
      limb_masses: finalLimbMasses,
      blender_shape_keys: convertToBlenderKeys(finalShapeParams),
      metadata: {
        strategy: 'ai_refined_k5_constrained_validated', // PHASE 1: Explicit strategy assignment
        finalGender,
        confidence: 0.95,
        quality_score: 0.95,
        constraints_applied: 0,
        missing_required: [],
        missing_optional: [],
        ai_refined: true,
        mapping_version: aiRefinement.mapping_version,
        allowlisted_keys_count: Object.keys(finalShapeParams).length,
        rejected_keys_count: Object.keys(aiRefinement.final_shape_params).length - Object.keys(allowlistedShapeParams).length,
        envelope_constrained: false,
        morph_generation_fallback: false,
        phase_b_ai_refinement_metrics: {
          clamped_keys: aiRefinement.clamped_keys || [],
          envelope_violations: aiRefinement.envelope_violations || [],
          db_violations: aiRefinement.db_violations || [],
          out_of_range_count: aiRefinement.out_of_range_count || 0,
          missing_keys_added: aiRefinement.missing_keys_added || [],
          extra_keys_removed: aiRefinement.extra_keys_removed || [],
          active_keys_count: aiRefinement.active_keys_count || 0,
          top_shape_deltas: aiRefinement.refinement_deltas?.top_10_shape_deltas || [],
          top_limb_deltas: aiRefinement.refinement_deltas?.top_10_limb_deltas || [],
          k5_envelope_used: !!scanResults.match?.k5_envelope,
          vision_classification_used: !!scanResults.semantic?.semantic_profile
        }
      }
    };
  }
  
  // Step 3: Gather raw data from scan results and apply AI refinement
  const morphDataResult = gatherMorphData(scanResults, policy, finalGender, flags, mapping);
  const { shape_params, limb_masses, strategy = 'comprehensive_fallback' } = morphDataResult;
  
  // PHASE 1: Ensure strategy is always defined with a valid fallback
  const finalStrategy = strategy || 'comprehensive_fallback_no_strategy_detected';
  
  logger.info('MORPH_PAYLOAD', 'PHASE 1: Strategy validation and assignment completed', {
    originalStrategy: strategy,
    finalStrategy,
    strategyWasUndefined: !strategy,
    philosophy: 'phase_1_explicit_strategy_assignment'
  });
  
  // Step 4: Blend if multiple archetypes available
  let blendedData = { shape_params, limb_masses };
  let blendingConfidence = 0.8;
  let blendingQuality = 0.8;
  
  if (scanResults.match?.selected_archetypes && scanResults.match.selected_archetypes.length > 1) {
    logger.info('MORPH_PAYLOAD', 'Applying client-side blending (pre-AI refinement)', {
      archetypesCount: scanResults.match.selected_archetypes.length,
      philosophy: 'pre_ai_blending'
    });
    
    const blendResult = blendArchetypeMorphs(scanResults.match.selected_archetypes, mapping, finalGender);
    blendedData = {
      shape_params: blendResult.shape_params,
      limb_masses: blendResult.limb_masses
    };
    blendingConfidence = blendResult.confidence;
    blendingQuality = blendResult.quality_score;
  }
  
  // Step 5: Apply AI refinement via scan-refine-morphs Edge Function
  try {
    const userMeasurements = scanResults.estimate?.extracted_data ? {
      height_cm: scanResults.estimate.extracted_data.raw_measurements?.height_cm || 175,
      weight_kg: scanResults.estimate.extracted_data.raw_measurements?.weight_kg || 70,
      estimated_bmi: scanResults.estimate.extracted_data.estimated_bmi || 22,
      raw_measurements: {
        waist_cm: scanResults.estimate.extracted_data.raw_measurements?.waist_cm || 80,
        chest_cm: scanResults.estimate.extracted_data.raw_measurements?.chest_cm || 95,
        hips_cm: scanResults.estimate.extracted_data.raw_measurements?.hips_cm || 100
      }
    } : undefined;
    
    const k5_envelope = scanResults.match?.k5_envelope;
    const vision_classification = scanResults.semantic?.semantic_profile ? {
      muscularity: scanResults.semantic.semantic_profile.muscularity,
      obesity: scanResults.semantic.semantic_profile.obesity,
      morphotype: scanResults.semantic.semantic_profile.morphotype,
      level: scanResults.semantic.semantic_profile.level
    } : null;

    logger.info('MORPH_PAYLOAD', 'Calling scan-refine-morphs for AI refinement', {
      finalGender,
      blendedShapeParamsCount: Object.keys(blendedData.shape_params).length,
      blendedLimbMassesCount: Object.keys(blendedData.limb_masses).length,
      hasK5Envelope: !!k5_envelope,
      hasVisionClassification: !!vision_classification,
      hasUserMeasurements: !!userMeasurements,
      philosophy: 'phase_b_ai_driven_k5_constrained_refinement'
    });
    
    const aiRefinementResult = await callScanRefineMorphs({
      scan_id: scanResults.serverScanId || scanResults.commit?.scan_id || 'unknown',
      user_id: scanResults.userId || 'unknown',
      resolvedGender: finalGender === 'male' ? 'masculine' : 'feminine',
      photos: extractPhotosFromScanResults(scanResults),
      blend_shape_params: blendedData.shape_params,
      blend_limb_masses: blendedData.limb_masses,
      mapping_version: 'v1.0',
      k5_envelope: k5_envelope,
      vision_classification: vision_classification,
      user_measurements: userMeasurements
    });
    
    // PHASE 1: Strict validation of AI refinement result
    if (!aiRefinementResult) {
      throw new Error('AI refinement service returned null or undefined response');
    }
    
    const { validateRefineResponse } = await import('./types');
    const validation = validateRefineResponse(aiRefinementResult);
    
    if (!validation.isValid) {
      logger.error('MORPH_PAYLOAD', 'PHASE 1: AI refinement result validation failed', {
        finalGender,
        errors: validation.errors,
        warnings: validation.warnings,
        aiRefinementResult,
        philosophy: 'phase_1_ai_result_validation_failed'
      });
      throw new Error(`AI refinement result validation failed: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      logger.warn('MORPH_PAYLOAD', 'PHASE 1: AI refinement result has warnings', {
        finalGender,
        warnings: validation.warnings,
        philosophy: 'phase_1_ai_result_quality_warnings'
      });
    }
    
    if (aiRefinementResult.ai_refine) {
      // PHASE 1: Additional critical data validation
      if (Object.keys(aiRefinementResult.final_shape_params).length === 0) {
        throw new Error('AI refinement succeeded but final_shape_params is empty');
      }
      
      if (Object.keys(aiRefinementResult.final_limb_masses).length === 0) {
        throw new Error('AI refinement succeeded but final_limb_masses is empty');
      }
      
      const finalShapeParams = clampToDBRange(aiRefinementResult.final_shape_params, mapping, finalGender);
      const finalLimbMasses = clampLimbMassesToDBRange(aiRefinementResult.final_limb_masses, mapping, finalGender);
      
      return {
        shape_params: finalShapeParams,
        limb_masses: finalLimbMasses,
        blender_shape_keys: convertToBlenderKeys(finalShapeParams),
        metadata: {
          strategy: 'phase_b_ai_refined_k5_constrained_validated', // PHASE 1: Explicit strategy assignment
          finalGender,
          confidence: aiRefinementResult.ai_confidence || 0.95,
          quality_score: 0.95,
          constraints_applied: 0,
          missing_required: [],
          missing_optional: [],
          ai_refined: true,
          mapping_version: aiRefinementResult.mapping_version,
          allowlisted_keys_count: Object.keys(finalShapeParams).length,
          rejected_keys_count: 0,
          envelope_constrained: true,
          morph_generation_fallback: false,
          phase_b_ai_refinement_metrics: {
            clamped_keys: aiRefinementResult.clamped_keys || [],
            envelope_violations: aiRefinementResult.envelope_violations || [],
            db_violations: aiRefinementResult.db_violations || [],
            out_of_range_count: aiRefinementResult.out_of_range_count || 0,
            missing_keys_added: aiRefinementResult.missing_keys_added || [],
            extra_keys_removed: aiRefinementResult.extra_keys_removed || [],
            active_keys_count: aiRefinementResult.active_keys_count || 0,
            top_shape_deltas: aiRefinementResult.refinement_deltas?.top_10_shape_deltas || [],
            top_limb_deltas: aiRefinementResult.refinement_deltas?.top_10_limb_deltas || [],
            k5_envelope_used: !!k5_envelope,
            vision_classification_used: !!vision_classification
          }
        }
      };
    }
  } catch (aiError) {
    logger.error('MORPH_PAYLOAD', 'PHASE 1: AI refinement failed with validation error', {
      finalGender,
      error: aiError instanceof Error ? aiError.message : 'Unknown error',
      stack: aiError instanceof Error ? aiError.stack : undefined,
      philosophy: 'phase_1_ai_refinement_critical_failure'
    });
    
    // PHASE 1: Re-throw critical validation errors instead of silently falling back
    if (aiError instanceof Error && 
        (aiError.message.includes('validation failed') || 
         aiError.message.includes('missing or empty') ||
         aiError.message.includes('null or undefined'))) {
      throw aiError; // Critical data validation errors should not be silently handled
    }
    
    // Only fall back for network/service errors
    logger.warn('MORPH_PAYLOAD', 'PHASE 1: AI refinement service error, falling back to blended data', {
      finalGender,
      error: aiError instanceof Error ? aiError.message : 'Unknown error',
      philosophy: 'phase_1_service_error_fallback'
    });
  }
  
  // Fallback: Apply ONLY physiological constraints to blended data
  const { constrainedParams, constraintsApplied } = await import('../constraints').then(m => 
    m.applyMorphologicalConstraints(blendedData.shape_params, policy, finalGender)
  );
  
  // PHASE A.4: Apply strict allowlisting before clamping
  const allowlistedParams = applyStrictAllowlisting(constrainedParams, mapping, finalGender, strategy);
  const allowlistedLimbMasses = applyStrictLimbMassAllowlisting(blendedData.limb_masses, mapping, finalGender, strategy);
  
  // PHASE 1: Ensure final strategy is always defined
  const robustFinalStrategy = finalStrategy || 'fallback_blend_with_constraints';
  
  // Clamp to DB ranges (defense in depth)
  const clampedParams = clampToDBRange(allowlistedParams, mapping, finalGender);
  const clampedLimbMasses = clampLimbMassesToDBRange(allowlistedLimbMasses, mapping, finalGender);
  
  // Ensure all required keys are present
  const completeParams = ensureCompleteShapeParams(clampedParams, policy);
  const completeLimbMasses = ensureCompleteLimbMasses(clampedLimbMasses, mapping, finalGender);
  
  // Apply style constraints for realistic avatars
  const styledParams = applyStyleConstraints(completeParams, finalGender, 'realistic');
  
  // Convert to Blender keys for 3D application
  const blenderShapeKeys = convertToBlenderKeys(styledParams);
  
  // Validate against available shape keys
  const { missing_required, missing_optional } = validateAgainstAvailableKeys(
    blenderShapeKeys,
    policy,
    undefined
  );
  
  const finalPayload: PreparedPayload = {
    shape_params: styledParams,
    limb_masses: completeLimbMasses,
    blender_shape_keys: blenderShapeKeys,
    metadata: {
      strategy: robustFinalStrategy || 'fallback_blend_with_constraints_validated', // PHASE 1: Guaranteed non-null strategy
      finalGender,
      confidence: blendingConfidence,
      quality_score: blendingQuality,
      constraints_applied: constraintsApplied.length,
      missing_required,
      missing_optional,
      ai_refined: false,
      mapping_version: 'v1.0',
      allowlisted_keys_count: Object.keys(styledParams).length,
      rejected_keys_count: Object.keys(constrainedParams).length - Object.keys(allowlistedParams).length,
      envelope_constrained: false,
      morph_generation_fallback: false,
    }
  };
  
  // PHASE 1: Final payload validation before return
  if (!finalPayload.metadata.strategy || finalPayload.metadata.strategy.length === 0) {
    logger.error('MORPH_PAYLOAD', 'PHASE 1: Critical error - strategy is still undefined after all fallbacks', {
      finalGender,
      robustFinalStrategy,
      originalStrategy: strategy,
      philosophy: 'phase_1_critical_strategy_validation'
    });
    throw new Error('Critical error: strategy field is undefined after all fallback attempts');
  }
  
  if (Object.keys(finalPayload.shape_params).length === 0) {
    logger.error('MORPH_PAYLOAD', 'PHASE 1: Critical error - no shape parameters in final payload', {
      finalGender,
      strategy: finalPayload.metadata.strategy,
      philosophy: 'phase_1_critical_data_validation'
    });
    throw new Error('Critical error: final payload contains no shape parameters');
  }
  
  logger.info('MORPH_PAYLOAD', 'PHASE A.4: Fallback morphological payload prepared', {
    strategy: finalPayload.metadata.strategy,
    finalGender,
    shapeParamsCount: Object.keys(completeParams).length,
    limbMassesCount: Object.keys(completeLimbMasses).length,
    blenderKeysCount: Object.keys(blenderShapeKeys).length,
    confidence: blendingConfidence.toFixed(3),
    qualityScore: blendingQuality.toFixed(3),
    constraintsApplied: constraintsApplied.length,
    allowlistedKeysCount: finalPayload.metadata.allowlisted_keys_count,
    rejectedKeysCount: finalPayload.metadata.rejected_keys_count,
    validationPassed: true,
    philosophy: 'phase_a_fallback_with_strict_allowlisting'
  });
  
  return finalPayload;
}

/**
 * Apply style constraints for realistic avatars
 * Reduces feminine/fantasy morphs for male avatars in realistic mode
 */
function applyStyleConstraints(
  shapeParams: Record<string, number>,
  gender: 'male' | 'female',
  style: 'realistic' | 'stylized' = 'realistic'
): Record<string, number> {
  if (style !== 'realistic' || gender !== 'male') {
    return shapeParams;
  }
  
  const styledParams = { ...shapeParams };
  
  // Feminine/fantasy morphs to soft-clamp for realistic male avatars
  const feminineFantasyMorphs = [
    'superBreast', 'breastsSmall', 'breastsSag', 'pregnant', 
    'animeWaist', 'dollBody', 'animeProportion', 'animeNeck', 'nipples'
  ];
  
  let adjustedCount = 0;
  
  feminineFantasyMorphs.forEach(morphKey => {
    if (morphKey in styledParams && Math.abs(styledParams[morphKey]) > 0.01) {
      const originalValue = styledParams[morphKey];
      const softClampedValue = Math.min(originalValue, 0.05);
      
      if (Math.abs(originalValue - softClampedValue) > 0.001) {
        styledParams[morphKey] = softClampedValue;
        adjustedCount++;
        
        logger.debug('STYLE_CONSTRAINTS', 'Applied realistic soft-clamp for male avatar', {
          morphKey,
          originalValue: originalValue.toFixed(3),
          softClampedValue: softClampedValue.toFixed(3),
          style,
          gender,
          philosophy: 'realistic_male_avatar_soft_clamping'
        });
      }
    }
  });
  
  if (adjustedCount > 0) {
    logger.info('STYLE_CONSTRAINTS', 'Applied realistic style constraints', {
      gender,
      style,
      adjustedMorphsCount: adjustedCount,
      philosophy: 'realistic_avatar_style_optimization'
    });
  }
  
  return styledParams;
}