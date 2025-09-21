// src/app/pages/BodyScan/BodyScanCapture/services/scanProcessingService.ts
/**
 * Scan Processing Service
 * Handles the complete body scan processing pipeline
 */

import { bodyScanRepo } from '../../../../../system/data/repositories/bodyScanRepo';
import { supabase } from '../../../../../system/supabase/client';
import { scanAnalytics } from '../../../../../lib/utils/analytics';
import { useProgressStore } from '../../../../../system/store/progressStore';
import logger from '../../../../../lib/utils/logger';
import type { CapturedPhotoEnhanced } from '../../../../../domain/types';

interface ScanProcessingConfig {
  userId: string;
  clientScanId: string;
  capturedPhotos: CapturedPhotoEnhanced[];
  stableScanParams: {
    sex: 'male' | 'female';
    height_cm: number;
    weight_kg: number;
  };
  resolvedGender: 'masculine' | 'feminine'; // MODIFIED: Type updated
}

interface ScanProcessingResult {
  estimate: any;
  semantic: any;
  match: any;
  commit: any;
  completeResults: any;
}

/**
 * Process complete body scan pipeline
 */
export async function processBodyScanPipeline(
  config: ScanProcessingConfig
): Promise<ScanProcessingResult> {
  const { userId, clientScanId, capturedPhotos, stableScanParams, resolvedGender } = config;
  const { 
    setProcessingStep, 
    setServerScanId, 
    setComplete, 
    setOverallProgress, 
    incrementProgress,
    startDynamicProcessing,
    stopDynamicProcessing
  } = useProgressStore.getState();

  logger.info('SCAN_PROCESSING_SERVICE', 'Starting complete pipeline processing', {
    clientScanId,
    userId,
    photosCount: capturedPhotos.length,
    userProfile: stableScanParams,
    resolvedGender,
    timestamp: new Date().toISOString()
  });

  // STEP 0: Upload photos to Supabase Storage
  setOverallProgress(52, 'Préparation des données', 'Téléchargement sécurisé de vos photos...');
  
  // Simulation de progression pendant l'upload
  const uploadProgressInterval = setInterval(() => {
    incrementProgress(1, 'Préparation des données', 'Téléchargement sécurisé de vos photos...');
  }, 200);
  
  const uploadedPhotos = await uploadPhotosToStorage(userId, clientScanId, capturedPhotos);
  clearInterval(uploadProgressInterval);

  // START DYNAMIC PROCESSING: Begin detailed step-by-step progression
  logger.info('SCAN_PROCESSING_SERVICE', 'Starting dynamic processing progression', {
    clientScanId,
    startPercentage: 52,
    endPercentage: 92,
    totalSteps: 17, // SCAN_STATUS_STEPS.length
    philosophy: 'dynamic_scan_progression_start'
  });
  
  // Start dynamic progression from 52% to 92%
  startDynamicProcessing(52, 92);
  
  // STEP 1: scan-estimate (AI photo analysis)
  const estimateResult = await callScanEstimate(
    userId, 
    uploadedPhotos, 
    stableScanParams, 
    resolvedGender, 
    clientScanId
  );

  // STEP 2: scan-semantic (semantic classification)  
  const semanticResult = await callScanSemantic(
    userId, 
    uploadedPhotos, 
    estimateResult, 
    resolvedGender, 
    clientScanId
  );

  // STEP 3: scan-match (archetype matching)  
  const matchResult = await callScanMatch(
    userId, 
    estimateResult, 
    semanticResult, 
    resolvedGender, 
    clientScanId
  );

  // STEP 3.5: AI Morphological Refinement  
  const enhancedMatchResult = await performAIRefinement(
    matchResult,
    uploadedPhotos,
    estimateResult,
    semanticResult,
    stableScanParams,
    resolvedGender,
    clientScanId,
    userId // CRITICAL FIX: Pass userId to performAIRefinement
  );

  // STOP DYNAMIC PROCESSING: Before final commit
  logger.info('SCAN_PROCESSING_SERVICE', 'Stopping dynamic processing before commit', {
    clientScanId,
    philosophy: 'dynamic_scan_progression_stop_before_commit'
  });
  
  stopDynamicProcessing();
  
  // STEP 4: scan-commit (data persistence)
  setOverallProgress(92, 'Sauvegarde des Données', 'Persistance de votre avatar personnalisé...');
  
  const commitResult = await callScanCommit(
    userId,
    estimateResult,
    enhancedMatchResult,
    semanticResult,
    capturedPhotos,
    resolvedGender,
    clientScanId
  );

  // Store server scan ID
  if (commitResult.scan_id) {
    setServerScanId(commitResult.scan_id);
  }

  // STEP 5: Complete processing
  setProcessingStep('model_loading');
  
  // Petite pause pour montrer la completion
  setTimeout(() => {
    setProcessingStep('model_loaded');
  }, 500);

  // Build complete scan results
  const completeResults = buildCompleteResults(
    estimateResult,
    semanticResult,
    enhancedMatchResult,
    commitResult,
    uploadedPhotos,
    stableScanParams,
    resolvedGender,
    clientScanId,
    userId // CRITICAL FIX: Pass actual userId to buildCompleteResults
  );

  logger.info('SCAN_PROCESSING_SERVICE', 'Complete pipeline processing finished successfully', {
    clientScanId,
    serverScanId: commitResult.scan_id,
    hasAllResults: !!(completeResults.estimate && completeResults.semantic && completeResults.match && completeResults.commit),
    finalConfidence: completeResults.estimate?.extracted_data?.processing_confidence || 0,
    insightsCount: completeResults.insights?.items?.length || 0,
    timestamp: new Date().toISOString()
  });

  return {
    estimate: estimateResult,
    semantic: semanticResult,
    match: enhancedMatchResult,
    commit: commitResult,
    completeResults
  };
}

