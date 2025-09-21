import { corsHeaders, jsonResponse } from './response.ts';
import { validateFaceMatchRequest } from './requestValidator.ts';
import { toDbGender } from '../_shared/utils/toDbGender.ts'; // MODIFIED: Import toDbGender

/**
 * Face Match Edge Function - DB-First Architecture
 * Finds K=5 closest face archetypes and builds envelope
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
    const validationError = validateFaceMatchRequest(requestData);

    if (validationError) {
      console.error('❌ [face-match] Request validation failed:', validationError);
      return jsonResponse({
        error: validationError
      }, 400);
    }

    const { user_id, face_semantic_profile } = requestData;

    console.log('📥 [face-match] Request received:', {
      user_id,
      profile: {
        face_shape: face_semantic_profile.face_shape,
        eye_shape: face_semantic_profile.eye_shape,
        nose_type: face_semantic_profile.nose_type,
        lip_full_ness: face_semantic_profile.lip_fullness, // Corrected typo
        gender: face_semantic_profile.gender // Log the gender received
      }
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [face-match] Missing Supabase configuration');
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

    console.log('✅ [face-match] Service client initialized', {
      clientType: 'service_role',
      philosophy: 'rls_bypass_controlled_access'
    });

    // Step 1: Find K=5 closest face archetypes using RPC
    console.log('🔍 [face-match] Finding K=5 closest face archetypes');
    
    // MODIFIED: Ensure gender is correctly converted to DB enum
    const dbGender = toDbGender(face_semantic_profile.gender || 'male'); 
    console.log(`🔍 [face-match] Using DB gender for RPC: ${dbGender}`);

    const { data: topArchetypes, error: matchError } = await supabase.rpc('face_match_top5', {
      p_gender: dbGender, 
      p_face_shape: face_semantic_profile.face_shape,
      p_eye_shape: face_semantic_profile.eye_shape,
      p_nose_type: face_semantic_profile.nose_type,
      p_lip_fullness: face_semantic_profile.lip_fullness
    });

    if (matchError) {
      console.error('❌ [face-match] Face archetype matching failed:', matchError);
      return jsonResponse({
        error: "Face archetype matching failed",
        details: matchError.message
      }, 500);
    }

    if (!topArchetypes || topArchetypes.length === 0) {
      console.error('❌ [face-match] No matching face archetypes found');
      return jsonResponse({
        error: "No matching face archetypes found"
      }, 404);
    }

    // MODIFIED: Fetch face_values for each archetype
    const archetypeIds = topArchetypes.map((a: any) => a.id);
    const { data: fullArchetypes, error: fullArchetypesError } = await supabase
      .from('face_archetypes')
      .select('id, name, face_values')
      .in('id', archetypeIds);

    if (fullArchetypesError) {
      console.error('❌ [face-match] Failed to fetch full archetype data:', fullArchetypesError);
      return jsonResponse({
        error: "Failed to fetch full archetype data",
        details: fullArchetypesError.message
      }, 500);
    }

    const fullArchetypesMap = new Map(fullArchetypes.map(a => [a.id, a]));

    const processedArchetypes = topArchetypes.map((a: any) => {
      const fullData = fullArchetypesMap.get(a.id);
      return {
        id: a.id,
        name: a.name,
        score: typeof a.match_score === 'number' ? a.match_score : 0.0,
        face_values: fullData ? fullData.face_values : {} // Include face_values
      };
    });

    console.log('✅ [face-match] Found matching archetypes:', {
      count: processedArchetypes.length,
      archetypes: processedArchetypes.map((a: any) => ({
        id: a.id,
        name: a.name,
        score: a.score,
        hasFaceValues: Object.keys(a.face_values || {}).length > 0 // Log if face_values are present
      }))
    });

    // Step 2: Build K=5 envelope using RPC
    console.log('🔍 [face-match] Building K=5 envelope');
    
    // Use archetypeIds from the RPC result, not the fullArchetypes
    const { data: k5Envelope, error: envelopeError } = await supabase.rpc('face_k5_envelope', {
      p_ids: archetypeIds
    });

    if (envelopeError) {
      console.error('❌ [face-match] K-5 envelope construction failed:', envelopeError);
      return jsonResponse({
        error: "K-5 envelope construction failed",
        details: envelopeError.message
      }, 500);
    }

    // MODIFIED: Add robustness for k5Envelope structure
    const finalK5Envelope = k5Envelope || { shape_params_envelope: {}, limb_masses_envelope: {}, envelope_metadata: {} };

    console.log('✅ [face-match] K-5 envelope constructed:', {
      shapeParamsEnvelopeKeys: Object.keys(finalK5Envelope.shape_params_envelope || {}).length,
      limbMassesEnvelopeKeys: Object.keys(finalK5Envelope.limb_masses_envelope || {}).length,
      envelopeMetadata: finalK5Envelope.envelope_metadata || {}
    });

    const response = {
      selected_archetypes: processedArchetypes, // Use processed archetypes with face_values
      k5_envelope: finalK5Envelope,
      matching_stats: {
        total_archetypes_found: processedArchetypes.length,
        best_match_score: processedArchetypes[0]?.score || 0,
        worst_match_score: processedArchetypes[processedArchetypes.length - 1]?.score || 0,
        envelope_morph_keys: Object.keys(finalK5Envelope.shape_params_envelope || {}).length + Object.keys(finalK5Envelope.limb_masses_envelope || {}).length
      }
    };

    console.log('✅ [face-match] Face matching completed successfully', {
      selectedArchetypes: processedArchetypes.length,
      envelopeKeys: Object.keys(finalK5Envelope.shape_params_envelope || {}).length + Object.keys(finalK5Envelope.limb_masses_envelope || {}).length,
      bestScore: processedArchetypes[0]?.score
    });

    return jsonResponse(response);

  } catch (error) {
    console.error('❌ [face-match] Face matching failed:', error);
    return jsonResponse({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
