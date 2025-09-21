/**
 * Key Converters
 * Functions for converting between different key formats (DB ↔ Blender)
 */

import logger from '../../utils/logger';
import { toCanonicalDBKey } from './keyNormalizers';

/**
 * Convert canonical DB key to Blender shape key
 */
export function toBlenderKey(dbKey: string): string | null {
  if (!dbKey || typeof dbKey !== 'string') {
    logger.warn('Invalid dbKey provided to toBlenderKey', { dbKey, type: typeof dbKey });
    return null;
  }

  const canonical = toCanonicalDBKey(dbKey);
  
  // Direct mapping for known keys
  const directMapping: Record<string, string> = {
    'pregnant': 'BS_LOD0.BodyPregnant',
    'pearFigure': 'BS_LOD0.BodyPearFigure',
    'bigHips': 'BS_LOD0.BodyBigHips',
    'assLarge': 'BS_LOD0.BodyAssLarge',
    'narrowWaist': 'BS_LOD0.BodyNarrowWaist',
    'bodybuilderSize': 'BS_LOD0.BodyBodybuilderSize',
    'bodybuilderDetails': 'BS_LOD0.BodyBodybuilderDetails',
    'emaciated': 'BS_LOD0.BodyEmaciated',
    'superBreast': 'BS_LOD0.BodySuperBreast',
    'breastsSmall': 'BS_LOD0.BodyBreastsSmall',
    'breastsSag': 'BS_LOD0.BodyBreastsSag',
    'animeWaist': 'BS_LOD0.BodyAnimeWaist',
    'dollBody': 'BS_LOD0.BodyDollBody',
    'nipples': 'BS_LOD0.BodyNipples',
    'animeNeck': 'BS_LOD0.BodyAnimeNeck',
    'animeProportion': 'BS_LOD0.BodyAnimeProportion',
    
    // Eye-related morph targets from Blender data
    'eyesClosedL': 'BS_LOD0.AnimEyesClosedL',
    'eyesClosedR': 'BS_LOD0.AnimEyesClosedR',
    'FaceLowerEyelashLength': 'BS_LOD0.FaceLowerEyelashLength',
    'eyelashLength': 'BS_LOD0.FaceEyelashLength',
    'eyelashesSpecial': 'BS_LOD0.FaceEyelashesSpecial',
    'eyesShape': 'BS_LOD0.FaceEyesShape',
    'eyesSpacing': 'BS_LOD0.FaceEyesSpacing',
    'eyesDown': 'BS_LOD0.FaceEyesDown',
    'eyesUp': 'BS_LOD0.FaceEyesUp',
    'eyesSpacingWide': 'BS_LOD0.FaceEyesSpacingWide',
    // NOUVEAU: Ajout des morphs faciaux
    'FaceJawWidth': 'BS_LOD0.FaceJawWidth',
    'FaceCheekFullness': 'BS_LOD0.FaceCheekFullness',
    'FaceNoseSize': 'BS_LOD0.FaceNoseSize',
    'FaceEyeSize': 'BS_LOD0.FaceEyeSize',
    'FaceLipThickness': 'BS_LOD0.FaceLipThickness',
    'FaceChinLength': 'BS_LOD0.FaceChinLength',
    'FaceForeheadHeight': 'BS_LOD0.FaceForeheadHeight',
    'FaceBrowHeight': 'BS_LOD0.FaceBrowHeight',
    'FaceEarSize': 'BS_LOD0.FaceEarSize',
    'FaceHeadSize': 'BS_LOD0.FaceHeadSize',
    'FaceNarrow': 'BS_LOD0.FaceNarrow',
    'FaceNoseAngle': 'BS_LOD0.FaceNoseAngle',
    'FaceNoseHump': 'BS_LOD0.FaceNoseHump',
    'FaceNoseNarrow': 'BS_LOD0.FaceNoseNarrow',
    'FaceNoseSmall': 'BS_LOD0.FaceNoseSmall',
    'FaceNoseWide': 'BS_LOD0.FaceNoseWide',
    'FaceRoundFace': 'BS_LOD0.FaceRoundFace',
    'FaceSymmetry': 'BS_LOD0.FaceSymmetry',
    'FaceLongFace': 'BS_LOD0.FaceLongFace',
    'FaceCheekbones': 'BS_LOD0.FaceCheekbones',
    'FaceMouthWidth': 'BS_LOD0.FaceMouthWidth',
    'FaceMouthSize': 'BS_LOD0.FaceMouthSize',
    'FaceLipsToMegalips': 'BS_LOD0.FaceLipsToMegalips',
    'FaceNostrilsFlare': 'BS_LOD0.FaceNostrilsFlare',
  };

  if (directMapping[canonical]) {
    return directMapping[canonical];
  }

  // Fallback: construct Blender key (should ideally not be hit for face morphs if directMapping is complete)
  // This logic is primarily for body morphs that follow a consistent naming convention.
  // For face morphs, direct mapping is preferred due to less consistent naming.
  if (canonical.startsWith('Face')) { // If it's a face key not in direct mapping, try constructing
    const blenderKey = `BS_LOD0.${canonical}`;
    logger.warn('Attempted to construct Blender key for face morph (should be in direct mapping)', {
      dbKey: canonical,
      blenderKey,
    });
    return blenderKey;
  }
  
  // Default body morph construction
  const blenderKey = `BS_LOD0.Body${canonical.charAt(0).toUpperCase() + canonical.slice(1)}`;
  
  logger.trace('Blender key generated', { 
    dbKey: canonical, 
    blenderKey,
    method: directMapping[canonical] ? 'direct_mapping' : 'constructed'
  });
  
  return blenderKey;
}

