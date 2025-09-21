import { toCanonicalDBKey } from '../../morph/keys/keyNormalizers';
import logger from '../../../lib/utils/logger';

// Direct mapping from database morph_values keys to Blender shape keys
export const DIRECT_BLENDER_SHAPE_KEY_MAPPING: Record<string, string> = {
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

// Mapping from limb masses to Blender shape keys with weights
// AUDIT NOTE: This mapping should NOT be used for morph application
// limbMass should only affect bones via applyLimbMassToBones.ts
// This mapping is kept for reference but should be disabled
export const LIMB_MASS_TO_BLENDER_MAPPING: Record<string, Array<{ key: string; weight: number }>> = {
  // AUDIT: DISABLED - limbMass should only affect bones, not morphs
  // This mapping is kept for reference but should not be used
  // All limb mass effects should go through applyLimbMassToBones.ts only
};

/**
 * Get Blender shape key for a morph value key
 */
export function getBlenderShapeKey(morphValueKey: string): string | null {
  // Direct mapping
  if (morphValueKey in DIRECT_BLENDER_SHAPE_KEY_MAPPING) {
    return DIRECT_BLENDER_SHAPE_KEY_MAPPING[morphValueKey];
  }
  
  // If it's already a Blender key, return as-is
  if (morphValueKey.startsWith('BS_LOD0.Body') || morphValueKey.startsWith('BS_LOD0.Face') || morphValueKey.startsWith('BS_LOD0.Anim')) { // MODIFIED: Inclure les préfixes faciaux
    return morphValueKey;
  }
  
  return null;
}

/**
 * Find morph value key for a Blender key (reverse lookup)
 */
function findMorphValueKeyForBlenderKey(blenderShapeKey: string): string | null {
  console.log('🔍 [MORPH TYPES] Finding morph value key for Blender key', {
    blenderShapeKey,
    isBlenderStyleKey: blenderShapeKey.startsWith('BS_LOD0.Body')
  });
  
  // MAPPING DIRECT UNIQUEMENT - Pas de transformation
  for (const [morphValueKey, mappedBlenderKey] of Object.entries(DIRECT_BLENDER_SHAPE_KEY_MAPPING)) {
    if (mappedBlenderKey === blenderShapeKey) {
      console.log('✅ [MORPH TYPES] Found direct mapping', {
        blenderShapeKey,
        morphValueKey
      });
      return morphValueKey;
    }
  }
  
  console.log('❌ [MORPH TYPES] No mapping found', {
    blenderShapeKey,
    availableMappings: Object.keys(DIRECT_BLENDER_SHAPE_KEY_MAPPING).slice(0, 5),
    reason: 'no_direct_mapping_in_DIRECT_BLENDER_SHAPE_KEY_MAPPING'
  });
  
  return null;
}

