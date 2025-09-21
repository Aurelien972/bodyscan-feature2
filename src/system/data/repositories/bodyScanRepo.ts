// src/system/data/repositories/bodyScanRepo.ts
/**
 * Body Scan Repository - Supabase Implementation
 * Client-side interface for interacting with body scan Edge Functions
 */

import { supabase } from '../../supabase/client';
import logger from '../../../lib/utils/logger';

interface BodyScanEstimateRequest {
  photos: Array<{
    url: string;
    type: 'front' | 'side';
    captureReport: any;
  }>;
  user_declared_height_cm: number;
  user_declared_weight_kg: number;
  user_declared_gender: 'masculine' | 'feminine'; // MODIFIED: Type updated
  clientScanId?: string;
  resolvedGender?: 'masculine' | 'feminine'; // MODIFIED: Type updated
}

interface BodyScanMatchRequest {
  user_id: string;
  extracted_data: {
    estimated_bmi: number;
    raw_measurements: any;
  };
  semantic_profile: {
    obesity: string;
    muscularity: string;
    level: string;
    morphotype: string;
    validated_morph_values: any;
  };
  user_semantic_indices: {
    morph_index: number;
    muscle_index: number;
  };
  matching_config: {
    gender: 'masculine' | 'feminine';
    limit: number;
  };
  clientScanId?: string;
  resolvedGender?: 'masculine' | 'feminine'; // MODIFIED: Type updated
}

interface BodyScanCommitRequest {
  user_id: string;
  resolvedGender: 'masculine' | 'feminine'; // MODIFIED: Type updated
  user_profile: any;
  estimate_result: any;
  match_result: any;
  morph_bounds: any;
  semantic_result: any;
  validation_metadata: any;
  temporal_analysis: any;
  smoothing_metadata: any;
  visionfit_result: any;
  visionfit_version: string;
  visionfit_status: string;
  photos_metadata: any[];
  clientScanId?: string;
}

/**
 * Body Scan Repository Implementation
 */