/**
 * Find morph value key for a Blender key (reverse lookup)
 */
function findMorphValueKeyForBlenderKey(blenderShapeKey: string): string | null {
  const directMapping: Record<string, string> = {
    'BS_LOD0.BodyPregnant': 'pregnant',
    'BS_LOD0.BodyPearFigure': 'pearFigure',
    'BS_LOD0.BodyBigHips': 'bigHips',
    'BS_LOD0.BodyAssLarge': 'assLarge',
    'BS_LOD0.BodyNarrowWaist': 'narrowWaist',
    'BS_LOD0.BodyBodybuilderSize': 'bodybuilderSize',
    'BS_LOD0.BodyBodybuilderDetails': 'bodybuilderDetails',
    'BS_LOD0.BodyEmaciated': 'emaciated',
    'BS_LOD0.BodySuperBreast': 'superBreast',
    'BS_LOD0.BodyBreastsSmall': 'breastsSmall',
    'BS_LOD0.BodyBreastsSag': 'breastsSag',
    'BS_LOD0.BodyAnimeWaist': 'animeWaist',
    'BS_LOD0.BodyDollBody': 'dollBody',
    'BS_LOD0.BodyNipples': 'nipples',
    'BS_LOD0.BodyAnimeNeck': 'animeNeck',
    'BS_LOD0.BodyAnimeProportion': 'animeProportion',
    'BS_LOD0.AnimEyesClosedL': 'eyesClosedL',
    'BS_LOD0.AnimEyesClosedR': 'eyesClosedR',
    'BS_LOD0.FaceLowerEyelashLength': 'FaceLowerEyelashLength',
    'BS_LOD0.FaceEyelashLength': 'eyelashLength',
    'BS_LOD0.FaceEyelashesSpecial': 'eyelashesSpecial',
    'BS_LOD0.FaceEyesShape': 'eyesShape',
    'BS_LOD0.FaceEyesSpacing': 'eyesSpacing',
    'BS_LOD0.FaceEyesDown': 'eyesDown',
    'BS_LOD0.FaceEyesUp': 'eyesUp',
    'BS_LOD0.FaceEyesSpacingWide': 'eyesSpacingWide',
    // Face-specific keys (reverse mapping)
    'BS_LOD0.FaceJawWidth': 'FaceJawWidth',
    'BS_LOD0.FaceCheekFullness': 'FaceCheekFullness',
    'BS_LOD0.FaceNoseSize': 'FaceNoseSize',
    'BS_LOD0.FaceEyeSize': 'FaceEyeSize',
    'BS_LOD0.FaceLipThickness': 'FaceLipThickness',
    'BS_LOD0.FaceChinLength': 'FaceChinLength',
    'BS_LOD0.FaceForeheadHeight': 'FaceForeheadHeight',
    'BS_LOD0.FaceBrowHeight': 'FaceBrowHeight',
    'BS_LOD0.FaceEarSize': 'FaceEarSize',
    'BS_LOD0.FaceHeadSize': 'FaceHeadSize',
    'FaceNarrow': 'FaceNarrow',
    'FaceNoseAngle': 'FaceNoseAngle',
    'FaceNoseHump': 'FaceNoseHump',
    'FaceNoseNarrow': 'FaceNoseNarrow',
    'FaceNoseSmall': 'FaceNoseSmall',
    'FaceNoseWide': 'FaceNoseWide',
    'FaceRoundFace': 'FaceRoundFace',
    'FaceSymmetry': 'FaceSymmetry',
    'FaceLongFace': 'FaceLongFace',
    'FaceCheekbones': 'FaceCheekbones',
    'FaceMouthWidth': 'FaceMouthWidth',
    'FaceMouthSize': 'FaceMouthSize',
    'FaceLipsToMegalips': 'FaceLipsToMegalips',
    'FaceNostrilsFlare': 'FaceNostrilsFlare',
  };
  
  const morphValueKey = directMapping[blenderShapeKey];
  
  if (morphValueKey) {
    logger.trace('MORPH_KEYS', 'Found direct reverse mapping', {
      blenderShapeKey,
      morphValueKey
    });
    return morphValueKey;
  }
  
  logger.trace('MORPH_KEYS', 'No reverse mapping found', {
    blenderShapeKey,
    availableMappings: Object.keys(directMapping).slice(0, 5),
    reason: 'no_direct_mapping_in_DIRECT_BLENDER_SHAPE_KEY_MAPPING'
  });
  
  return null;
}

/**
 * Convert batch of DB keys to Blender keys
 */
function convertDBKeysToBlenderKeys(dbKeys: string[]): Record<string, string> {
  const converted: Record<string, string> = {};
  
  dbKeys.forEach(dbKey => {
    const blenderKey = toBlenderKey(dbKey);
    if (blenderKey) {
      converted[dbKey] = blenderKey;
    }
  });
  
  return converted;
}
