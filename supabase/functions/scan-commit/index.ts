import { jsonResponse, corsHeaders } from './response.ts';
import { validateCommitRequest } from './requestValidator.ts';
import { storeBodyScanData } from './scanDataStorage.ts';
import { updateUserProfile } from './profileUpdater.ts';

/**
 * Scan Commit Edge Function - Final Persistence
 * Stores complete scan results with all metadata
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405
    );
  }

  try {
    // Generate unique scan ID first
    const scanId = crypto.randomUUID();
    console.log('🔍 [scan-commit] Generated scan ID', {
      scanId,
    });

    // Parse and validate request
    const requestData = await req.json();
    const validationError = validateCommitRequest(requestData);

    if (validationError) {
      console.error('❌ [scan-commit] Request validation failed:', validationError);
      return jsonResponse(
        {
          error: validationError,
        },
        400
      );
    }

    const {
      user_id,
      estimate_result,
      match_result,
      morph_bounds,
      semantic_result,
      validation_metadata,
      temporal_analysis,
      smoothing_metadata,
      visionfit_result,
      photos_metadata,
      // Extract new fields from requestData
      final_shape_params,
      final_limb_masses,
      skin_tone,
      resolved_gender,
      mapping_version,
      gltf_model_id,
      material_config_version,
      avatar_version,
    } = requestData;

    // Check if this is a mock user ID in development
    const isMockUser = user_id === '00000000-0000-0000-0000-000000000001';
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';

    if (isMockUser && !isProduction) {
      console.log('🔧 [scan-commit] Mock user detected in development - bypassing database operations');
      return jsonResponse({
        success: true,
        scan_id: scanId,
        processing_complete: true,
        mock_mode: true,
      });
    }

    console.log('📥 [scan-commit] Request received - detailed data audit', {
      user_id,
      hasEstimateResult: !!estimate_result,
      estimateResultKeys: estimate_result ? Object.keys(estimate_result) : [],
      estimateResultShapeParams: estimate_result?.shape_params ? Object.keys(estimate_result.shape_params) : [],
      estimateResultLimbMasses: estimate_result?.limb_masses ? Object.keys(estimate_result.limb_masses) : [],
      hasMatchResult: !!match_result,
      matchResultKeys: match_result ? Object.keys(match_result) : [],
      matchResultBlendedShapeParams: match_result?.blended_shape_params ? Object.keys(match_result.blended_shape_params) : [],
      matchResultBlendedLimbMasses: match_result?.blended_limb_masses ? Object.keys(match_result.blended_limb_masses) : [],
      hasMorphBounds: !!morph_bounds,
      morphBoundsCount: Object.keys(morph_bounds || {}).length,
      morphBoundsKeys: morph_bounds ? Object.keys(morph_bounds) : [],
      hasSemanticResult: !!semantic_result,
      photosCount: photos_metadata?.length || 0,
      // Log new fields
      hasFinalShapeParams: !!final_shape_params,
      hasFinalLimbMasses: !!final_limb_masses,
      hasSkinTone: !!skin_tone,
      resolvedGender: resolved_gender,
      mappingVersion: mapping_version,
      gltfModelId: gltf_model_id,
      materialConfigVersion: material_config_version,
      avatarVersion: avatar_version,
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [scan-commit] Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        urlPreview: supabaseUrl?.substring(0, 30) + '...' || 'missing',
        serviceKeyPreview: supabaseServiceKey ? 'eyJ...' + supabaseServiceKey.slice(-10) : 'missing',
      });
      return jsonResponse(
        {
          error: "Supabase configuration missing",
        },
        500
      );
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2.54.0');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('✅ [scan-commit] Service client initialized', {
      clientType: 'service_role',
      philosophy: 'rls_bypass_controlled_access',
    });

    // Store body scan data with complete metadata
    const scanData = await storeBodyScanData(supabase, scanId, {
      user_id,
      estimate_result,
      match_result,
      morph_bounds,
      semantic_result,
      validation_metadata,
      temporal_analysis,
      smoothing_metadata,
      visionfit_result,
      photos_metadata,
      // Pass new fields to storeBodyScanData
      final_shape_params,
      final_limb_masses,
      skin_tone,
      resolved_gender,
      mapping_version,
      gltf_model_id,
      material_config_version,
      avatar_version,
    });

    // Update user profile if needed
    await updateUserProfile(
      supabase,
      user_id,
      estimate_result,
      match_result,
      semantic_result,
      { // Pass AI refinement result if available, otherwise an empty object
        ai_refine: match_result?.ai_refinement?.ai_refine || false,
        final_shape_params: final_shape_params,
        final_limb_masses: final_limb_masses,
        ai_confidence: match_result?.ai_refinement?.ai_confidence,
        clamped_keys: match_result?.ai_refinement?.clamped_keys,
        envelope_violations: match_result?.ai_refinement?.envelope_violations,
        db_violations: match_result?.ai_refinement?.db_violations,
        gender_violations: match_result?.ai_refinement?.gender_violations,
        out_of_range_count: match_result?.ai_refinement?.out_of_range_count,
        missing_keys_added: match_result?.ai_refinement?.missing_keys_added,
        extra_keys_removed: match_result?.ai_refinement?.extra_keys_removed,
        active_keys_count: match_result?.ai_refinement?.active_keys_count,
        refinement_deltas: match_result?.ai_refinement?.refinement_deltas,
      },
      resolved_gender,
      final_shape_params,
      final_limb_masses,
      skin_tone,
      gltf_model_id,
      material_config_version,
      avatar_version
    );

    console.log('✅ [scan-commit] Scan committed successfully with morph_bounds', {
      scanId: scanData.id,
      hasMorphBounds: !!morph_bounds,
      morphBoundsCount: Object.keys(morph_bounds || {}).length,
    });

    return jsonResponse({
      success: true,
      scan_id: scanData.id,
      processing_complete: true,
    });
  } catch (error) {
    console.error('❌ [scan-commit] Commit failed:', error);
    return jsonResponse(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