export const bodyScanRepo = {
  /**
   * Call scan-estimate Edge Function
   */
  async estimate(request: BodyScanEstimateRequest) {
    logger.info('Calling scan-estimate edge function', {
      clientScanId: request.clientScanId,
      resolvedGender: request.resolvedGender, // PHASE 0: Log resolved gender
      userId: (request as any).user_id,
      photosCount: request.photos?.length || 0,
      userMetrics: {
        height_cm: request.user_declared_height_cm,
        weight_kg: request.user_declared_weight_kg,
        gender: request.user_declared_gender,
        resolvedGender: request.resolvedGender
      },
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase.functions.invoke('scan-estimate', {
      body: request
    });

    logger.info('Scan-estimate response received', {
      clientScanId: request.clientScanId,
      hasResponse: !!data,
      hasError: !!error,
      responseKeys: data ? Object.keys(data) : [],
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      logger.error('Scan-estimate failed', { 
        clientScanId: request.clientScanId,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Scan estimate failed: ${error.message}`);
    }

    logger.info('Scan-estimate completed successfully', {
      clientScanId: request.clientScanId,
      hasExtractedData: !!data?.extracted_data,
      confidence: data?.extracted_data?.processing_confidence,
      hasSkinTone: !!data?.extracted_data?.skin_tone,
      measurementsKeys: data.extracted_data?.raw_measurements ? 
        Object.keys(data.extracted_data.raw_measurements) : []
    });
    
    return data;
  },

  /**
   * Call scan-semantic Edge Function
   */
  async semantic(request: {
    clientScanId?: string;
    resolvedGender?: 'masculine' | 'feminine'; // MODIFIED: Type updated
    user_id: string;
    photos: Array<{ url: string; type: string }>;
    extracted_data: any;
    user_declared_gender: string;
  }) {
    logger.info('Calling scan-semantic edge function', {
      clientScanId: request.clientScanId,
      resolvedGender: request.resolvedGender, // PHASE 0: Log resolved gender
      userId: request.user_id,
      photosCount: request.photos?.length || 0,
      hasExtractedData: !!request.extracted_data,
      userGender: request.user_declared_gender,
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase.functions.invoke('scan-semantic', {
      body: request
    });

    logger.info('Scan-semantic response received', {
      clientScanId: request.clientScanId,
      hasResponse: !!data,
      hasError: !!error,
      responseKeys: data ? Object.keys(data) : [],
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      logger.error('Scan-semantic failed', { 
        clientScanId: request.clientScanId,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Scan semantic failed: ${error.message}`);
    }

    logger.info('Scan-semantic completed successfully', {
      clientScanId: request.clientScanId,
      hasSemanticProfile: !!data?.semantic_profile,
      semanticConfidence: data?.semantic_confidence,
      adjustmentsMade: data?.adjustments_made?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    return data;
  },

  /**
   * Call scan-match Edge Function
   */
  async match(request: BodyScanMatchRequest) {
    logger.info('Calling scan-match edge function', {
      clientScanId: request.clientScanId,
      resolvedGender: request.resolvedGender, // PHASE 0: Log resolved gender
      userId: request.user_id,
      hasExtractedData: !!request.extracted_data,
      hasSemanticProfile: !!request.semantic_profile,
      matchingConfig: request.matching_config,
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase.functions.invoke('scan-match', {
      body: request
    });

    logger.info('Scan-match response received', {
      gender: request.resolvedGender,
      clientScanId: request.clientScanId,
      hasResponse: !!data,
      hasError: !!error,
      responseKeys: data ? Object.keys(data) : [],
      errorMessage: error?.message,
      // Enhanced audit logging for BMI filtering
      auditData: data ? {
        selectedArchetypesCount: data.selected_archetypes?.length || 0,
        strategyUsed: data.strategy_used,
        semanticCoherenceScore: data.semantic_coherence_score,
        filteringStats: data.debug_phase_a?.filtering_stats,
        mappingMetadata: data.mapping_metadata,
        degradedMode: data.mapping_metadata?.fallback_used || false,
        bmiFilteringAnalysis: {
          userBMI: (request as any).extracted_data?.estimated_bmi,
          bmiRelaxationApplied: data.debug_phase_a?.filtering_stats?.bmiRelaxationApplied,
          totalArchetypesEvaluated: data.debug_phase_a?.filtering_stats?.totalArchetypes,
          afterBMIFilter: data.debug_phase_a?.filtering_stats?.afterBMIFilter,
          rejectedByBMI: data.debug_phase_a?.filtering_stats ? 
            data.debug_phase_a.filtering_stats.totalArchetypes - data.debug_phase_a.filtering_stats.afterBMIFilter : 
            'unknown'
        }
      } : null,
      timestamp: new Date().toISOString()
    });
    
    // Surface degraded mode information
    if (data?.mapping_metadata?.fallback_used) {
      logger.warn('Scan-match AUDIT: DEGRADED MODE detected', {
        clientScanId: request.clientScanId,
        mapping_source: data.mapping_metadata.mapping_source,
        fallback_reason: data.mapping_metadata.fallback_reason,
        impact: 'using_hardcoded_mapping_data',
        recommendation: 'check_database_connectivity',
        philosophy: 'degraded_mode_telemetry'
      });
    }
    
    if (error) {
      logger.error('Scan-match AUDIT: Function failed', { 
        clientScanId: request.clientScanId,
        userBMI: (request as any).extracted_data?.estimated_bmi,
        semanticProfile: (request as any).semantic_profile ? {
          obesity: (request as any).semantic_profile.obesity,
          muscularity: (request as any).semantic_profile.muscularity,
          morphotype: (request as any).semantic_profile.morphotype
        } : null,
        error: error.message || error,
        errorType: typeof error,
        possibleCauses: [
          'BMI filtering too restrictive',
          'Semantic classification mismatch',
          'Database connectivity issue',
          'Archetype coverage insufficient'
        ],
        timestamp: new Date().toISOString()
      });
      throw new Error(`Scan match failed: ${error.message}`);
    }

    logger.info('Scan-match AUDIT: Completed successfully', {
      clientScanId: request.clientScanId,
      userBMI: (request as any).extracted_data?.estimated_bmi,
      selectedArchetypesCount: data?.selected_archetypes?.length || 0,
      strategyUsed: data?.strategy_used,
      semanticCoherenceScore: data?.semantic_coherence_score,
      filteringStats: data?.debug_phase_a?.filtering_stats,
      mappingSource: data?.mapping_metadata?.mapping_source || 'unknown',
      degradedMode: data?.mapping_metadata?.fallback_used || false,
      bmiFilteringSuccess: {
        bmiRelaxationApplied: data?.debug_phase_a?.filtering_stats?.bmiRelaxationApplied,
        finalArchetypesFound: data?.selected_archetypes?.length || 0,
        primaryArchetype: data?.selected_archetypes?.[0] ? {
          id: data.selected_archetypes[0].id,
          bmiRange: data.selected_archetypes[0].bmi_range,
          obesity: data.selected_archetypes[0].obesity
        } : null
      },
      timestamp: new Date().toISOString()
    });
    
    return data;
  },

  /**
   * Call scan-refine-morphs Edge Function
   */
  async refine(request: {
    scan_id: string;
    user_id: string;
    resolvedGender: 'masculine' | 'feminine';
    photos: Array<{ view: string; url: string; report?: any }>;
    blend_shape_params: Record<string, number>;
    blend_limb_masses: Record<string, number>;
    mapping_version: string;
    k5_envelope?: {
      shape_params_envelope: Record<string, { min: number; max: number; archetype_min: number; archetype_max: number }>;
      limb_masses_envelope: Record<string, { min: number; max: number; archetype_min: number; archetype_max: number }>;
      envelope_metadata: any;
    };
    vision_classification?: {
      muscularity: string;
      obesity: string;
      morphotype: string;
      level: string;
    };
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
    // Filter out non-numeric properties from blend_limb_masses
    const filteredBlendLimbMasses: Record<string, number> = {};
    for (const [key, value] of Object.entries(request.blend_limb_masses)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        filteredBlendLimbMasses[key] = value;
      }
    }

    logger.info('Filtering blend_limb_masses for Edge Function', {
      scanId: request.scan_id,
      originalKeys: Object.keys(request.blend_limb_masses),
      filteredKeys: Object.keys(filteredBlendLimbMasses),
      removedKeys: Object.keys(request.blend_limb_masses).filter(key => !(key in filteredBlendLimbMasses)),
      hasUserMeasurements: !!request.user_measurements,
      philosophy: 'ai_refinement_data_filtering',
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase.functions.invoke('scan-refine-morphs', {
      body: {
        ...request,
        blend_limb_masses: filteredBlendLimbMasses,
        k5_envelope: request.k5_envelope,
        vision_classification: request.vision_classification,
        user_measurements: request.user_measurements
      }
    });

    logger.info('Scan-refine-morphs response received', {
      scanId: request.scan_id,
      hasResponse: !!data,
      hasError: !!error,
      responseKeys: data ? Object.keys(data) : [],
      errorMessage: error?.message,
      aiRefine: data?.ai_refine,
      finalShapeParamsCount: data?.final_shape_params ? Object.keys(data.final_shape_params).length : 0,
      finalLimbMassesCount: data?.final_limb_masses ? Object.keys(data.final_limb_masses).length : 0,
      // PHASE B: Enhanced response logging
      envelopeViolationsCount: data?.envelope_violations?.length || 0,
      dbViolationsCount: data?.db_violations?.length || 0,
      missingKeysAddedCount: data?.missing_keys_added?.length || 0,
      extraKeysRemovedCount: data?.extra_keys_removed?.length || 0,
      philosophy: 'phase_b_ai_refinement_response',
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      logger.error('Scan-refine-morphs failed', { 
        scanId: request.scan_id,
        error: error.message || error,
        philosophy: 'phase_b_ai_refinement_failed',
        timestamp: new Date().toISOString()
      });
      throw new Error(`AI morphological refinement failed: ${error.message}`);
    }

    logger.info('Scan-refine-morphs completed successfully', {
      scanId: request.scan_id,
      aiRefine: data.ai_refine,
      finalShapeParamsCount: Object.keys(data.final_shape_params || {}).length,
      finalLimbMassesCount: Object.keys(data.final_limb_masses || {}).length,
      clampedKeysCount: data.clamped_keys?.length || 0,
      envelopeViolationsCount: data.envelope_violations?.length || 0,
      dbViolationsCount: data.db_violations?.length || 0,
      outOfRangeCount: data.out_of_range_count || 0,
      missingKeysAddedCount: data.missing_keys_added?.length || 0,
      extraKeysRemovedCount: data.extra_keys_removed?.length || 0,
      activeKeysCount: data.active_keys_count || 0,
      aiConfidence: data.ai_confidence,
      mappingVersion: data.mapping_version,
      philosophy: 'phase_b_ai_refinement_success',
      timestamp: new Date().toISOString()
    });
    
    return data;
  },

  /**
   * Call scan-commit Edge Function
   */
  async commit(request: BodyScanCommitRequest) {
    logger.info('Calling scan-commit edge function', {
      clientScanId: request.clientScanId,
      resolvedGender: request.resolvedGender, // PHASE 0: Log resolved gender
      userId: request.user_id,
      hasEstimateResult: !!request.estimate_result,
      hasMatchResult: !!request.match_result,
      hasSemanticResult: !!request.semantic_result,
      hasAIRefinement: !!request.ai_refinement
    });
    
    const response = await supabase.functions.invoke('scan-commit', {
      body: request
    });

    logger.info('Scan-commit response received', {
      clientScanId: request.clientScanId,
      hasResponse: !!response,
      responseKeys: response ? Object.keys(response) : [],
      hasData: !!response?.data,
      hasError: !!response?.error,
      timestamp: new Date().toISOString()
    });
    
    // CRITICAL: Robust error handling for Supabase response
    if (!response) {
      logger.error('No response from scan-commit', {
        clientScanId: request.clientScanId
      });
      throw new Error('No response received from scan-commit function');
    }
    
    if (response.error) {
      const errorMessage = response.error?.message || response.error || 'Unknown commit error';
      logger.error('Scan-commit returned error', {
        clientScanId: request.clientScanId,
        error: response.error,
        errorMessage,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Scan commit failed: ${errorMessage}`);
    }

    if (!response.data) {
      logger.warn('Scan-commit returned no data', {
        clientScanId: request.clientScanId,
        response
      });
      // Return empty success response if no data but no error
      return { success: true, message: 'Commit completed without data' };
    }
    
    logger.info('Scan-commit completed successfully', {
      clientScanId: request.clientScanId,
      serverScanId: response.data.scan_id,
      commitSuccess: !!response.data.success,
      processingComplete: !!response.data.processing_complete
    });
    
    return response.data;
  },

  /**
   * Get latest body scan for user
   */
  async getLatest(userId: string) {
    const { data, error } = await supabase.functions.invoke('scan-latest', {
      method: 'GET',
      query: { user_id: userId }
    });

    if (error) {
      throw new Error(`Get latest scan failed: ${error.message}`);
    }

    return data;
  },

  /**
   * Get body scan history for user
   */
  async getHistory(userId: string, limit = 1000) { // MODIFIED: Augmenter la limite
    const { data, error } = await supabase
      .from('body_scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Get scan history failed: ${error.message}`);
    }

    return data;
  },

  /**
   * Get specific body scan by ID
   */
  async getById(scanId: string) {
    const { data, error } = await supabase
      .from('body_scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (error) {
      throw new Error(`Get scan by ID failed: ${error.message}`);
    }

    return data;
  }
};

