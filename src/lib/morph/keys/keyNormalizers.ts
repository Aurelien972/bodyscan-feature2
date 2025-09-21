import logger from '../../utils/logger';

/**
 * Convert any key variant to canonical DB key format
 */
export function toCanonicalDBKey(key: string): string {
  if (!key || typeof key !== 'string') {
    logger.warn('MORPH_KEYS', 'Invalid key provided to toCanonicalDBKey', { key, type: typeof key });
    return '';
  }

  // Remove Blender prefix if present
  let normalized = key.replace(/^BS_LOD0\.Body/, '');
  normalized = normalized.replace(/^BS_LOD0\.Face/, ''); // ADDED: Remove Face prefix
  normalized = normalized.replace(/^BS_LOD0\.Anim/, ''); // ADDED: Remove Anim prefix
  
  // Remove any remaining prefixes
  normalized = normalized.replace(/^Body/, '');
  normalized = normalized.replace(/^Face/, ''); // ADDED: Remove Face prefix
  normalized = normalized.replace(/^Anim/, ''); // ADDED: Remove Anim prefix
  
  // Convert to camelCase if needed
  if (normalized.includes('_')) {
    // Convert snake_case to camelCase
    normalized = normalized.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  // Ensure first letter is lowercase for camelCase
  normalized = normalized.charAt(0).toLowerCase() + normalized.slice(1);
  
  // Handle special cases for consistency
  const specialCases: Record<string, string> = {
    'bighips': 'bigHips',
    'asslarge': 'assLarge',
    'narrowwaist': 'narrowWaist',
    'pearfigure': 'pearFigure',
    'superbreast': 'superBreast',
    'breastsSmall': 'breastsSmall',
    'breastsSag': 'breastsSag',
    'bodybuildersize': 'bodybuilderSize',
    'bodybuilderdetails': 'bodybuilderDetails',
    'animewaist': 'animeWaist',
    'animeproportion': 'animeProportion',
    'animeneck': 'animeNeck',
    'dollbody': 'dollBody',
    'facelowereyelashlength': 'FaceLowerEyelashLength',
    'eyesclosedl': 'eyesClosedL',
    'eyesclosedr': 'eyesClosedR',
    'eyelashlength': 'eyelashLength',
    'eyelashesspecial': 'eyelashesSpecial',
    'eyesshape': 'eyesShape',
    'eyesspacing': 'eyesSpacing',
    'eyesdown': 'eyesDown',
    'eyesup': 'eyesUp',
    'eyesspacingwide': 'eyesSpacingWide',
    // ADDED: Face-specific keys
    'facejawwidth': 'FaceJawWidth',
    'facecheekfullness': 'FaceCheekFullness',
    'facenosesize': 'FaceNoseSize',
    'faceeyesize': 'FaceEyeSize',
    'faceliptickness': 'FaceLipThickness',
    'facechinlength': 'FaceChinLength',
    'faceforeheadheight': 'FaceForeheadHeight',
    'facebrowheight': 'FaceBrowHeight',
    'faceearsize': 'FaceEarSize',
    'faceheadsize': 'FaceHeadSize',
    'facenarrow': 'FaceNarrow',
    'facenoseangle': 'FaceNoseAngle',
    'facenosehump': 'FaceNoseHump',
    'facenosenarrow': 'FaceNoseNarrow',
    'facenosesmall': 'FaceNoseSmall',
    'facenosewide': 'FaceNoseWide',
    'faceroundface': 'FaceRoundFace',
    'facesymmetry': 'FaceSymmetry',
    'facelongface': 'FaceLongFace',
    'facecheekbones': 'FaceCheekbones',
    'facemouthwidth': 'FaceMouthWidth',
    'facemouthsize': 'FaceMouthSize',
    'facelipstomegalips': 'FaceLipsToMegalips',
    'facenostrilsflare': 'FaceNostrilsFlare',
  };
  
  const lowerKey = normalized.toLowerCase();
  if (specialCases[lowerKey]) {
    normalized = specialCases[lowerKey];
  }
  
  logger.trace('MORPH_KEYS', 'Key normalized', { 
    original: key, 
    canonical: normalized 
  });
  
  return normalized;
}

/**
 * Convert gender format to normalized key
 */
export function toGenderKey(input: 'masculine'|'feminine'|'male'|'female'): 'male'|'female' {
  if (input === 'masculine') return 'male';
  if (input === 'feminine') return 'female';
  return input;
}

/**
 * Convert 'male'/'female' to 'masculine'/'feminine' for DB enums.
 * Robustified to handle 'masculine'/'feminine' inputs directly.
 */
export function toDbGender(gender: 'male' | 'female' | 'masculine' | 'feminine'): 'masculine' | 'feminine' {
  if (gender === 'male' || gender === 'masculine') return 'masculine';
  if (gender === 'female' || gender === 'feminine') return 'feminine';
  
  // Fallback for unexpected values, though validation should prevent this
  logger.warn('MORPH_KEYS', 'Invalid gender input for toDbGender, defaulting to masculine', {
    invalidGender: gender,
    type: typeof gender
  });
  return 'masculine';
}

/**
 * Normalize a morph data object
 */
export function normalizeShapeParams(
  shapeParams: Record<string, number>,
  gender: 'male' | 'female',
  morphologyMapping?: any
): Record<string, number> {
  const normalized: Record<string, number> = {};
  
  Object.entries(shapeParams).forEach(([key, value]) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      logger.warn('Invalid morph value, skipping', { key, value, type: typeof value });
      return;
    }
    
    const canonicalKey = toCanonicalDBKey(key);
    if (canonicalKey && isValidDBKey(canonicalKey, gender, morphologyMapping)) {
      normalized[canonicalKey] = value;
    } else {
      logger.warn('MORPH_KEYS', 'Invalid or non-DB morph key, skipping', { 
        key, 
        canonicalKey,
        gender,
        philosophy: 'db_first_strict_allowlisting'
      });
    }
  });
  
  logger.debug('MORPH_KEYS', 'Shape params normalized with DB validation', {
    originalKeys: Object.keys(shapeParams).length,
    normalizedKeys: Object.keys(normalized).length,
    sampleNormalized: Object.entries(normalized).slice(0, 3).map(([k, v]) => ({ key: k, value: v.toFixed(3) })),
    gender,
    philosophy: 'db_first_normalization'
  });
  
  return normalized;
}

