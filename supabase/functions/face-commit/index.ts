// supabase/functions/face-commit/index.ts
import { jsonResponse, corsHeaders } from './response.ts';
import { validateCommitRequest } from './requestValidator.ts';
import { storeFaceScanData } from './faceDataStorage.ts';
import { updateUserProfile } from './profileUpdater.ts';
import { toDbGender } from '../_shared/utils/toDbGender.ts'; // MODIFIED: Import toDbGender

/**
 * Face Commit Edge Function - Final Persistence
 * Stores complete face scan results with all metadata
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
    console.log('🔍 [face-commit] Generated scan ID', {
      scanId,
    });

    // Parse and validate request
    const requestData = await req.json();
    const validationError = validateCommitRequest(requestData);

    if (validationError) {
      console.error('❌ [face-commit] Request validation failed:', validationError);
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
      semantic_result,
      match_result,
      refine_result,
      photos_metadata,
      resolvedGender,
      skin_tone,
      clientScanId,
    } = requestData;

    // Check if this is a mock user ID in development
    const isMockUser = user_id === '00000000-0000-0000-0000-000000000001';
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';

    if (isMockUser && !isProduction) {
      console.log('🔧 [face-commit] Mock user detected in development - bypassing database operations');
      return jsonResponse({
        success: true,
        scan_id: scanId,
        processing_complete: true,
        mock_mode: true,
      });
    }

    console.log('📥 [face-commit] Request received - detailed data audit', {
      user_id,
      resolvedGender,
      hasEstimateResult: !!estimate_result,
      hasSemanticResult: !!semantic_result,
      hasMatchResult: !!match_result,
      hasRefineResult: !!refine_result,
      photosCount: photos_metadata?.length || 0,
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [face-commit] Missing Supabase configuration:', {
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

    console.log('✅ [face-commit] Service client initialized', {
      clientType: 'service_role',
      philosophy: 'rls_bypass_controlled_access'
    });

    // Store face scan data in user_face_profiles
    const faceScanRecord = await storeFaceScanData(supabase, scanId, {
      user_id,
      estimate_result,
      semantic_result,
      match_result,
      refine_result,
      photos_metadata,
      resolvedGender: toDbGender(resolvedGender), // MODIFIED: Convert to DB gender enum
      skin_tone,
      clientScanId,
    });

    // Update user profile's active_face_profile_id and preferences
    await updateUserProfile(supabase, user_id, faceScanRecord.id, refine_result, estimate_result, skin_tone);

    console.log('✅ [face-commit] Face scan committed successfully and user profile updated', {
      scanId: faceScanRecord.id,
      userId: user_id,
    });

    return jsonResponse({
      success: true,
      scan_id: faceScanRecord.id,
      processing_complete: true,
    });
  } catch (error) {
    console.error('❌ [face-commit] Commit failed:', error);
    return jsonResponse(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

