import { corsHeaders, jsonResponse } from './response.ts';
import { validateEstimateRequest } from './requestValidator.ts';
import { analyzePhotosWithVision } from './visionAnalyzer.ts';
import { createFallbackEstimation } from './estimationFallback.ts';
import { enhanceMeasurements } from './measurementEnhancer.ts';
import { validateWithDatabase } from './databaseValidator.ts';
/**
 * Scan Estimate Edge Function - DB-First Architecture
 * Handles photo analysis and measurement extraction with DB validation
 */ Deno.serve(async (req)=>{
  const requestStartTime = performance.now();
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // Log 1: Function Entry & Request Method Check
  console.log(`📥 [scan-estimate] [${traceId}] Function invoked. Method: ${req.method}`);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`🔍 [scan-estimate] [${traceId}] Handling OPTIONS request.`);
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  if (req.method !== "POST") {
    console.error(`❌ [scan-estimate] [${traceId}] Method not allowed: ${req.method}.`);
    return jsonResponse({
      error: "Method not allowed"
    }, 405);
  }
  try {
    // Log 2: Parse and Validate Request Data
    const requestData = await req.json();
    const validationError = validateEstimateRequest(requestData);
    if (validationError) {
      console.error(`❌ [scan-estimate] [${traceId}] Request validation failed: ${validationError}. Request data: ${JSON.stringify(requestData)}.`, {
        validationError
      });
      return jsonResponse({
        error: validationError
      }, 400);
    }
    const { user_id, photos, user_declared_height_cm, user_declared_weight_kg, user_declared_gender } = requestData;
    console.log(`📥 [scan-estimate] [${traceId}] Request received and validated.`, {
      user_id,
      photosCount: photos?.length,
      userMetrics: {
        height_cm: user_declared_height_cm,
        weight_kg: user_declared_weight_kg,
        gender: user_declared_gender
      },
      traceId,
      requestStartTime
    });
    // Log 3: Supabase Client Initialization
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [scan-estimate] Missing Supabase configuration:', {
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
    console.log('✅ [scan-estimate] Service client initialized', {
      clientType: 'service_role',
      philosophy: 'rls_bypass_controlled_access'
    });
    // Log 4: Photo Extraction & Availability Check
    const frontPhoto = photos.find((p)=>p.view === 'front');
    const profilePhoto = photos.find((p)=>p.view === 'profile');
    console.log('🔍 [scan-estimate] Photo availability and structure analysis:', {
      totalPhotos: photos.length,
      photosStructure: photos.map((p)=>({
          view: p.view,
          hasUrl: !!p.url,
          urlLength: p.url?.length,
          hasReport: !!p.report,
          reportKeys: p.report ? Object.keys(p.report) : [],
          reportStructure: p.report ? {
            hasQuality: !!p.report.quality,
            hasContent: !!p.report.content,
            hasScale: !!p.report.scale,
            qualityKeys: p.report.quality ? Object.keys(p.report.quality) : [],
            contentKeys: p.report.content ? Object.keys(p.report.content) : []
          } : null
        })),
      frontPhotoFound: !!frontPhoto,
      profilePhotoFound: !!profilePhoto,
      frontPhotoHasReport: !!frontPhoto?.report,
      profilePhotoHasReport: !!profilePhoto?.report
    });
    if (!frontPhoto && !profilePhoto) {
      console.error(`❌ [scan-estimate] [${traceId}] At least one photo (front or profile) is required.`);
      return jsonResponse({
        error: "At least one photo (front or profile) is required"
      }, 400);
    }
    // Log 5: Photo Quality Assessment
    const photo_quality_score = calculatePhotoQualityScore(frontPhoto?.report, profilePhoto?.report);
    console.log('🔍 [scan-estimate] Photo quality assessment:', {
      frontQuality: frontPhoto?.report?.quality || 'missing_report',
      profileQuality: profilePhoto?.report?.quality || 'missing_report',
      aggregatedScore: photo_quality_score,
      frontPhotoExists: !!frontPhoto,
      profilePhotoExists: !!profilePhoto,
      frontReportExists: !!frontPhoto?.report,
      profileReportExists: !!profilePhoto?.report,
      photoCompatibilityCheck: {
        frontPhotoUrl: frontPhoto?.url ? {
          isPublicUrl: frontPhoto.url.includes('supabase.co/storage'),
          urlLength: frontPhoto.url.length,
          urlPreview: frontPhoto.url.substring(0, 100) + '...'
        } : null,
        profilePhotoUrl: profilePhoto?.url ? {
          isPublicUrl: profilePhoto.url.includes('supabase.co/storage'),
          urlLength: profilePhoto.url.length,
          urlPreview: profilePhoto.url.substring(0, 100) + '...'
        } : null
      }
    });
    let extractionResult;
    let fallbackUsed = false;
    let fallbackReason = null;
    // Log 6: OpenAI Vision Analysis Call
    try {
      console.log(`🔍 [scan-estimate] [${traceId}] Starting OpenAI Vision analysis with enhanced diagnostics.`, {
        frontPhotoUrl: frontPhoto?.url,
        profilePhotoUrl: profilePhoto?.url,
        photosAccessible: 'checking_accessibility',
        userContext: {
          height_cm: user_declared_height_cm,
          weight_kg: user_declared_weight_kg,
          gender: user_declared_gender
        }
      });
      extractionResult = await analyzePhotosWithVision(frontPhoto?.url || null, profilePhoto?.url || null, {
        height_cm: user_declared_height_cm,
        weight_kg: user_declared_weight_kg,
        gender: user_declared_gender,
        frontReport: frontPhoto?.report || null,
        profileReport: profilePhoto?.report || null,
        traceId
      });
      console.log(`✅ [scan-estimate] [${traceId}] OpenAI Vision analysis successful.`);
      // Log 6.1: CRITICAL - Full extractionResult from OpenAI
      console.log(`✅ [scan-estimate] [${traceId}] Full extractionResult from OpenAI Vision: ${JSON.stringify(extractionResult, null, 2)}`);
    } catch (visionError) {
      const errorMessage = visionError instanceof Error ? visionError.message : String(visionError);
      const isTimeoutError = errorMessage.includes('Timeout') || errorMessage.includes('timeout');
      const isFormatError = errorMessage.includes('format') || errorMessage.includes('Format');
      const isAccessError = errorMessage.includes('invalid_image_url') || errorMessage.includes('download');
      console.warn(`⚠️ [scan-estimate] [${traceId}] OpenAI Vision failed with detailed error analysis:`, {
        error: errorMessage,
        errorType: visionError instanceof Error ? visionError.name : typeof visionError,
        errorCategories: {
          isTimeoutError,
          isFormatError,
          isAccessError
        },
        photosContext: {
          frontPhotoUrl: frontPhoto?.url,
          profilePhotoUrl: profilePhoto?.url,
          frontPhotoSize: frontPhoto?.report ? 'has_report' : 'no_report',
          profilePhotoSize: profilePhoto?.report ? 'has_report' : 'no_report'
        },
        fallbackStrategy: 'applying_enhanced_fallback'
      });
      // Log 6.2: Fallback Strategy Determination
      const fallbackStrategy = await determineFallbackStrategy(supabase, user_id, user_declared_gender);
      extractionResult = await createFallbackEstimation({
        height_cm: user_declared_height_cm,
        weight_kg: user_declared_weight_kg,
        gender: user_declared_gender,
        frontReport: frontPhoto.report,
        profileReport: profilePhoto.report,
        fallbackStrategy
      });
      fallbackUsed = true;
      fallbackReason = isTimeoutError ? 'openai_timeout_error' : isFormatError ? 'openai_format_error' : isAccessError ? 'openai_access_error' : 'openai_general_error';
      console.log(`🔍 [scan-estimate] [${traceId}] Fallback estimation applied:`, {
        strategy: fallbackStrategy.type,
        confidence: extractionResult.confidence,
        fallbackReason,
        originalError: errorMessage,
        traceId
      });
    }
    // Log 7: Calculate Estimated BMI
    const estimated_bmi = calculateEstimatedBMI(extractionResult.measurements, user_declared_height_cm, user_declared_weight_kg);
    console.log(`🔍 [scan-estimate] [${traceId}] Estimated BMI calculated: ${estimated_bmi.toFixed(2)}.`);
    // Log 8: Enhance Measurements Call
    console.log(`🔍 [scan-estimate] [${traceId}] Measurements before enhancement: ${JSON.stringify(extractionResult.measurements, null, 2)}`);
    const enhancedMeasurements = enhanceMeasurements(extractionResult.measurements, {
      height_cm: user_declared_height_cm,
      weight_kg: user_declared_weight_kg,
      gender: user_declared_gender
    });
    console.log(`✅ [scan-estimate] [${traceId}] Measurements after enhancement: ${JSON.stringify(enhancedMeasurements, null, 2)}`);
    // Log 9: Validate Measurements with Database
    console.log(`🔍 [scan-estimate] [${traceId}] Starting DB-first validation for measurements.`);
    const bmiValidation = await validateWithDatabase(supabase, {
      estimated_bmi,
      raw_measurements: enhancedMeasurements,
      user_declared_height_cm,
      user_declared_weight_kg,
      user_declared_gender
    });
    console.log(`✅ [scan-estimate] [${traceId}] DB validation completed: ${JSON.stringify(bmiValidation, null, 2)}.`);
    // Log 10: Prepare Final Response
    const response = {
      extracted_data: {
        raw_measurements: enhancedMeasurements,
        estimated_bmi,
        processing_confidence: extractionResult.confidence.vision,
        photo_quality_score,
        skin_tone: extractSkinToneFromPhotos(photos) || extractionResult.skin_tone,
        skin_tone_analysis: extractionResult.skin_tone_analysis,
        keypoints: extractionResult.keypoints,
        scale_method: extractionResult.scale_method,
        pixel_per_cm: extractionResult.pixel_per_cm,
        fallback_used: fallbackUsed,
        fallback_reason: fallbackReason,
        bmi_validation: bmiValidation
      },
      photos_metadata: photos,
      diagnostics: {
        photo_quality: {
          front: {
            blur_score: frontPhoto.report.quality.blur_score,
            brightness: frontPhoto.report.quality.brightness,
            pose_quality: extractionResult.quality_assessment?.pose_quality || 0.8
          },
          profile: {
            blur_score: profilePhoto.report.quality.blur_score,
            brightness: profilePhoto.report.quality.brightness,
            pose_quality: extractionResult.quality_assessment?.pose_quality || 0.8
          }
        },
        processing_notes: extractionResult.processing_notes || [],
        bmi_validation_flags: bmiValidation.flags || []
      }
    };
    const processingTime = performance.now() - requestStartTime;
    console.log(`✅ [scan-estimate] [${traceId}] Estimation completed successfully. Final response: ${JSON.stringify(response, null, 2)}`, {
      processingTimeMs: processingTime.toFixed(2),
      traceId
    });
    return jsonResponse(response);
  } catch (error) {
    // Log 11: Error Handling
    const processingTime = performance.now() - requestStartTime;
    console.error(`❌ [scan-estimate] [${traceId}] Estimation failed unexpectedly:`, error, {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : "No stack available",
      processingTimeMs: processingTime.toFixed(2),
      traceId
    });
    return jsonResponse({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      traceId
    }, 500);
  }
});
/**
 * Calculate aggregated photo quality score
 */ function calculatePhotoQualityScore(frontReport, profileReport) {
  const defaultPhotoReport = {
    quality: {
      blur_score: 0.5,
      brightness: 0.5,
      exposure_ok: true,
      noise_score: 0.5
    },
    content: {
      single_person: true,
      pose_ok: true,
      face_detected: false,
      face_bbox_norm: null
    },
    scale: {
      pixel_per_cm_estimate: null,
      method: 'none'
    }
  };
  const safeFrontReport = frontReport || defaultPhotoReport;
  const safeProfileReport = profileReport || defaultPhotoReport;
  const frontQuality = safeFrontReport.quality || defaultPhotoReport.quality;
  const profileQuality = safeProfileReport.quality || defaultPhotoReport.quality;
  const frontContent = safeFrontReport.content || defaultPhotoReport.content;
  const profileContent = safeProfileReport.content || defaultPhotoReport.content;
  const frontQualityScore = (frontQuality.blur_score || 0.5) * 0.4 + (frontQuality.exposure_ok ? 1 : frontQuality.brightness || 0.5) * 0.3 + (frontContent.single_person ? 1 : 0) * 0.3;
  const profileQualityScore = (profileQuality.blur_score || 0.5) * 0.4 + (profileQuality.exposure_ok ? 1 : profileQuality.brightness || 0.5) * 0.3 + (profileContent.single_person ? 1 : 0) * 0.3;
  return (frontQualityScore + profileQualityScore) / 2;
}
/**
 * Calculate estimated BMI with fallback to declared values
 */ function calculateEstimatedBMI(measurements, declaredHeight, declaredWeight) {
  const height_cm = measurements.height_cm || declaredHeight;
  const weight_kg = measurements.weight_kg || declaredWeight;
  return weight_kg / Math.pow(height_cm / 100, 2);
}
/**
 * Determine fallback strategy based on user history and defaults
 */ async function determineFallbackStrategy(supabase, user_id, gender) {
  try {
    if (user_id) {
      const { data: lastScan } = await supabase.from('body_scans').select('metrics').eq('user_id', user_id).order('timestamp', {
        ascending: false
      }).limit(1).maybeSingle();
      if (lastScan?.metrics?.raw_measurements) {
        console.log('🔍 [scan-estimate] Found last scan for fallback interpolation');
        return {
          type: 'last_scan',
          data: lastScan.metrics
        };
      }
    }
  } catch (lastScanError) {
    console.warn('🔍 [scan-estimate] Failed to fetch last scan for fallback:', lastScanError);
  }
  try {
    const { data: defaultArchetype } = await supabase.from('morph_archetypes').select('*').eq('gender_code', gender === 'masculine' ? 'MAS' : 'FEM').eq('level', 'Normal').eq('obesity', 'Non obèse').limit(1).maybeSingle();
    if (defaultArchetype) {
      console.log('🔍 [scan-estimate] Using default archetype for fallback:', defaultArchetype.id);
      return {
        type: 'default_archetype',
        data: defaultArchetype
      };
    }
  } catch (archetypeError) {
    console.warn('🔍 [scan-estimate] Failed to fetch default archetype for fallback:', archetypeError);
  }
  console.warn('🔍 [scan-estimate] Using ultimate fallback strategy');
  return {
    type: 'ultimate_fallback',
    data: {
      id: `${gender === 'masculine' ? 'MAS' : 'FEM'}-FALLBACK-001`,
      name: 'Fallback Default',
      gender: gender === 'masculine' ? 'masculine' : 'feminine',
      level: 'Normal',
      obesity: 'Non obèse',
      muscularity: 'Normal',
      morphotype: 'REC',
      bmi_range: [
        18.5,
        25
      ],
      morph_values: {},
      limb_masses: {
        gate: 1.0,
        armMass: 1.0,
        calfMass: 1.0,
        neckMass: 1.0,
        thighMass: 1.0,
        torsoMass: 1.0,
        forearmMass: 1.0
      }
    }
  };
}
function extractSkinToneFromPhotos(photos) {
  if (!photos || !Array.isArray(photos)) {
    console.warn('🔍 [scan-estimate] Invalid photos array for skin tone extraction');
    return null;
  }
  for (const photo of photos){
    if (photo && photo.report && photo.report.skin_tone) {
      return photo.report.skin_tone;
    }
  }
  console.log('🔍 [scan-estimate] No skin tone found in photo reports');
  return null;
}