// Import isValidDBKey from validators to avoid circular dependency
function isValidDBKey(key: string, gender: 'male' | 'female', morphologyMapping?: any): boolean {
  // This will be imported from validators module
  // For now, a placeholder that always returns true or checks a simple list
  if (!morphologyMapping) {
    const fallbackValidKeys = [
      'pregnant', 'pearFigure', 'bigHips', 'assLarge', 'narrowWaist',
      'bodybuilderSize', 'bodybuilderDetails', 'emaciated', 'superBreast',
      'breastsSmall', 'breastsSag', 'animeWaist', 'dollBody', 'nipples',
      'animeNeck', 'animeProportion', 'eyesClosedL', 'eyesClosedR',
      'FaceLowerEyelashLength', 'eyelashLength', 'eyelashesspecial',
      'eyesShape', 'eyesSpacing', 'eyesDown', 'eyesUp', 'eyesSpacingWide',
      // Face-specific keys
      'FaceJawWidth', 'FaceCheekFullness', 'FaceNoseSize', 'FaceEyeSize', 'FaceLipThickness',
      'FaceChinLength', 'FaceForeheadHeight', 'FaceBrowHeight', 'FaceEarSize', 'FaceHeadSize',
      'FaceNarrow', 'FaceNoseAngle', 'FaceNoseHump', 'FaceNoseNarrow', 'FaceNoseSmall',
      'FaceNoseWide', 'FaceRoundFace', 'FaceSymmetry', 'FaceLongFace', 'FaceCheekbones',
      'FaceMouthWidth', 'FaceMouthSize', 'FaceLipsToMegalips', 'FaceNostrilsFlare'
    ];
    return fallbackValidKeys.includes(key);
  }
  
  const genderMapping = gender === 'male' ? 
    morphologyMapping.mapping_masculine : 
    morphologyMapping.mapping_feminine;
  
  // MODIFIED: Check both morph_values and face_values
  return key in genderMapping.morph_values || key in genderMapping.face_values;
}

