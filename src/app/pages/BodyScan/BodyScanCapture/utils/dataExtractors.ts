// src/app/pages/BodyScan/BodyScanCapture/utils/dataExtractors.ts
import logger from '../../../../../lib/utils/logger';

/**
 * Extract skin tone from scan data with fallback strategy
 */
function extractSkinToneFromScanData(
  uploadedPhotos: any[],
  estimateResult: any,
  clientScanId: string
): { r: number; g: number; b: number; confidence?: number } {
  logger.info('DATA_EXTRACTORS', 'Starting skin tone extraction from scan data', {
    clientScanId,
    uploadedPhotosCount: uploadedPhotos?.length || 0,
    hasEstimateResult: !!estimateResult,
    hasExtractedData: !!estimateResult?.extracted_data
  });

  // Priority 1: From photos capture reports (most reliable)
  for (const [index, photo] of (uploadedPhotos || []).entries()) {
    const skinTone = photo?.report?.skin_tone;
    if (skinTone && typeof skinTone === 'object' && 
        typeof skinTone.r === 'number' && typeof skinTone.g === 'number' && typeof skinTone.b === 'number') {
      logger.info('DATA_EXTRACTORS', 'Found skin tone from photo capture report', {
        clientScanId,
        photoIndex: index,
        photoView: photo?.view,
        skinTone: `rgb(${skinTone.r}, ${skinTone.g}, ${skinTone.b})`,
        confidence: skinTone.confidence || 'unknown',
        source: 'photo_capture_report'
      });
      return skinTone;
    }
  }

  // Priority 2: From estimate extracted_data
  const extractedSkinTone = estimateResult?.extracted_data?.skin_tone;
  if (extractedSkinTone && typeof extractedSkinTone === 'object' && 
      typeof extractedSkinTone.r === 'number' && typeof extractedSkinTone.g === 'number' && typeof extractedSkinTone.b === 'number') {
    logger.info('DATA_EXTRACTORS', 'Found skin tone from estimate extracted_data', {
      clientScanId,
      skinTone: `rgb(${extractedSkinTone.r}, ${extractedSkinTone.g}, ${extractedSkinTone.b})`,
      confidence: extractedSkinTone.confidence || 'unknown',
      source: 'estimate_extracted_data'
    });
    return extractedSkinTone;
  }

  // Fallback: Use neutral skin tone
  const fallbackSkinTone = { r: 153, g: 108, b: 78, confidence: 0.5 };
  logger.warn('DATA_EXTRACTORS', 'Using fallback skin tone', {
    clientScanId,
    fallbackSkinTone: `rgb(${fallbackSkinTone.r}, ${fallbackSkinTone.g}, ${fallbackSkinTone.b})`,
    reason: 'no_valid_skin_tone_found_in_scan_data',
    source: 'fallback'
  });

  return fallbackSkinTone;
}

/**
 * Extract limb masses from scan data with fallback strategy
 */
function extractLimbMassesFromScanData(
  matchResult: any,
  estimateResult: any,
  clientScanId: string
): Record<string, number> {
  logger.info('DATA_EXTRACTORS', 'Starting limb masses extraction from scan data', {
    clientScanId,
    hasMatchResult: !!matchResult,
    hasEstimateResult: !!estimateResult,
    matchResultKeys: matchResult ? Object.keys(matchResult) : []
  });

  // Priority 1: From match result limb masses
  if (matchResult?.limb_masses && typeof matchResult.limb_masses === 'object') {
    logger.info('DATA_EXTRACTORS', 'Found limb masses from match result', {
      clientScanId,
      limbMassesKeys: Object.keys(matchResult.limb_masses),
      source: 'match_result_limb_masses'
    });
    return matchResult.limb_masses;
  }

  // Priority 2: From estimate result limb masses
  if (estimateResult?.limb_masses && typeof estimateResult.limb_masses === 'object') {
    logger.info('DATA_EXTRACTORS', 'Found limb masses from estimate result', {
      clientScanId,
      limbMassesKeys: Object.keys(estimateResult.limb_masses),
      source: 'estimate_result_limb_masses'
    });
    return estimateResult.limb_masses;
  }

  // Fallback: Use default limb masses
  const fallbackLimbMasses = {
    armMass: 1.0,
    legMass: 1.0,
    torsoMass: 1.0,
    neckMass: 1.0,
    headMass: 1.0
  };
  
  logger.warn('DATA_EXTRACTORS', 'Using fallback limb masses', {
    clientScanId,
    fallbackLimbMasses,
    reason: 'no_valid_limb_masses_found_in_scan_data',
    source: 'fallback'
  });

  return fallbackLimbMasses;
}

/**
 * Extract user profile data from scan sources with fallback strategy
 */
function extractUserProfileFromSources(
  profile: any,
  // Corrected parameter name and type
  scanResults: any, 
): { sex: string | null; height_cm: number | null; weight_kg: number | null } {
  logger.info('DATA_EXTRACTORS', 'Starting user profile extraction from sources', {
    hasProfile: !!profile,
    source: 'user_profile_extraction'
  });

  const extractedProfile = {
    sex: profile?.sex || null,
    height_cm: profile?.height_cm || null,
    weight_kg: profile?.weight_kg || null
  };

  logger.info('DATA_EXTRACTORS', 'User profile extracted from sources', {
    extractedProfile,
    source: 'user_profile_extraction'
  });

  return extractedProfile;
}

/**
 * Resolve gender from scan sources with fallback strategy
 * Returns 'masculine' or 'feminine' for consistency with DB enums.
 */
function resolveGenderFromSources(
  profile: any,
  scanResults: any, // This parameter is not used in this function, but kept for signature consistency
  debug: boolean, // This parameter is not used in this function, but kept for signature consistency
  clientScanId: string // This parameter is not used in this function, but kept for signature consistency
): 'masculine' | 'feminine' {
  logger.info('DATA_EXTRACTORS', 'Starting gender resolution from sources', {
    hasProfile: !!profile,
    profileSex: profile?.sex,
    source: 'gender_resolution'
  });

  // Priority 1: From user profile sex
  if (profile?.sex) {
    // Ensure the returned value is 'masculine' or 'feminine'
    const resolvedGender = profile.sex === 'male' ? 'masculine' : 'feminine';
    logger.info('DATA_EXTRACTORS', 'Gender resolved from user profile', {
      profileSex: profile.sex,
      resolvedGender,
      source: 'user_profile_sex'
    });
    return resolvedGender;
  }

  // Fallback: Default to masculine
  const fallbackGender = 'masculine';
  logger.warn('DATA_EXTRACTORS', 'Using fallback gender', {
    fallbackGender,
    reason: 'no_valid_sex_found_in_profile',
    source: 'fallback'
  });

  return fallbackGender;
}

export { 
  extractSkinToneFromScanData, 
  extractLimbMassesFromScanData,
  extractUserProfileFromSources,
  resolveGenderFromSources
};