/**
 * Upload photos to Supabase Storage
 */
async function uploadPhotosToStorage(
  userId: string,
  clientScanId: string,
  capturedPhotos: CapturedPhotoEnhanced[]
): Promise<Array<{ view: string; url: string; report?: any }>> {
  logger.info('SCAN_PROCESSING_SERVICE', 'Step 0: Starting photo upload', { 
    clientScanId,
    photosCount: capturedPhotos.length 
  });

  const uploadedPhotos = await Promise.all(
    capturedPhotos.map(async (photo, index) => {
      try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const file = new File([blob], `scan-${clientScanId}-${photo.type}.jpg`, { type: 'image/jpeg' });
        
        const filePath = `scans/${userId}/${clientScanId}/${photo.type}.jpg`;
        const { data, error } = await supabase.storage
          .from('body-scans')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          throw new Error(`Upload failed for ${photo.type}: ${error.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('body-scans')
          .getPublicUrl(filePath);
        
        return {
          view: photo.type,
          url: publicUrl,
          report: photo.captureReport
        };
      } catch (error) {
        logger.error('SCAN_PROCESSING_SERVICE', `Failed to upload ${photo.type} photo`, { 
          clientScanId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    })
  );

  logger.info('SCAN_PROCESSING_SERVICE', 'Step 0: Photo upload completed', { 
    clientScanId,
    uploadedCount: uploadedPhotos.length,
    uploadedUrls: uploadedPhotos.map(p => ({ view: p.view, urlLength: p.url.length }))
  });

  return uploadedPhotos;
}

/**
 * Call scan-estimate Edge Function
 */
async function callScanEstimate(
  userId: string,
  uploadedPhotos: Array<{ view: string; url: string; report?: any }>,
  stableScanParams: { sex: 'male' | 'female'; height_cm: number; weight_kg: number },
  resolvedGender: 'masculine' | 'feminine', // MODIFIED: Type updated
  clientScanId: string
) {
  logger.info('SCAN_PROCESSING_SERVICE', 'Step 1: Starting scan-estimate', { 
    clientScanId,
    requestData: {
      userId,
      photosCount: uploadedPhotos.length,
      userMetrics: stableScanParams
    }
  });

  const estimateRequest = {
    user_id: userId,
    photos: uploadedPhotos,
    user_declared_height_cm: stableScanParams.height_cm,
    user_declared_weight_kg: stableScanParams.weight_kg,
    user_declared_gender: resolvedGender, // MODIFIED: Directly use resolvedGender
    clientScanId,
    resolvedGender
  };

  const estimateResult = await bodyScanRepo.estimate(estimateRequest);

  logger.info('SCAN_PROCESSING_SERVICE', 'Step 1: scan-estimate completed', {
    clientScanId,
    hasExtractedData: !!estimateResult.extracted_data,
    confidence: estimateResult.extracted_data?.processing_confidence,
    hasSkinTone: !!estimateResult.extracted_data?.skin_tone,
    measurementsKeys: estimateResult.extracted_data?.raw_measurements ? 
      Object.keys(estimateResult.extracted_data.raw_measurements) : []
  });

  return estimateResult;
}

/**
 * Call scan-semantic Edge Function
 */
async function callScanSemantic(
  userId: string,
  uploadedPhotos: Array<{ view: string; url: string; report?: any }>,
  estimateResult: any,
  resolvedGender: 'masculine' | 'feminine', // MODIFIED: Type updated
  clientScanId: string
) {
  logger.info('SCAN_PROCESSING_SERVICE', 'Step 2: Starting scan-semantic', { 
    clientScanId,
    requestData: {
      userId,
      hasExtractedData: !!estimateResult.extracted_data,
      estimatedBMI: estimateResult.extracted_data?.estimated_bmi
    }
  });

  const semanticRequest = {
    user_id: userId,
    photos: uploadedPhotos,
    extracted_data: estimateResult.extracted_data,
    user_declared_gender: resolvedGender, // MODIFIED: Directly use resolvedGender
    clientScanId,
    resolvedGender
  };

  const semanticResult = await bodyScanRepo.semantic(semanticRequest);

  logger.info('SCAN_PROCESSING_SERVICE', 'Step 2: scan-semantic completed', {
    clientScanId,
    hasSemanticProfile: !!semanticResult.semantic_profile,
    semanticConfidence: semanticResult.semantic_confidence,
    adjustmentsMade: semanticResult.adjustments_made?.length || 0,
    semanticClasses: semanticResult.semantic_profile ? {
      obesity: semanticResult.semantic_profile.obesity,
      muscularity: semanticResult.semantic_profile.muscularity,
      level: semanticResult.semantic_profile.level,
      morphotype: semanticResult.semantic_profile.morphotype
    } : null
  });

  return semanticResult;
}

/**
 * Call scan-match Edge Function
 */
async function callScanMatch(
  userId: string,
  estimateResult: any,
  semanticResult: any,
  resolvedGender: 'masculine' | 'feminine', // MODIFIED: Type updated
  clientScanId: string
) {
  logger.info('SCAN_PROCESSING_SERVICE', 'Step 3: Starting scan-match', { 
    clientScanId,
    userBMICalculated: estimateResult.extracted_data?.estimated_bmi,
    semanticClassificationForMatching: {
      obesity: semanticResult.semantic_profile?.obesity,
      muscularity: semanticResult.semantic_profile?.muscularity,
      level: semanticResult.semantic_profile?.level,
      morphotype: semanticResult.semantic_profile?.morphotype
    }
  });

  const matchRequest = {
    user_id: userId,
    extracted_data: estimateResult.extracted_data,
    semantic_profile: semanticResult.semantic_profile,
    user_semantic_indices: {
      morph_index: semanticResult.semantic_profile.morph_index || 0,
      muscle_index: semanticResult.semantic_profile.muscle_index || 0
    },
    matching_config: {
      gender: resolvedGender, // MODIFIED: Directly use resolvedGender
      limit: 5
    },
    clientScanId,
    resolvedGender
  };

  const matchResult = await bodyScanRepo.match(matchRequest);

  logger.info('SCAN_PROCESSING_SERVICE', 'Step 3: scan-match completed', {
    clientScanId,
    selectedArchetypesCount: matchResult.selected_archetypes?.length || 0,
    strategyUsed: matchResult.strategy_used,
    semanticCoherenceScore: matchResult.semantic_coherence_score
  });

  return matchResult;
}

/**
 * Perform AI morphological refinement
 */
async function performAIRefinement(
  matchResult: any,
  uploadedPhotos: Array<{ view: string; url: string; report?: any }>,
  estimateResult: any,
  semanticResult: any,
  stableScanParams: { sex: 'male' | 'female'; height_cm: number; weight_kg: number },
  resolvedGender: 'masculine' | 'feminine', // MODIFIED: Type updated
  clientScanId: string,
  userId: string // CRITICAL FIX: Add userId parameter
) {
  logger.aiRefinement('Starting AI morphological refinement', {
    scanId: clientScanId,
    resolvedGender,
    mappingVersion: 'v1.0',
    blendShapeParamsCount: Object.keys(matchResult.selected_archetypes?.[0]?.morph_values || {}).length,
    philosophy: 'ai_driven_photo_realistic_refinement'
  });

  // Extract photos for AI refinement
  const photosForAI = uploadedPhotos.map(photo => ({
    view: photo.view,
    url: photo.url,
    report: photo.report
  }));

  // Prepare blend data for AI refinement
  const blendShapeParams = matchResult.selected_archetypes?.[0]?.morph_values || {};
  const blendLimbMasses = matchResult.selected_archetypes?.[0]?.limb_masses || {};

  // Prepare user measurements for AI guidance
  const userMeasurements = {
    height_cm: stableScanParams.height_cm,
    weight_kg: stableScanParams.weight_kg,
    estimated_bmi: estimateResult.extracted_data?.estimated_bmi || (stableScanParams.weight_kg / Math.pow(stableScanParams.height_cm / 100, 2)),
    raw_measurements: {
      waist_cm: estimateResult.extracted_data?.raw_measurements?.waist_cm || 80,
      chest_cm: estimateResult.extracted_data?.raw_measurements?.chest_cm || 95,
      hips_cm: estimateResult.extracted_data?.raw_measurements?.hips_cm || 100
    }
  };

  let aiRefinementResult = null;
  try {
    aiRefinementResult = await bodyScanRepo.refine({
      scan_id: clientScanId,
      user_id: userId, // CRITICAL FIX: Use passed userId parameter
      resolvedGender: resolvedGender, // MODIFIED: Directly use resolvedGender
      photos: photosForAI,
      blend_shape_params: blendShapeParams,
      blend_limb_masses: blendLimbMasses,
      k5_envelope: matchResult.k5_envelope,
      vision_classification: semanticResult.semantic_profile,
      mapping_version: 'v1.0',
      user_measurements: userMeasurements
    });

    logger.aiRefinement('AI refinement completed successfully', {
      scanId: clientScanId,
      resolvedGender,
      aiRefine: aiRefinementResult.ai_refine,
      finalShapeParamsCount: Object.keys(aiRefinementResult.final_shape_params || {}).length,
      finalLimbMassesCount: Object.keys(aiRefinementResult.final_limb_masses || {}).length,
      clampedKeysCount: aiRefinementResult.clamped_keys?.length || 0,
      outOfRangeCount: aiRefinementResult.out_of_range_count || 0,
      activeKeysCount: aiRefinementResult.active_keys_count || 0,
      aiConfidence: aiRefinementResult.ai_confidence,
      topDeltas: aiRefinementResult.refinement_deltas?.top_10_shape_deltas?.slice(0, 3) || [],
      philosophy: 'ai_refinement_success'
    });

    // Enhance match result with AI refinement
    matchResult.ai_refinement = aiRefinementResult;
    matchResult.final_shape_params = aiRefinementResult.final_shape_params;
    matchResult.final_limb_masses = aiRefinementResult.final_limb_masses;

  } catch (aiError) {
    logger.aiRefinement('AI refinement failed, using blend fallback', {
      scanId: clientScanId,
      resolvedGender,
      error: aiError instanceof Error ? aiError.message : 'Unknown error',
      philosophy: 'ai_refinement_fallback'
    });

    // Continue with blend data if AI refinement fails
    matchResult.ai_refinement = {
      ai_refine: false,
      error: aiError instanceof Error ? aiError.message : 'Unknown error',
      fallback_used: true
    };
  }

  return matchResult;
}

/**
 * Call scan-commit Edge Function
 */
async function callScanCommit(
  userId: string,
  estimateResult: any,
  matchResult: any,
  semanticResult: any,
  capturedPhotos: CapturedPhotoEnhanced[],
  resolvedGender: 'masculine' | 'feminine', // MODIFIED: Type updated
  clientScanId: string
) {
  logger.info('SCAN_PROCESSING_SERVICE', 'Step 4: Starting scan-commit', { 
    clientScanId,
    requestData: {
      userId,
      hasEstimateResult: !!estimateResult,
      hasMatchResult: !!matchResult,
      hasSemanticResult: !!semanticResult,
      hasAIRefinement: !!matchResult.ai_refinement
    }
  });

  // CRITICAL: Extract final avatar data for persistence
  const finalShapeParams = matchResult.ai_refinement?.final_shape_params || 
                          matchResult.final_shape_params || 
                          matchResult.selected_archetypes?.[0]?.morph_values || {};
  const finalLimbMasses = matchResult.ai_refinement?.final_limb_masses || 
                         matchResult.final_limb_masses || 
                         matchResult.selected_archetypes?.[0]?.limb_masses || {};
  const skinTone = extractSkinToneFromScanData([], estimateResult, clientScanId);
  
  const commitRequest = {
    user_id: userId,
    resolvedGender,
    estimate_result: estimateResult,
    match_result: matchResult,
    morph_bounds: matchResult.morph_bounds,
    semantic_result: semanticResult,
    ai_refinement_result: matchResult.ai_refinement,
    validation_metadata: {},
    temporal_analysis: {},
    smoothing_metadata: {},
    visionfit_result: {},
    photos_metadata: capturedPhotos.map(photo => ({
      type: photo.type,
      captureReport: photo.captureReport
    })),
    // CRITICAL: Include complete avatar data for server persistence
    final_shape_params: finalShapeParams,
    final_limb_masses: finalLimbMasses,
    skin_tone: skinTone,
    resolved_gender: resolvedGender,
    mapping_version: 'v1.0',
    gltf_model_id: `${resolvedGender}_v4.13`,
    material_config_version: 'pbr-v2',
    avatar_version: 'v2.0',
    clientScanId
  };

  logger.info('SCAN_PROCESSING_SERVICE', 'Step 4: Complete avatar data prepared for commit', {
    clientScanId,
    finalShapeParamsCount: Object.keys(finalShapeParams).length,
    finalLimbMassesCount: Object.keys(finalLimbMasses).length,
    hasSkinTone: !!skinTone,
    skinToneRGB: skinTone ? `rgb(${skinTone.r}, ${skinTone.g}, ${skinTone.b})` : 'none',
    resolvedGender,
    philosophy: 'complete_avatar_data_for_server_persistence'
  });

  const commitResult = await bodyScanRepo.commit(commitRequest);

  logger.info('SCAN_PROCESSING_SERVICE', 'Step 4: scan-commit completed', {
    clientScanId,
    serverScanId: commitResult.scan_id,
    commitSuccess: !!commitResult.success,
    processingComplete: !!commitResult.processing_complete
  });

  return commitResult;
}

/**
 * Build complete scan results object
 */
function buildCompleteResults(
  estimateResult: any,
  semanticResult: any,
  matchResult: any,
  commitResult: any,
  uploadedPhotos: any[],
  stableScanParams: { sex: 'male' | 'female'; height_cm: number; weight_kg: number },
  resolvedGender: 'masculine' | 'feminine', // MODIFIED: Type updated
  clientScanId: string,
  userId: string
) {
  return {
    resolvedGender,
    estimate: estimateResult,
    semantic: semanticResult,
    match: matchResult,
    commit: commitResult,
    userId: userId, // CRITICAL FIX: Use actual userId, not sex
    serverScanId: commitResult.scan_id,
    userProfile: {
      ...stableScanParams,
      sex: resolvedGender
    },
    insights: generateInsights(estimateResult, semanticResult, matchResult),
    clientScanId,
    skin_tone: extractSkinToneFromScanData(uploadedPhotos, estimateResult, clientScanId),
    limb_masses: extractLimbMassesFromScanData(matchResult, estimateResult, clientScanId),
  };
}

/**
 * Generate insights from scan results
 */
function generateInsights(estimateResult: any, semanticResult: any, matchResult: any) {
  const insights = [];

  // Add confidence insight
  const confidence = estimateResult?.extracted_data?.processing_confidence || 0;
  if (confidence > 0.8) {
    insights.push({
      id: 'high-confidence',
      type: 'achievement',
      title: 'Analyse de Haute Qualité',
      description: `Votre scan a été analysé avec ${Math.round(confidence * 100)}% de confiance.`,
      category: 'morphology',
      priority: 'high',
      confidence: confidence,
      source: 'ai_analysis',
      color: '#22C55E'
    });
  }

  // Add archetype insight
  if (matchResult?.selected_archetypes?.length > 0) {
    const primaryArchetype = matchResult.selected_archetypes[0];
    insights.push({
      id: 'archetype-match',
      type: 'observation',
      title: 'Profil Morphologique',
      description: `Votre morphologie correspond au profil "${primaryArchetype.name}".`,
      category: 'morphology',
      priority: 'medium',
      confidence: 0.8,
      source: 'archetype',
      color: '#8B5CF6'
    });
  }

  // Add semantic insights
  if (semanticResult?.semantic_profile) {
    const semantic = semanticResult.semantic_profile;
    insights.push({
      id: 'semantic-classification',
      type: 'observation',
      title: 'Classification Morphologique',
      description: `Profil: ${semantic.obesity} • ${semantic.muscularity} • ${semantic.morphotype}`,
      category: 'morphology',
      priority: 'medium',
      confidence: semanticResult.semantic_confidence || 0.6,
      source: 'semantic',
      color: '#06B6D4'
    });
  }

  return {
    items: insights,
    source: 'generated',
    confidence: confidence || 0.8
  };
}

/**
 * Extract skin tone from scan data with detailed logging and fallback strategy
 */
function extractSkinToneFromScanData(
  uploadedPhotos: any[],
  estimateResult: any,
  clientScanId: string
): { r: number; g: number; b: number; confidence?: number } {
  logger.info('SKIN_TONE_EXTRACTION', 'Starting skin tone extraction from scan data', {
    clientScanId,
    uploadedPhotosCount: uploadedPhotos?.length || 0,
    hasEstimateResult: !!estimateResult,
    hasExtractedData: !!estimateResult?.extracted_data
  });

  // Priority 1: From photos capture reports (most reliable)
  for (const [index, photo] of (uploadedPhotos || []).entries()) {
    const skinTone = photo?.report?.skin_tone;
    if (skinTone && typeof skinTone === 'object' && 
        typeof skinTone.r === 'number' && typeof skinTone.g === 'number' && typeof skinTone.b === 'number') {
      logger.info('SKIN_TONE_EXTRACTION', 'Found skin tone from photo capture report', {
        clientScanId,
        photoIndex: index,
        photoView: photo?.view,
        skinTone: `rgb(${skinTone.r}, ${skinTone.g}, ${skinTone.b})`,
        confidence: skinTone.confidence || 'unknown',
        source: 'photo_capture_report'
      });
      return skinTone;
    }
  }

  // Priority 2: From estimate extracted_data
  const extractedSkinTone = estimateResult?.extracted_data?.skin_tone;
  if (extractedSkinTone && typeof extractedSkinTone === 'object' && 
      typeof extractedSkinTone.r === 'number' && typeof extractedSkinTone.g === 'number' && typeof extractedSkinTone.b === 'number') {
    logger.info('SKIN_TONE_EXTRACTION', 'Found skin tone from estimate extracted_data', {
      clientScanId,
      skinTone: `rgb(${extractedSkinTone.r}, ${extractedSkinTone.g}, ${extractedSkinTone.b})`,
      confidence: extractedSkinTone.confidence || 'unknown',
      source: 'estimate_extracted_data'
    });
    return extractedSkinTone;
  }

  // Fallback: Use neutral skin tone
  const fallbackSkinTone = { r: 153, g: 108, b: 78, confidence: 0.5 };
  logger.warn('SKIN_TONE_EXTRACTION', 'Using fallback skin tone', {
    clientScanId,
    fallbackSkinTone: `rgb(${fallbackSkinTone.r}, ${fallbackSkinTone.g}, ${fallbackSkinTone.b})`,
    reason: 'no_valid_skin_tone_found_in_scan_data',
    source: 'fallback'
  });

  return fallbackSkinTone;
}

/**
 * Extract limb masses from scan data with detailed logging and fallback strategy
 */
function extractLimbMassesFromScanData(
  matchResult: any,
  estimateResult: any,
  clientScanId: string
): Record<string, number> {
  logger.info('LIMB_MASSES_EXTRACTION', 'Starting limb masses extraction from scan data', {
    clientScanId,
    hasMatchResult: !!matchResult,
    hasEstimateResult: !!estimateResult,
    matchResultKeys: matchResult ? Object.keys(matchResult) : []
  });

  // Priority 1: From match result blended limb masses
  const blendedLimbMasses = matchResult?.blended_limb_masses || 
                           matchResult?.advanced_matching?.blending?.blended_limb_masses;

  if (blendedLimbMasses && typeof blendedLimbMasses === 'object' && Object.keys(blendedLimbMasses).length > 0) {
    logger.info('LIMB_MASSES_EXTRACTION', 'Found limb masses from match result blending', {
      clientScanId,
      limbMassesKeys: Object.keys(blendedLimbMasses),
      sampleValues: Object.entries(blendedLimbMasses).slice(0, 3).map(([k, v]) => ({ key: k, value: v })),
      source: 'match_result_blended'
    });
    return blendedLimbMasses;
  }

  // Priority 2: From selected archetypes (use primary archetype)
  const selectedArchetypes = matchResult?.selected_archetypes;
  if (selectedArchetypes && Array.isArray(selectedArchetypes) && selectedArchetypes.length > 0) {
    const primaryArchetype = selectedArchetypes[0];
    const archetypeLimbMasses = primaryArchetype?.limb_masses;

    if (archetypeLimbMasses && typeof archetypeLimbMasses === 'object' && Object.keys(archetypeLimbMasses).length > 0) {
      logger.info('LIMB_MASSES_EXTRACTION', 'Found limb masses from primary archetype', {
        clientScanId,
        archetypeId: primaryArchetype.id,
        archetypeName: primaryArchetype.name,
        limbMassesKeys: Object.keys(archetypeLimbMasses),
        sampleValues: Object.entries(archetypeLimbMasses).slice(0, 3).map(([k, v]) => ({ key: k, value: v })),
        source: 'primary_archetype'
      });
      return archetypeLimbMasses;
    }
  }

  // Fallback: Generate intelligent limb masses
  return generateIntelligentLimbMassesFallback(estimateResult, clientScanId);
}

/**
 * Generate intelligent limb masses fallback
 */
function generateIntelligentLimbMassesFallback(
  estimateResult: any,
  clientScanId: string
): Record<string, number> {
  const estimatedBMI = estimateResult?.extracted_data?.estimated_bmi || 22;
  const bodyFatPerc = estimateResult?.extracted_data?.estimated_body_fat_perc || 15;

  // Calculate BMI factor for limb mass variation
  const bmiFactor = Math.max(0.7, Math.min(1.4, estimatedBMI / 22));
  const fatFactor = Math.max(0.8, Math.min(1.3, bodyFatPerc / 15));

  // Generate varied limb masses based on anthropometric data
  const intelligentLimbMasses = {
    gate: 1.0,
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
