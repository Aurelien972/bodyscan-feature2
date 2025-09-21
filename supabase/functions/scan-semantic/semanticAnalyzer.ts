/**
 * Semantic Analyzer
 * OpenAI Vision API integration for semantic morphological analysis
 */ /**
 * Analyze photos for semantic morphological descriptors using OpenAI Vision
 */ export async function analyzePhotosForSemantics(frontPhotoUrl, profilePhotoUrl, userMetrics) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not found');
  }
  const bmi = userMetrics.weight_kg / Math.pow(userMetrics.height_cm / 100, 2);
  const prompt = buildSemanticPrompt(userMetrics, bmi);
  console.log('🔍 [semanticAnalyzer] Starting OpenAI semantic analysis', {
    frontPhotoUrl: frontPhotoUrl.substring(0, 50) + '...',
    profilePhotoUrl: profilePhotoUrl.substring(0, 50) + '...',
    userMetrics: {
      height_cm: userMetrics.height_cm,
      weight_kg: userMetrics.weight_kg,
      gender: userMetrics.gender,
      bmi: bmi.toFixed(2),
      estimated_muscle_definition_score: userMetrics.estimated_muscle_definition_score,
      estimated_muscle_volume_score: userMetrics.estimated_muscle_volume_score // Log pour vérification
    }
  });
  try {
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
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: frontPhotoUrl
                }
              },
              {
                type: 'image_url',
                image_url: {
                  url: profilePhotoUrl
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ [semanticAnalyzer] OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(createDetailedSemanticAPIError(response.status, errorBody));
    }
    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    if (!content) {
      console.warn('⚠️ [semanticAnalyzer] OpenAI returned empty content');
      throw new Error('OpenAI returned empty content');
    }
    const parsed = parseSemanticResponse(content);
    // Validate semantic response structure
    if (!validateSemanticResponseStructure(parsed)) {
      console.warn('⚠️ [semanticAnalyzer] Invalid semantic response structure');
      throw new Error('Invalid semantic response structure');
    }
    // Ensure measurements are included with user data as fallback
    if (!parsed.measurements) {
      parsed.measurements = createFallbackMeasurements(userMetrics);
    } else {
      // Ensure critical measurements are present
      parsed.measurements.height_cm = parsed.measurements.height_cm || userMetrics.height_cm;
      parsed.measurements.weight_kg = parsed.measurements.weight_kg || userMetrics.weight_kg;
    }
    // Calculate overall confidence
    parsed.confidence.overall = (parsed.confidence.semantic + parsed.confidence.measurements) / 2;
    // Set overall confidence to semantic confidence only
    parsed.confidence.overall = parsed.confidence.semantic;
    console.log('✅ [semanticAnalyzer] OpenAI semantic analysis successful', {
      muscularity: parsed.muscularity_level,
      adiposity: parsed.adiposity_level,
      bodyShapePrimary: parsed.body_shape_primary,
      fatDistribution: parsed.fat_distribution,
      confidence: parsed.confidence,
      morphValuesExtracted: {
        pearFigure: parsed.pearFigure,
        emaciated: parsed.emaciated,
        bodybuilderSize: parsed.bodybuilderSize,
        bigHips: parsed.bigHips,
        assLarge: parsed.assLarge
      }
    });
    return parsed;
  } catch (fetchError) {
    console.error('❌ [semanticAnalyzer] OpenAI API request failed:', fetchError);
    throw fetchError;
  }
}
/**
 * Build semantic analysis prompt
 */ function buildSemanticPrompt(userMetrics, bmi) {
  const qualityContext = `
QUALITÉ PHOTOS:
- Face: ${userMetrics.frontReport.quality?.blur_score > 0.6 ? 'Nette' : 'Floue'}, luminosité ${Math.round((userMetrics.frontReport.quality?.brightness || 0.5) * 100)}%
- Profil: ${userMetrics.profileReport.quality?.blur_score > 0.6 ? 'Nette' : 'Floue'}, luminosité ${Math.round((userMetrics.profileReport.quality?.brightness || 0.5) * 100)}%
- BMI estimé: ${bmi.toFixed(1)}
`;
  // Extraction des nouveaux scores de musculature
  const muscleDefinitionScore = userMetrics.estimated_muscle_definition_score !== undefined ? userMetrics.estimated_muscle_definition_score.toFixed(2) : 'N/A';
  const muscleVolumeScore = userMetrics.estimated_muscle_volume_score !== undefined ? userMetrics.estimated_muscle_volume_score.toFixed(2) : 'N/A';
  return `Tu es un expert en analyse morphologique sémantique CORPORELLE. À partir de ces 2 photos (face/profil), extrais le profil sémantique morphologique BRUT du CORPS uniquement.

PROFIL UTILISATEUR:
- Taille: ${userMetrics.height_cm}cm
- Poids: ${userMetrics.weight_kg}kg  
- Genre: ${userMetrics.gender}
- BMI: ${bmi.toFixed(1)}

${qualityContext}

MÉTRIQUES MUSCULAIRES PRÉ-ANALYSÉES (issues de l'étape précédente, à utiliser comme indicateurs forts):
- Score de Définition Musculaire Estimée (0-1): ${muscleDefinitionScore} (1 = muscles très ciselés, séparés)
- Score de Volume Musculaire Estimé (0-1): ${muscleVolumeScore} (1 = muscles très volumineux, développés)

MISSION: Analyse morphologique sémantique CORPORELLE BRUTE - extrais les valeurs morphologiques du CORPS directement observées, sans contraintes de classification.

IMPORTANT: Focus 100% sur le CORPS - ignorer les détails faciaux car un scan facial dédié sera implémenté.
Analyser uniquement: silhouette, masse musculaire, distribution graisseuse, proportions corporelles.

SHAPE KEYS À EXTRAIRE (valeurs brutes -3 à +3):
- pearFigure: volume global/adiposité
- emaciated: émaciation/maigreur
- bodybuilderSize: développement musculaire global
- bodybuilderDetails: définition musculaire
- bigHips: largeur des hanches
- assLarge: projection des fessiers
- narrowWaist: étroitesse de la taille
- superBreast: développement de la poitrine
- breastsSmall: réduction de la poitrine
- pregnant: proéminence abdominale
- animeWaist: taille très étroite
- breastsSag: affaissement de la poitrine
- dollBody: corps stylisé
- animeProportion: proportions stylisées
- animeNeck: cou stylisé
- nipples: détails anatomiques

Retourne JSON avec :
{
  // Valeurs morphologiques BRUTES observées
  "pearFigure": number (-3 à +3),
  "emaciated": number (-3 à +3),
  "bodybuilderSize": number (-3 à +3),
  "bodybuilderDetails": number (-3 à +3),
  "bigHips": number (-3 à +3),
  "assLarge": number (-3 à +3),
  "narrowWaist": number (-3 à +3),
  "superBreast": number (-3 à +3),
  "breastsSmall": number (-3 à +3),
  "pregnant": number (-3 à +3),
  "animeWaist": number (-3 à +3),
  "breastsSag": number (-3 à +3),
  "dollBody": number (-3 à +3),
  "animeProportion": number (-3 à +3),
  "animeNeck": number (-3 à +3),
  "nipples": number (-3 à +3),
  
  // Analyse sémantique globale
  "muscularity_level": number (0-1, niveau de développement musculaire global),
  "adiposity_level": number (0-1, niveau de masse grasse globale),
  "body_types": string[] (sélectionne parmi: "POM", "POI", "OVA", "SAB", "REC", "TRI"),
  "body_shape_primary": string (forme corporelle dominante: POM/POI/OVA/SAB/REC/TRI),
  "muscle_definition": number (0-1, définition/visibilité musculaire),
  "fat_distribution": string ("upper", "lower", "central", "even"),
  
  "region_scores": {
    "shoulders_width": number (-1 à +1, relatif à la norme du genre),
    "chest_depth": number (-1 à +1, profondeur/projection de la poitrine),
    "waist_circ": number (-1 à +1, circonférence de la taille),
    "hips_width": number (-1 à +1, largeur des hanches),
    "glutes_projection": number (-1 à +1, projection des fessiers)
  },
  "flags": {
    "clothes_baggy": boolean (vêtements amples qui masquent la forme),
    "arms_away_from_body": boolean (bras décollés du corps),
    "hair_volume_high": boolean (cheveux volumineux qui modifient la silhouette),
    "posture_good": boolean (posture droite et naturelle),
    "lighting_adequate": boolean (éclairage suffisant pour l'analyse)
  },
  "confidence": {
    "semantic": number (0-1, confiance dans l'analyse sémantique),
  }
}

FOCUS EXTRACTION MORPHOLOGIQUE CORPORELLE BRUTE:
- Valeurs morphologiques directement observées (sans classification)
- Évaluation précise de chaque shape key individuellement
- Analyse sémantique globale (muscularity_level, adiposity_level)
- Distribution anatomique de la masse grasse
- Flags de qualité photo et posture
- Scores régionaux pour chaque zone anatomique

INSTRUCTIONS SPÉCIFIQUES POUR LA MUSCULATURE:
- Utilise les "MÉTRIQUES MUSCULAIRES PRÉ-ANALYSÉES" comme base solide pour déterminer "muscularity_level" et "muscle_definition".
- Si "Score de Définition Musculaire Estimée" est élevé, assure-toi que "muscle_definition" reflète cette haute définition.
- Si "Score de Volume Musculaire Estimé" est élevé, assure-toi que "muscularity_level" reflète ce volume global.
- Même si l'IMC est dans la plage "normale" ou "surpoids", si les scores de musculature sont élevés, la classification "muscularity_level" et "muscle_definition" DOIT refléter cette musculature visible.
- Ne te laisse pas influencer par l'adiposité générale pour sous-estimer la musculature si les signes visuels sont présents.

IMPORTANT:
- Extrais les valeurs morphologiques BRUTES sans contraintes de classification
- Les classifications finales seront appliquées par la base de données
- Sois précis sur chaque shape key individuellement
- Gestion des morphologies hybrides et extrêmes
- Distinction claire entre muscle_definition (visibilité) et muscularity_level (volume)
- IGNORER complètement les détails faciaux - focus 100% sur le corps
- Scan facial dédié sera implémenté séparément pour le visage

Réponds en JSON compact uniquement.`;
}
/**
 * Parse semantic response from OpenAI
 */ function parseSemanticResponse(content) {
  let jsonContent = content.trim();
  // Clean JSON extraction
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  const jsonStart = jsonContent.indexOf('{');
  const jsonEnd = jsonContent.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
  }
  return JSON.parse(jsonContent);
}
/**
 * Validate semantic response structure
 */ function validateSemanticResponseStructure(response) {
  const requiredFields = [
    'muscularity_level',
    'adiposity_level',
    'body_types',
    'body_shape_primary',
    'muscle_definition',
    'fat_distribution',
    'region_scores',
    'flags',
    'confidence',
    'pearFigure',
    'emaciated',
    'bodybuilderSize'
  ];
  for (const field of requiredFields){
    if (!(field in response)) {
      console.warn(`⚠️ [validateSemanticResponse] Missing required field: ${field}`);
      return false;
    }
  }
  // Validate numeric ranges
  if (response.muscularity_level < 0 || response.muscularity_level > 1 || response.adiposity_level < 0 || response.adiposity_level > 1 || response.muscle_definition < 0 || response.muscle_definition > 1) {
    console.warn('⚠️ [validateSemanticResponse] Numeric values out of range');
    return false;
  }
  // Validate morph values ranges (-3 to +3)
  const morphKeys = [
    'pearFigure',
    'emaciated',
    'bodybuilderSize',
    'bodybuilderDetails',
    'bigHips',
    'assLarge',
    'narrowWaist',
    'superBreast',
    'breastsSmall',
    'pregnant',
    'animeWaist',
    'breastsSag',
    'dollBody',
    'animeProportion',
    'animeNeck',
    'nipples'
  ];
  for (const key of morphKeys){
    if (key in response && (response[key] < -3 || response[key] > 3)) {
      console.warn(`⚠️ [validateSemanticResponse] Morph value ${key} out of range: ${response[key]}`);
      return false;
    }
  }
  // Validate body_types array
  if (!Array.isArray(response.body_types) || response.body_types.length === 0) {
    console.warn('⚠️ [validateSemanticResponse] Invalid body_types array');
    return false;
  }
  // Validate region_scores structure
  const requiredRegionScores = [
    'shoulders_width',
    'chest_depth',
    'waist_circ',
    'hips_width',
    'glutes_projection'
  ];
  for (const region of requiredRegionScores){
    if (!(region in response.region_scores) || response.region_scores[region] < -1 || response.region_scores[region] > 1) {
      console.warn(`⚠️ [validateSemanticResponse] Invalid region score: ${region}`);
      return false;
    }
  }
  return true;
}
function createFallbackMeasurements(userMetrics) {
  return {
    height_cm: userMetrics.height_cm,
    weight_kg: userMetrics.weight_kg
  };
}
function createDetailedSemanticAPIError(status, errorBody) {
  return `OpenAI API error: ${status} - ${errorBody}`;
}
