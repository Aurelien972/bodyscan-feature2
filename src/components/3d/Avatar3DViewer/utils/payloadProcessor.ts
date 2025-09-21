/**
 * Payload Processor - Data Preparation Utilities
 * Pure functions for processing and validating viewer payload data
 */

import { prepareMorphologicalPayload } from '../../../../lib/morph/preparePayload';
import { resolveSkinTone } from '../../../../lib/scan/normalizeSkinTone';
import type { MorphologyMappingData } from '../../../../hooks/useMorphologyMapping';
import type { PreparedPayload, Avatar3DViewerProps } from './viewerTypes';
import logger from '../../../../lib/utils/logger';

/**
 * Process viewer payload from props
 */
export async function processViewerPayload(
  props: Avatar3DViewerProps,
  morphologyMapping: MorphologyMappingData | null
): Promise<PreparedPayload> {
  const {
    savedAvatarPayload,
    morphData = {},
    limbMasses = {},
    userProfile,
    serverScanId
  } = props;

  logger.debug('PAYLOAD_PROCESSOR', 'Processing viewer payload', {
    hasSavedAvatarPayload: !!savedAvatarPayload,
    hasMorphData: !!morphData,
    morphDataKeys: morphData ? Object.keys(morphData) : [],
    hasLimbMasses: !!limbMasses,
    limbMassesKeys: limbMasses ? Object.keys(limbMasses) : [],
    hasMorphologyMapping: !!morphologyMapping,
    hasUserProfile: !!userProfile,
    serverScanId,
    philosophy: 'payload_processing_audit'
  });

  // PRIORITY 1: Use savedAvatarPayload if provided (direct mode)
  if (savedAvatarPayload) {
    const payloadValidation = validateSavedAvatarPayload(savedAvatarPayload);
    
    logger.info('PAYLOAD_PROCESSOR', 'Using saved avatar payload', {
      avatarVersion: savedAvatarPayload.avatar_version,
      resolvedGender: savedAvatarPayload.resolved_gender,
      payloadValidation,
      serverScanId,
      philosophy: 'saved_avatar_payload_mode'
    });
    
    if (!payloadValidation.isValid) {
      return {
        status: 'error',
        shape_params: {},
        limb_masses: {},
        strategy: 'saved_payload_validation_failed',
        confidence: 0,
        error: `Saved avatar payload validation failed: ${payloadValidation.issues.join(', ')}`
      };
    }
    
    return {
      status: 'ready',
      shape_params: savedAvatarPayload.final_shape_params,
      limb_masses: savedAvatarPayload.final_limb_masses,
      strategy: `saved_avatar_${savedAvatarPayload.avatar_version}`,
      confidence: 0.95
    };
  }

  // PRIORITY 2: Use morphData/limbMasses from props (pipeline mode)
  if (!morphData || Object.keys(morphData).length === 0) {
    return {
      status: 'pending',
      shape_params: {},
      limb_masses: {},
      strategy: 'pending_morph_data',
      confidence: 0,
      error: 'Morph data not available'
    };
  }

  if (!morphologyMapping) {
    return {
      status: 'pending',
      shape_params: morphData,
      limb_masses: limbMasses,
      strategy: 'pending_morphology_mapping',
      confidence: 0,
      error: 'Morphology mapping not loaded'
    };
  }

  if (!userProfile) {
    return {
      status: 'error',
      shape_params: {},
      limb_masses: {},
      strategy: 'missing_user_profile',
      confidence: 0,
      error: 'User profile is required'
    };
  }

  // All prerequisites met
  return {
    status: 'ready',
    shape_params: morphData,
    limb_masses: limbMasses,
    strategy: 'direct_morph_data',
    confidence: 0.9
  };
}

/**
 * Process skin tone from various sources
 */
