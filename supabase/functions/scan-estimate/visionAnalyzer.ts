/**
 * Vision Analyzer
 * OpenAI Vision API integration for photo analysis
 */ /**
 * Analyze photos using OpenAI Vision API
 */ export async function analyzePhotosWithVision(frontPhotoUrl, profilePhotoUrl, userMetrics) {
  const traceId = userMetrics.traceId || 'unknown';
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  // Check if we have at least one photo
  if (!frontPhotoUrl && !profilePhotoUrl) {
    throw new Error('At least one photo URL is required');
  }
  const bmi = userMetrics.weight_kg / Math.pow(userMetrics.height_cm / 100, 2);
  console.log(`🔍 [visionAnalyzer] [${traceId}] Calling OpenAI Vision API with enhanced prompt`, {
    model: 'gpt-4o',
    userMetrics: {
      height_cm: userMetrics.height_cm,
      weight_kg: userMetrics.weight_kg,
      gender: userMetrics.gender,
      bmi: bmi.toFixed(2)
    },
    availablePhotos: {
      front: !!frontPhotoUrl,
      profile: !!profilePhotoUrl
    },
    traceId
  });
  // Enhanced prompt focused on keypoints and measurements extraction
  const qualityContext = buildQualityContext(userMetrics);
  const prompt = buildEnhancedAnalysisPrompt(userMetrics, bmi, qualityContext, !!frontPhotoUrl, !!profilePhotoUrl);
  // Build content array with available photos only
  const content = [
    {
      type: 'text',
      text: prompt
    }
  ];
  if (frontPhotoUrl) {
    content.push({
      type: 'image_url',
      image_url: {
        url: frontPhotoUrl
      }
    });
  }
  if (profilePhotoUrl) {
    content.push({
      type: 'image_url',
      image_url: {
        url: profilePhotoUrl
      }
    });
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 2000,
      temperature: 0.05 // Lower temperature for more consistent results
    })
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ [visionAnalyzer] OpenAI API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody
    });
    let errorMessage = createDetailedAPIError(response.status, errorBody);
    try {
      const errorJson = JSON.parse(errorBody);
      if (errorJson.error?.message) {
        errorMessage = createDetailedAPIError(response.status, errorJson.error.message);
      }
    } catch (parseError) {
      errorMessage = createDetailedAPIError(response.status, errorBody);
    }
    throw new Error(errorMessage);
  }
  const result = await response.json();
  const responseContent = result.choices[0]?.message?.content;
  if (!responseContent) {
    console.error('❌ [visionAnalyzer] OpenAI Vision response details:', {
      choices: result.choices,
      usage: result.usage,
      finish_reason: result.choices[0]?.finish_reason
    });
    throw new Error('OpenAI Vision returned empty content');
  }
  try {
    const parsed = parseVisionResponse(responseContent);
    // Validate and enhance measurements
    if (parsed.measurements) {
      parsed.measurements = validateAndEnhanceMeasurements(parsed, userMetrics);
    }
    console.log(`✅ [visionAnalyzer] [${traceId}] Vision analysis completed successfully`, {
      confidence: parsed.confidence,
      scaleMethod: parsed.scale_method,
      measurementsKeys: Object.keys(parsed.measurements || {}),
      traceId
    });
    return parsed;
  } catch (error) {
    console.error(`❌ [visionAnalyzer] [${traceId}] Failed to parse OpenAI response:`, responseContent);
    throw new Error('Failed to parse OpenAI Vision response');
  }
}
/**
 * Build enhanced analysis prompt for better extraction
 */ function buildEnhancedAnalysisPrompt(userMetrics, bmi, qualityContext, hasFront, hasProfile) {
  const photoDescription = hasFront && hasProfile ? 'ces 2 photos (face/profil)' : hasFront ? 'cette photo de face' : 'cette photo de profil';
  const analysisNote = hasFront && hasProfile ? '' : '\n\nNOTE: Une seule photo disponible - effectue une analyse simplifiée avec estimation des mesures manquantes basée sur les proportions anatomiques standards.';
  return `Tu es un expert en analyse morphologique corporelle. Extrais UNIQUEMENT les keypoints anatomiques du CORPS et les mesures corporelles de ${photoDescription}.${analysisNote}

PROFIL UTILISATEUR:
- Height: ${userMetrics.height_cm}cm
- Weight: ${userMetrics.weight_kg}kg  
- Gender: ${userMetrics.gender}
- BMI: ${bmi.toFixed(1)}

${qualityContext}

MISSION: Extraction pure de keypoints CORPORELS et mesures corporelles. Ne génère AUCUN paramètre morphologique (shape_params, limb_masses).

IMPORTANT: NE PAS analyser les proportions faciales pour la morphologie corporelle - un scan facial dédié sera implémenté séparément.
Focus UNIQUEMENT sur le corps : épaules, taille, hanches, membres, torse.

Pour chaque photo, identifie:
1. Points anatomiques clés CORPORELS (épaules, taille, hanches, coudes, genoux) avec coordonnées précises - IGNORER les détails faciaux
2. Mesures corporelles en centimètres (tour de taille, poitrine, hanches)
3. Estimation d'échelle via proportions corporelles générales (hauteur totale du corps dans l'image)
4. Validation de pose (bras dégagés, pieds visibles, alignement correct)
5. Estimation de composition corporelle (masse grasse, masse musculaire)
6. Extraction de couleur de peau (zone visage uniquement pour la couleur, pas les proportions)

Retourne JSON avec:
{
  "keypoints": {
    "front": [[x,y,confidence], ...] (coordonnées normalisées 0-1, CORPS uniquement),
    "profile": [[x,y,confidence], ...] (coordonnées normalisées 0-1, CORPS uniquement)
  },
  "measurements": {
    "waist_cm": number (tour de taille),
    "hips_cm": number (tour de hanches),
    "chest_cm": number (tour de poitrine),
    "height_cm": number (taille estimée depuis la hauteur corporelle totale),
    "weight_kg": number (poids estimé par analyse visuelle),
    "estimated_body_fat_perc": number (pourcentage de masse grasse estimé),
    "estimated_muscle_mass_kg": number (masse musculaire estimée en kg)
  },
  "skin_tone": {
    "r": number (0-255, rouge),
    "g": number (0-255, vert), 
    "b": number (0-255, bleu),
    "confidence": number (0-1, confiance extraction),
    "region_used": string ("face_detected" ou "center_fallback")
  },
  "confidence": {
    "vision": number (0-1, confiance dans l'extraction des keypoints corporels),
    "fit": number (0-1, confiance dans les mesures corporelles)
  },
  "quality_assessment": {
    "photo_quality": number (0-1, qualité globale des photos),
    "pose_quality": number (0-1, qualité de la pose pour l'analyse)
  },
  "scale_method": string ("body-proportion", "total-height", "reference-object"),
  "pixel_per_cm": number (échelle pixels par centimètre)
}

FOCUS EXTRACTION CORPORELLE PURE:
- Keypoints anatomiques CORPORELS précis avec coordonnées normalisées (PAS de détails faciaux)
- Mesures corporelles en centimètres (taille, poitrine, hanches)
- Estimation de composition corporelle (masse grasse/musculaire)
- Validation de qualité photo et pose
- Calcul d'échelle pixel/cm basé sur la hauteur corporelle totale
- Extraction couleur de peau depuis zone faciale (couleur uniquement, pas proportions)

IMPORTANT:
- Extraction corporelle pure sans interprétation morphologique
- Mesures anatomiques directes depuis les photos
- Gestion des photos de qualité variable
- Estimation robuste même avec éclairage/pose imparfaits
- Extraction couleur de peau précise (zone faciale pour couleur uniquement)
- Respect de la diversité des carnations sans biais
- IGNORER les proportions faciales - focus 100% corps

Réponds en JSON compact uniquement.`;
}
/**
 * Build quality context from photo reports
 */ function buildQualityContext(userMetrics) {
  let context = '\nPHOTO QUALITY CONTEXT:\n';
  if (userMetrics.frontReport) {
    context += `- Front photo: ${userMetrics.frontReport.quality.blur_score > 0.6 ? 'Sharp' : 'Slightly blurry'}, brightness ${(userMetrics.frontReport.quality.brightness * 100).toFixed(0)}%\n`;
    context += `- Scale method: ${userMetrics.frontReport.scale.method}\n`;
    context += `- Estimated pixel/cm: ${userMetrics.frontReport.scale.pixel_per_cm_estimate || 'Unknown'}\n`;
  }
  if (userMetrics.profileReport) {
    context += `- Profile photo: ${userMetrics.profileReport.quality.blur_score > 0.6 ? 'Sharp' : 'Slightly blurry'}, brightness ${(userMetrics.profileReport.quality.brightness * 100).toFixed(0)}%\n`;
  }
  return `
${context}`;
}
/**
 * Build analysis prompt for OpenAI Vision
 */ function buildAnalysisPrompt(userMetrics, bmi, qualityContext) {
  return `Tu es un expert en analyse morphologique pour reconstruction 3D. Extrais UNIQUEMENT les keypoints anatomiques et les mesures corporelles de ces 2 photos (face/profil).

PROFIL UTILISATEUR:
- Height: ${userMetrics.height_cm}cm
- Weight: ${userMetrics.weight_kg}kg  
- Gender: ${userMetrics.gender}
- BMI: ${bmi.toFixed(1)}

${qualityContext}

MISSION: Extraction pure de keypoints et mesures corporelles. Ne génère AUCUN paramètre morphologique (shape_params, limb_masses).

Pour chaque photo, identifie:
1. Points anatomiques clés (épaules, taille, hanches, etc.) avec coordonnées précises
2. Mesures corporelles en centimètres (tour de taille, poitrine, hanches)
3. Estimation d'échelle via taille du visage/tête
4. Validation de pose (bras dégagés, pieds visibles, alignement correct)
5. Estimation de composition corporelle (masse grasse, masse musculaire)

Retourne JSON avec:
{
  "keypoints": {
    "front": [[x,y,confidence], ...] (coordonnées normalisées 0-1),
    "profile": [[x,y,confidence], ...] (coordonnées normalisées 0-1)
  },
  "measurements": {
    "waist_cm": number (tour de taille),
    "hips_cm": number (tour de hanches),
    "chest_cm": number (tour de poitrine),
    "height_cm": number (taille estimée depuis les photos),
    "weight_kg": number (poids estimé par analyse visuelle),
    "estimated_body_fat_perc": number (pourcentage de masse grasse estimé),
    "estimated_muscle_mass_kg": number (masse musculaire estimée en kg)
  },
  "confidence": {
    "vision": number (0-1, confiance dans l'extraction des keypoints),
    "fit": number (0-1, confiance dans les mesures corporelles)
  },
  "quality_assessment": {
    "photo_quality": number (0-1, qualité globale des photos),
    "pose_quality": number (0-1, qualité de la pose pour l'analyse)
  },
  "scale_method": string ("face-heuristic", "body-proportion", "reference-object"),
  "pixel_per_cm": number (échelle pixels par centimètre)
}

FOCUS EXTRACTION PURE:
- Keypoints anatomiques précis avec coordonnées normalisées
- Mesures corporelles en centimètres (taille, poitrine, hanches)
- Estimation de composition corporelle (masse grasse/musculaire)
- Validation de qualité photo et pose
- Calcul d'échelle pixel/cm fiable

IMPORTANT:
- Extraction pure sans interprétation morphologique
- Mesures anatomiques directes depuis les photos
- Gestion des photos de qualité variable
- Estimation robuste même avec éclairage/pose imparfaits

Réponds en JSON compact uniquement.`;
}
/**
 * Parse OpenAI Vision response
 */ function parseVisionResponse(content) {
  // Clean the content to extract JSON if it's wrapped in markdown or other text
  let jsonContent = content.trim();
  // Remove markdown code blocks if present
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  // Find JSON object boundaries if there's extra text
  const jsonStart = jsonContent.indexOf('{');
  const jsonEnd = jsonContent.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
  }
  const parsed = JSON.parse(jsonContent);
  // Ensure measurements property exists and is an object
  if (!parsed.measurements || typeof parsed.measurements !== 'object') {
    parsed.measurements = {};
  }
  return parsed;
}
/**
 * Validate and enhance measurements from vision response
 */ function validateAndEnhanceMeasurements(visionResponse, userMetrics) {
  const measurements = visionResponse.measurements || {};
  // Always include user-provided data as fallback
  measurements.height_cm = measurements.height_cm || userMetrics.height_cm;
  measurements.weight_kg = measurements.weight_kg || userMetrics.weight_kg;
  // Validate anatomical consistency
  if (measurements.hips_cm < measurements.waist_cm) {
    measurements.hips_cm = measurements.waist_cm + 5;
  }
  if (measurements.chest_cm < measurements.waist_cm - 20) {
    measurements.chest_cm = measurements.waist_cm - 10;
  }
  return measurements;
}
/**
 * Create detailed API error messages with user guidance
 */ function createDetailedAPIError(status, errorBody) {
  switch(status){
    case 400:
      return 'Format de photo non supporté par l\'IA. Utilisez des photos JPEG de bonne qualité.';
    case 401:
      return 'Problème d\'authentification avec le service IA. Réessayez dans quelques instants.';
    case 429:
      return 'Nos serveurs IA sont très sollicités. Patientez 30 secondes et réessayez.';
    case 500:
    case 502:
    case 503:
      return 'Service IA temporairement indisponible. Réessayez dans quelques minutes.';
    case 413:
      return 'Photos trop volumineuses pour l\'analyse IA. Utilisez des images plus petites.';
    default:
      if (errorBody.includes('timeout')) {
        return 'Délai d\'analyse IA dépassé. Vérifiez votre connexion et réessayez.';
      }
      if (errorBody.includes('rate limit')) {
        return 'Limite d\'utilisation IA atteinte. Patientez quelques minutes.';
      }
      return `Erreur IA (${status}). Réessayez ou contactez le support.`;
  }
}
