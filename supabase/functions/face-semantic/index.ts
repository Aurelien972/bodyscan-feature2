import { corsHeaders, jsonResponse } from './response.ts';
import { validateFaceSemanticRequest } from './requestValidator.ts';
import { analyzePhotosForFaceSemantics } from './faceSemanticAnalyzer.ts';
import { validateFaceSemanticWithDB } from './dbFaceSemanticValidator.ts';
import { createFallbackFaceSemanticAnalysis } from './faceSemanticFallback.ts';
import { toDbGender } from '../_shared/utils/toDbGender.ts'; // Import correct du fichier partagé

/**
 * Face Semantic Edge Function - DB-First Architecture
 * Generates facial semantic profile and validates against DB classification rules
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({
      error: "Method not allowed"
    }, 405);
  }

  try {
    // Parse and validate request
    const requestData = await req.json();
    const validationError = validateFaceSemanticRequest(requestData);

    if (validationError) {
      console.error('❌ [face-semantic] Request validation failed:', validationError);
      return jsonResponse({
        error: validationError
      }, 400);
    }

    const { user_id, photos, user_declared_gender } = requestData;

    console.log('📥 [face-semantic] Request received:', {
      user_id,
      photosCount: photos?.length,
      userGender: user_declared_gender,
    });

    // Initialize Supabase client for DB validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [face-semantic] Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        urlPreview: supabaseUrl?.substring(0, 30) + '...' || 'missing',
        serviceKeyPreview: supabaseServiceKey ? 'eyJ...' + supabaseServiceKey.slice(-10) : 'missing'
      });
      return jsonResponse({
        error: "Supabase configuration missing"
      }, 500);
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2.54.0');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ [face-semantic] Service client initialized', {
      clientType: 'service_role',
      philosophy: 'rls_bypass_controlled_access'
    });

    const frontPhoto = photos.find(p => p.view === 'front');
    const profilePhoto = photos.find(p => p.view === 'profile');

    if (!frontPhoto || !profilePhoto) {
      console.error('❌ [face-semantic] Missing front or profile photo');
      return jsonResponse({
        error: "Both front and profile photos required"
      }, 400);
    }

    console.log('🔍 [face-semantic] Starting facial semantic analysis with DB validation');

    // Step 1: AI Semantic Analysis
    let rawSemanticProfile;
    let aiAnalysisSuccess = false;

    try {
      rawSemanticProfile = await analyzePhotosForFaceSemantics(
        frontPhoto.url,
        profilePhoto.url,
        {
          gender: user_declared_gender,
          frontReport: frontPhoto.report,
          profileReport: profilePhoto.report
        }
      );
      aiAnalysisSuccess = true;

      console.log('✅ [face-semantic] AI facial semantic analysis complete:', {
        face_shape: rawSemanticProfile.face_shape,
        eye_shape: rawSemanticProfile.eye_shape,
        nose_type: rawSemanticProfile.nose_type,
        lip_fullness: rawSemanticProfile.lip_fullness,
        confidence: rawSemanticProfile.confidence?.semantic
      });

    } catch (semanticError) {
      console.warn('⚠️ [face-semantic] AI facial semantic analysis failed, using fallback:', semanticError);
      rawSemanticProfile = createFallbackFaceSemanticAnalysis({
        gender: user_declared_gender,
        frontReport: frontPhoto.report,
        profileReport: profilePhoto.report
      });
    }

    // Step 2: DB-First Classification Validation
    console.log('🔍 [face-semantic] Validating facial semantic profile against DB classification rules');
    // MODIFIED: Ensure userDbGender is correctly derived from user_declared_gender
    const userDbGenderNormalized = toDbGender(user_declared_gender);
    const { validatedProfile, validationFlags, adjustmentsMade } = await validateFaceSemanticWithDB(
      supabase,
      rawSemanticProfile,
      userDbGenderNormalized // Use the normalized DB gender
    );

    console.log('✅ [face-semantic] DB validation results:', {
      validatedProfile: {
        face_shape: validatedProfile.face_shape,
        eye_shape: validatedProfile.eye_shape,
        nose_type: validatedProfile.nose_type,
        lip_fullness: validatedProfile.lip_fullness
      },
      validationFlags: validationFlags.length,
      adjustmentsMade: adjustmentsMade.length
    });

    // Step 3: Calculate final confidence
    let finalConfidence = rawSemanticProfile.confidence?.semantic || 0.5;

    // Reduce confidence based on adjustments made
    if (adjustmentsMade.length > 0) {
      const adjustmentPenalty = Math.min(0.3, adjustmentsMade.length * 0.1);
      finalConfidence = Math.max(0.1, finalConfidence - adjustmentPenalty);
    }

    // Reduce confidence if fallback was used
    if (!aiAnalysisSuccess) {
      finalConfidence = Math.max(0.1, finalConfidence * 0.6);
    }

    const response = {
      semantic_profile: validatedProfile,
      raw_semantic_profile: rawSemanticProfile,
      semantic_confidence: finalConfidence,
      semantic_validation_flags: validationFlags,
      adjustments_made: adjustmentsMade,
      ai_analysis_success: aiAnalysisSuccess,
      fallback_reason: aiAnalysisSuccess ? null : 'ai_semantic_analysis_failed'
    };

    console.log('✅ [face-semantic] Facial semantic analysis completed successfully', {
      validatedProfile: {
        face_shape: validatedProfile.face_shape,
        eye_shape: validatedProfile.eye_shape,
        nose_type: validatedProfile.nose_type,
        lip_fullness: validatedProfile.lip_fullness
      },
      finalConfidence: finalConfidence.toFixed(3),
      validationFlags: validationFlags.length,
      adjustmentsMade: adjustmentsMade.length,
      aiSuccess: aiAnalysisSuccess
    });

    return jsonResponse(response);

  } catch (error) {
    console.error('❌ [face-semantic] Facial semantic analysis failed:', error);
    return jsonResponse({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