export function processSkinTone(props: Avatar3DViewerProps): any {
  const { savedAvatarPayload, skinTone, scanResult, serverScanId } = props;

  // Build unified payload for skin tone resolver
  const unifiedPayload = {
    // V2 sources (priority)
    skin_tone: savedAvatarPayload?.skin_tone,
    avatar: { skin_tone: savedAvatarPayload?.skin_tone },
    savedAvatarPayload: { skin_tone: savedAvatarPayload?.skin_tone },
    
    // Legacy sources (fallback)
    skinTone: skinTone,
    
    // Scan sources (fallback)
    estimate: scanResult?.estimate,
    commit: scanResult?.commit,
    match: scanResult?.match,
    semantic: scanResult?.semantic
  };
  
  const { tone, source } = resolveSkinTone(unifiedPayload);
  
  logger.info('PAYLOAD_PROCESSOR', 'Skin tone resolved', {
    skinToneRGB: `rgb(${tone.rgb.r}, ${tone.rgb.g}, ${tone.rgb.b})`,
    skinToneHex: tone.hex,
    source: source,
    confidence: tone.confidence?.toFixed(3),
    schema: tone.schema,
    serverScanId,
    philosophy: 'skin_tone_processing_complete'
  });
  
  return tone;
}

/**
 * Validate saved avatar payload structure
 */
function validateSavedAvatarPayload(payload: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!payload.final_shape_params || Object.keys(payload.final_shape_params).length === 0) {
    issues.push('Missing or empty final_shape_params');
  }
  
  if (!payload.final_limb_masses || Object.keys(payload.final_limb_masses).length === 0) {
    issues.push('Missing or empty final_limb_masses');
  }
  
  if (!payload.resolved_gender || !['male', 'female'].includes(payload.resolved_gender)) {
    issues.push('Missing or invalid resolved_gender');
  }
  
  if (!payload.gltf_model_id) {
    issues.push('Missing gltf_model_id');
  }
  
  if (!payload.avatar_version || payload.avatar_version !== 'v2.0') {
    issues.push('Missing or invalid avatar_version');
  }
  
  // Validate shape params are finite numbers
  if (payload.final_shape_params) {
    Object.entries(payload.final_shape_params).forEach(([key, value]) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push(`Invalid shape param ${key}: ${value}`);
      }
    });
  }
  
  // Validate limb masses are finite numbers
  if (payload.final_limb_masses) {
    Object.entries(payload.final_limb_masses).forEach(([key, value]) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push(`Invalid limb mass ${key}: ${value}`);
      }
    });
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Generate stable hash for morph data comparison
 */
function generateMorphHash(morphData: Record<string, number>): string {
  return JSON.stringify(Object.keys(morphData).sort().map(k => [k, morphData[k]]));
}

/**
 * Determine final gender from multiple sources
 */
export function determineFinalGender(props: Avatar3DViewerProps): 'male' | 'female' {
  const { savedAvatarPayload, resolvedGender, userProfile, serverScanId } = props;

  // PRIORITY 1: Use savedAvatarPayload resolved gender if available
  if (savedAvatarPayload?.resolved_gender) {
    logger.info('PAYLOAD_PROCESSOR', 'Using saved avatar payload resolved gender', {
      resolvedGender: savedAvatarPayload.resolved_gender,
      avatarVersion: savedAvatarPayload.avatar_version,
      serverScanId,
      philosophy: 'saved_avatar_gender_priority'
    });
    return savedAvatarPayload.resolved_gender;
  }
  
  // PRIORITY 2: Use explicit resolved gender from props
  if (resolvedGender) {
    logger.info('PAYLOAD_PROCESSOR', 'Using explicit resolved gender', {
      resolvedGender,
      serverScanId
    });
    return resolvedGender;
  }
  
  // PRIORITY 3: Use user profile gender
  if (userProfile?.sex) {
    logger.info('PAYLOAD_PROCESSOR', 'Using user profile gender', {
      profileGender: userProfile.sex,
      serverScanId
    });
    return userProfile.sex;
  }
  
  // PRIORITY 4: Ultimate fallback
  const fallbackGender = 'male';
  logger.warn('PAYLOAD_PROCESSOR', 'Using fallback gender', {
    fallbackGender,
    serverScanId,
    reason: 'no_gender_information_available'
  });
  return fallbackGender;
}