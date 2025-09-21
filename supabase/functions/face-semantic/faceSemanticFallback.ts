// supabase/functions/face-semantic/faceSemanticFallback.ts

interface PhotoReport {
  quality?: {
    blur_score: number;
    brightness: number;
    exposure_ok: boolean;
  };
  content?: {
    face_detected: boolean;
    face_bbox_norm: [number, number, number, number];
  };
}

interface FallbackOptions {
  gender: 'male' | 'female';
  frontReport?: PhotoReport;
  profileReport?: PhotoReport;
}

interface FallbackFaceSemanticResult {
  face_shape: string;
  eye_shape: string;
  nose_type: string;
  lip_fullness: string;
  confidence: {
    semantic: number;
    face_detection: number;
  };
  fallback_reason: string;
}

/**
 * Crée une analyse sémantique du visage de fallback.
 * Utilisé lorsque l'analyse IA principale échoue.
 */
export function createFallbackFaceSemanticAnalysis(
  options: FallbackOptions
): FallbackFaceSemanticResult {
  console.log('⚠️ [faceSemanticFallback] Creating fallback face semantic analysis:', {
    gender: options.gender,
    hasFrontReport: !!options.frontReport,
    hasProfileReport: !!options.profileReport,
  });

  let faceShape: string;
  let eyeShape: string;
  let noseType: string;
  // MODIFIED: Utiliser une valeur valide de l'énumération de la base de données
  let lipFullness: string;
  let confidence = 0.3; // Faible confiance pour les données de fallback

  // Fournir des valeurs par défaut valides pour les enums
  if (options.gender === 'female') {
    faceShape = 'oval';
    eyeShape = 'almond';
    noseType = 'straight';
    lipFullness = 'average'; // MODIFIED: "average" est valide dans l'énumération DB
  } else {
    faceShape = 'square';
    eyeShape = 'round';
    noseType = 'roman';
    lipFullness = 'average'; // MODIFIED: "average" est valide dans l'énumération DB
  }

  // Ajuster la confiance en fonction de la détection faciale dans les rapports
  const faceDetected = (options.frontReport?.content?.face_detected || false) &&
                       (options.profileReport?.content?.face_detected || false);
  if (faceDetected) {
    confidence += 0.1; // Légère augmentation si les visages ont été détectés
  }

  const result: FallbackFaceSemanticResult = {
    face_shape: faceShape,
    eye_shape: eyeShape,
    nose_type: noseType,
    lip_fullness: lipFullness,
    confidence: {
      semantic: Math.max(0.1, confidence),
      face_detection: faceDetected ? 0.6 : 0.3,
    },
    fallback_reason: 'ai_analysis_failed',
  };

  console.log('✅ [faceSemanticFallback] Fallback analysis created:', result);
  return result;
}

