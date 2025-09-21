// supabase/functions/face-semantic/dbFaceSemanticValidator.ts

import { createClient } from 'npm:@supabase/supabase-js@2.54.0';

interface RawFaceSemanticProfile {
  face_shape: string;
  eye_shape: string;
  nose_type: string;
  lip_fullness: string;
  confidence: {
    semantic: number;
    face_detection: number;
  };
  raw_ai_scores?: Record<string, number>;
}

interface ValidatedFaceSemanticProfile {
  face_shape: string;
  eye_shape: string;
  nose_type: string;
  lip_fullness: string;
  // Vous pouvez ajouter ici des champs validés ou des scores agrégés
}

interface ValidationResult {
  validatedProfile: ValidatedFaceSemanticProfile;
  validationFlags: string[];
  adjustmentsMade: string[];
}

/**
 * Valide et ajuste le profil sémantique du visage par rapport aux règles de la base de données.
 * Assure que les classifications correspondent aux ENUMs ou aux règles métier.
 */
export async function validateFaceSemanticWithDB(
  supabase: ReturnType<typeof createClient>,
  rawSemanticProfile: RawFaceSemanticProfile,
  userDbGender: 'masculine' | 'feminine' // MODIFIED: Expect 'masculine' | 'feminine'
): Promise<ValidationResult> {
  console.log('🔍 [dbFaceSemanticValidator] Starting DB validation for face semantic profile:', {
    rawProfile: rawSemanticProfile,
    userDbGender,
  });

  const validationFlags: string[] = [];
  const adjustmentsMade: string[] = [];

  // Récupérer les valeurs d'énumération valides directement de la base de données
  // ou d'une table de configuration si elles sont dynamiques.
  // Pour cet exemple, nous allons simuler la récupération des ENUMs.
  const validFaceShapes = ['oval', 'round', 'square', 'heart', 'diamond', 'long', 'triangle'];
  const validEyeShapes = ['almond', 'round', 'hooded', 'monolid', 'downturned', 'upturned'];
  const validNoseTypes = ['aquiline', 'button', 'roman', 'nubian', 'straight', 'upturned'];
  const validLipFullness = ['full', 'thin', 'average', 'pouty'];

  let validatedFaceShape = rawSemanticProfile.face_shape;
  let validatedEyeShape = rawSemanticProfile.eye_shape;
  let validatedNoseType = rawSemanticProfile.nose_type;
  let validatedLipFullness = rawSemanticProfile.lip_fullness;

  // Valider et ajuster la forme du visage
  if (!validFaceShapes.includes(validatedFaceShape)) {
    console.warn(`⚠️ [dbFaceSemanticValidator] Invalid face_shape '${validatedFaceShape}', adjusting.`);
    validatedFaceShape = 'oval'; // Fallback par défaut
    adjustmentsMade.push(`face_shape_adjusted_from_${rawSemanticProfile.face_shape}_to_${validatedFaceShape}`);
    validationFlags.push('invalid_face_shape');
  }

  // Valider et ajuster la forme des yeux
  if (!validEyeShapes.includes(validatedEyeShape)) {
    console.warn(`⚠️ [dbFaceSemanticValidator] Invalid eye_shape '${validatedEyeShape}', adjusting.`);
    validatedEyeShape = 'almond'; // Fallback par défaut
    adjustmentsMade.push(`eye_shape_adjusted_from_${rawSemanticProfile.eye_shape}_to_${validatedEyeShape}`);
    validationFlags.push('invalid_eye_shape');
  }

  // Valider et ajuster le type de nez
  if (!validNoseTypes.includes(validatedNoseType)) {
    console.warn(`⚠️ [dbFaceSemanticValidator] Invalid nose_type '${validatedNoseType}', adjusting.`);
    validatedNoseType = 'straight'; // Fallback par défaut
    adjustmentsMade.push(`nose_type_adjusted_from_${rawSemanticProfile.nose_type}_to_${validatedNoseType}`);
    validationFlags.push('invalid_nose_type');
  }

  // Valider et ajuster la plénitude des lèvres
  if (!validLipFullness.includes(validatedLipFullness)) {
    console.warn(`⚠️ [dbFaceSemanticValidator] Invalid lip_fullness '${validatedLipFullness}', adjusting.`);
    validatedLipFullness = 'average'; // Fallback par défaut
    adjustmentsMade.push(`lip_fullness_adjusted_from_${rawSemanticProfile.lip_fullness}_to_${validatedLipFullness}`);
    validationFlags.push('invalid_lip_fullness');
  }

  // Appliquer des règles spécifiques au genre si nécessaire (exemple)
  if (userDbGender === 'masculine' && validatedLipFullness === 'pouty') {
    console.log('🔍 [dbFaceSemanticValidator] Adjusting pouty lips for masculine gender.');
    validatedLipFullness = 'average';
    adjustmentsMade.push(`lip_fullness_adjusted_for_gender_to_${validatedLipFullness}`);
    validationFlags.push('gender_lip_fullness_mismatch');
  }

  const validatedProfile: ValidatedFaceSemanticProfile = {
    face_shape: validatedFaceShape,
    eye_shape: validatedEyeShape,
    nose_type: validatedNoseType,
    lip_fullness: validatedLipFullness,
  };

  console.log('✅ [dbFaceSemanticValidator] DB validation complete:', {
    validatedProfile,
    validationFlags,
    adjustmentsMade,
  });

  return {
    validatedProfile,
    validationFlags,
    adjustmentsMade,
  };
}
