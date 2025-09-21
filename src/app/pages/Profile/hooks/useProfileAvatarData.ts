import React from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../../../../system/store/userStore';
import { resolveSkinTone, isSkinToneV2, type SkinToneV2 } from '../../../../lib/scan/normalizeSkinTone';
import logger from '../../../../lib/utils/logger';

interface ProfileAvatarData {
  hasSavedMorph: boolean;
  finalShapeParams?: Record<string, number>;
  finalLimbMasses?: Record<string, number>;
  skinTone?: SkinToneV2;
  resolvedGender?: 'male' | 'female';
  gltfModelId?: string;
  materialConfigVersion?: string;
  mappingVersion?: string;
  avatarVersion?: string;
  // Legacy compatibility
  morphData?: Record<string, number>;
  morphBounds?: Record<string, { min: number; max: number }>;
  selectedArchetypes?: Array<{
    id: string;
    name: string;
    distance: number;
    weight: number;
  }>;
  scanId?: string;
  userProfile: {
    sex: 'male' | 'female';
    height_cm: number;
    weight_kg: number;
  };
  // Nouveau: Données faciales
  faceMorphData?: Record<string, number>;
  faceResolvedGender?: 'male' | 'female';
  faceClientScanId?: string;
  faceSkinTone?: SkinToneV2;
}

/**
 * Hook for managing profile avatar data
 * Handles data fetching and stable user profile creation
 */
export function useProfileAvatarData() {
  const { profile } = useUserStore();
  const userId = profile?.userId;
  
  // Debug logging for profile data structure
  React.useEffect(() => {
    logger.debug('PROFILE_AVATAR_DATA_DEBUG', 'Profile data structure audit', {
      userId,
      hasProfile: !!profile,
      profileKeys: profile ? Object.keys(profile) : [],
      hasPreferences: !!profile?.preferences,
      preferencesKeys: profile?.preferences ? Object.keys(profile.preferences) : [],
      avatarVersion: profile?.preferences?.avatar_version,
      hasCompletePayload: !!(profile?.preferences?.avatar_version === 'v2.0' && 
                            profile?.preferences?.final_shape_params &&
                            profile?.preferences?.final_limb_masses),
      // Nouveau: Audit des préférences faciales
      hasFacePreferences: !!profile?.preferences?.face,
      facePreferencesKeys: profile?.preferences?.face ? Object.keys(profile.preferences.face) : [],
      philosophy: 'profile_data_structure_debug'
    });
  }, [userId, profile?.preferences?.avatar_version, profile?.preferences?.face]);

  // CRITICAL: Memoize user profile to prevent Avatar3DViewer re-renders
  const stableUserProfile = useMemo(() => {
    if (!profile?.sex || !profile?.height_cm || !profile?.weight_kg) {
      logger.debug('PROFILE_AVATAR_DATA', 'Using fallback user profile', {
        reason: 'missing_profile_data',
        profileSex: profile?.sex,
        profileHeight: profile?.height_cm,
        profileWeight: profile?.weight_kg
      });
      return {
        sex: 'male' as const,
        height_cm: 175,
        weight_kg: 70,
      };
    }
    logger.debug('PROFILE_AVATAR_DATA', 'Using real user profile', {
      sex: profile.sex,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg
    });
    return {
      sex: profile.sex,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
    };
  }, [profile?.sex, profile?.height_cm, profile?.weight_kg]);

  // Fetch saved morph data from user profile
  const { data: latestScanData, isLoading, error } = useQuery({
    queryKey: ['user-saved-morph', userId],
    queryFn: async (): Promise<ProfileAvatarData | null> => {
      if (!userId) return null;
      
      // Enhanced debug logging for data retrieval
      logger.debug('PROFILE_AVATAR_DATA_QUERY', 'Starting avatar data query', {
        userId,
        hasProfile: !!profile,
        hasPreferences: !!profile?.preferences,
        preferencesStructure: profile?.preferences ? {
          avatarVersion: profile.preferences.avatar_version,
          hasFinalShapeParams: !!profile.preferences.final_shape_params,
          finalShapeParamsCount: profile.preferences.final_shape_params ? 
            Object.keys(profile.preferences.final_shape_params).length : 0,
          hasFinalLimbMasses: !!profile.preferences.final_limb_masses,
          finalLimbMassesCount: profile.preferences.final_limb_masses ? 
            Object.keys(profile.preferences.final_limb_masses).length : 0,
          hasSkinTone: !!profile.preferences.skin_tone,
          hasResolvedGender: !!profile.preferences.resolved_gender,
          hasGltfModelId: !!profile.preferences.gltf_model_id,
          hasMaterialConfigVersion: !!profile.preferences.material_config_version,
          // Nouveau: Audit des préférences faciales
          hasFaceData: !!profile.preferences.face,
          faceDataKeys: profile.preferences.face ? Object.keys(profile.preferences.face) : [],
        } : null,
        philosophy: 'avatar_data_query_entry_debug'
      });
      
      // STEP 1: Check for new avatar version (v2.0) with complete payload
      const avatarVersion = profile?.preferences?.avatar_version;
      const hasCompletePayload = avatarVersion === 'v2.0' && 
                                profile?.preferences?.final_shape_params &&
                                profile?.preferences?.final_limb_masses;
      
      // PHASE 3: Enhanced audit with V2 skin tone validation
      logger.info('PROFILE_AVATAR_DATA_V2', 'Complete v2.0 payload validation with V2 skin tone', {
        userId,
        avatarVersion,
        hasCompletePayload,
        // DETAILED SKIN TONE AUDIT IN PROFILE PREFERENCES
        profilePreferencesSkinToneAudit: profile?.preferences?.skin_tone ? {
          skinToneExists: !!profile.preferences.skin_tone,
          skinToneType: typeof profile.preferences.skin_tone,
          skinToneConstructor: profile.preferences.skin_tone.constructor?.name,
          skinToneKeys: Object.keys(profile.preferences.skin_tone),
          skinToneStringified: JSON.stringify(profile.preferences.skin_tone),
          hasRgbProperty: !!profile.preferences.skin_tone.rgb,
          rgbValue: profile.preferences.skin_tone.rgb,
          hasLinearF32Property: !!profile.preferences.skin_tone.linear_f32,
          linearF32Value: profile.preferences.skin_tone.linear_f32,
          hasSrgbF32Property: !!profile.preferences.skin_tone.srgb_f32,
          srgbF32Value: profile.preferences.skin_tone.srgb_f32,
          hasHexProperty: !!profile.preferences.skin_tone.hex,
          hexValue: profile.preferences.skin_tone.hex,
          hasSchemaProperty: !!profile.preferences.skin_tone.schema,
          schemaValue: profile.preferences.skin_tone.schema,
          hasSourceProperty: !!profile.preferences.skin_tone.source,
          sourceValue: profile.preferences.skin_tone.source,
          hasConfidenceProperty: !!profile.preferences.skin_tone.confidence,
          confidenceValue: profile.preferences.skin_tone.confidence,
          isV2Format: profile.preferences.skin_tone.schema === 'v2',
          completeStructure: profile.preferences.skin_tone
        } : null,
        payloadValidation: hasCompletePayload ? {
          finalShapeParamsValid: !!(profile?.preferences?.final_shape_params && 
            Object.keys(profile.preferences.final_shape_params).length > 0),
          finalLimbMassesValid: !!(profile?.preferences?.final_limb_masses && 
            Object.keys(profile.preferences.final_limb_masses).length > 0),
          skinToneV2Valid: !!(profile?.preferences?.skin_tone && 
            isSkinToneV2(profile.preferences.skin_tone)),
          resolvedGenderValid: !!(profile?.preferences?.resolved_gender && 
            ['male', 'female'].includes(profile.preferences.resolved_gender)),
          gltfModelIdValid: !!profile?.preferences?.gltf_model_id,
          materialConfigValid: !!profile?.preferences?.material_config_version
        } : null,
        skinToneV2Data: profile?.preferences?.skin_tone ? {
          schema: profile.preferences.skin_tone.schema,
          rgb: profile.preferences.skin_tone.rgb,
          hex: profile.preferences.skin_tone.hex,
          source: profile.preferences.skin_tone.source,
          confidence: profile.preferences.skin_tone.confidence
        } : null,
        philosophy: 'phase_3_v2_validation_function_entry'
      });
      
      let bodyPayload: Partial<ProfileAvatarData> = {};
      if (hasCompletePayload) {
        // STEP 2: Use complete payload (v2.0) with V2 skin tone resolution
        const resolvedBodySkinToneResult = resolveSkinTone({
          skin_tone: profile.preferences.skin_tone,
        });
        
        bodyPayload = {
          finalShapeParams: profile.preferences.final_shape_params,
          finalLimbMasses: profile.preferences.final_limb_masses,
          skinTone: resolvedBodySkinToneResult.tone,
          resolvedGender: profile.preferences.resolved_gender,
          gltfModelId: profile.preferences.gltf_model_id,
          materialConfigVersion: profile.preferences.material_config_version,
          mappingVersion: profile.preferences.mapping_version,
          avatarVersion: profile.preferences.avatar_version,
          // Legacy compatibility
          morphData: profile.preferences.final_shape_params,
          morphBounds: profile.preferences.morphBounds,
          selectedArchetypes: profile.preferences.selectedArchetypes,
          scanId: profile.preferences.scanId,
        };
        
        // Validate complete payload structure
        const payloadValidation = validateCompletePayload(bodyPayload);
        
        logger.info('PROFILE_AVATAR_DATA_V2', 'Complete payload (v2.0) validation results with V2 skin tone', {
          userId: profile.userId,
          payloadValidation,
          isValid: payloadValidation.isValid,
          issues: payloadValidation.issues,
          skinToneResolution: {
            source: resolvedBodySkinToneResult.source,
            schema: resolvedBodySkinToneResult.tone.schema,
            rgb: resolvedBodySkinToneResult.tone.rgb,
            hex: resolvedBodySkinToneResult.tone.hex
          },
          philosophy: 'phase_3_complete_payload_v2_skin_tone_validation'
        });
        
        if (!payloadValidation.isValid) {
          logger.warn('PROFILE_AVATAR_DATA_V2', 'Complete payload validation failed, falling back to legacy', {
            userId,
            issues: payloadValidation.issues,
            philosophy: 'phase_3_v2_payload_invalid_fallback_to_legacy'
          });
          // Fall through to legacy handling
          bodyPayload = {}; // Clear body payload to force legacy path
        } else {
          logger.info('PROFILE_AVATAR_DATA_V2', 'Using validated complete avatar payload (v2.0) with V2 skin tone', {
            userId,
            avatarVersion: bodyPayload.avatarVersion,
            resolvedGender: bodyPayload.resolvedGender,
            skinToneV2: {
              schema: bodyPayload.skinTone?.schema,
              rgb: bodyPayload.skinTone?.rgb,
              hex: bodyPayload.skinTone?.hex,
              source: bodyPayload.skinTone?.source
            },
            philosophy: 'phase_3_complete_payload_v2_skin_tone_validated_loaded'
          });
        }
      }
      
      // Nouveau: Récupération des données faciales
      let facePayload: Partial<ProfileAvatarData> = {};
      if (profile?.preferences?.face?.final_face_params) {
        const resolvedFaceSkinToneResult = resolveSkinTone({
          skin_tone: profile.preferences.face.skin_tone,
        });

        facePayload = {
          faceMorphData: profile.preferences.face.final_face_params,
          faceSkinTone: resolvedFaceSkinToneResult.tone,
          faceResolvedGender: profile.preferences.face.resolved_gender,
          faceClientScanId: profile.preferences.face.last_face_scan_id,
        };
        logger.info('PROFILE_AVATAR_DATA_V2', 'Face data loaded from preferences', {
          userId,
          faceMorphDataKeys: Object.keys(facePayload.faceMorphData || {}),
          faceSkinToneHex: facePayload.faceSkinTone?.hex,
          philosophy: 'face_data_loaded'
        });
      }

      // STEP 3: Fallback to legacy data (v1.0 or older) for body if v2.0 failed
      const savedMorph = profile?.preferences?.savedMorphData;
      const morphBounds = profile?.preferences?.morphBounds;
      const selectedArchetypes = profile?.preferences?.selectedArchetypes;
      const lastScanId = profile?.preferences?.scanId;
      
      // PHASE 3: Use V2 resolver for legacy data too
      const legacySkinToneResolution = resolveSkinTone({
        skin_tone: profile?.preferences?.skin_tone,
        // Legacy fallback sources (only if no V2 found)
        skinTone: profile?.preferences?.skinTone,
        skinToneLegacy: profile?.preferences?.skinToneLegacy
      });
      
      // CRITICAL AUDIT: Log skin tone resolution for legacy data
      logger.info('PROFILE_AVATAR_DATA_CRITICAL_AUDIT', 'AUDIT: Legacy skin tone resolution', {
        inputToResolver: {
          skin_tone: profile?.preferences?.skin_tone,
          skinTone: profile?.preferences?.skinTone,
          skinToneLegacy: profile?.preferences?.skinToneLegacy
        },
        resolverOutput: {
          source: legacySkinToneResolution.source,
          tone: legacySkinToneResolution.tone,
          toneType: typeof legacySkinToneResolution.tone,
          toneKeys: legacySkinToneResolution.tone ? Object.keys(legacySkinToneResolution.tone) : [],
          toneStringified: legacySkinToneResolution.tone ? JSON.stringify(legacySkinToneResolution.tone) : null,
          hasAllV2Properties: !!(legacySkinToneResolution.tone?.rgb && legacySkinToneResolution.tone?.hex && legacySkinToneResolution.tone?.srgb_f32 && legacySkinToneResolution.tone?.linear_f32 && legacySkinToneResolution.tone?.schema),
          v2PropertiesIntegrity: legacySkinToneResolution.tone ? {
            rgb: legacySkinToneResolution.tone.rgb,
            hex: legacySkinToneResolution.tone.hex,
            srgb_f32: legacySkinToneResolution.tone.srgb_f32,
            linear_f32: legacySkinToneResolution.tone.linear_f32,
            schema: legacySkinToneResolution.tone.schema,
            source: legacySkinToneResolution.tone.source,
            confidence: legacySkinToneResolution.tone.confidence
          } : null
        },
        philosophy: 'legacy_skin_tone_resolution_audit'
      });
      
      if (Object.keys(bodyPayload).length === 0 && savedMorph && Object.keys(savedMorph).length > 0) {
        logger.info('PROFILE_AVATAR_DATA_V2', 'Using legacy avatar data (v1.0 or older) with V2 skin tone', {
          userId,
          avatarVersion: avatarVersion || 'unknown',
          savedMorphCount: Object.keys(savedMorph).length,
          skinToneV2: {
            source: legacySkinToneResolution.source,
            schema: legacySkinToneResolution.tone.schema,
            rgb: legacySkinToneResolution.tone.rgb,
            hex: legacySkinToneResolution.tone.hex
          },
          philosophy: 'phase_3_legacy_avatar_data_v2_skin_tone_loaded'
        });
        
        bodyPayload = {
          // Map legacy data to new structure
          finalShapeParams: savedMorph,
          finalLimbMasses: {}, // Legacy data doesn't have separate limb masses
          skinTone: legacySkinToneResolution.tone,
          resolvedGender: stableUserProfile.sex, // Derive from profile
          gltfModelId: generateModelChecksum(stableUserProfile.sex),
          materialConfigVersion: 'legacy',
          mappingVersion: 'legacy',
          avatarVersion: avatarVersion || 'v1.0',
          // Legacy compatibility
          morphData: savedMorph,
          morphBounds,
          selectedArchetypes,
          scanId: lastScanId,
        };
      }
      
      // STEP 4: No saved avatar data
      if (Object.keys(bodyPayload).length === 0) {
        logger.info('PROFILE_AVATAR_DATA_V2', 'No saved avatar data found', {
          userId,
          hasProfile: !!profile,
          hasPreferences: !!profile?.preferences,
          preferencesKeys: profile?.preferences ? Object.keys(profile.preferences) : [],
          philosophy: 'phase_3_no_saved_avatar_data'
        });
        
        return { 
          hasSavedMorph: false,
          userProfile: stableUserProfile,
          ...facePayload // Inclure les données faciales même si pas de corps
        };
      }

      return { 
        hasSavedMorph: true,
        userProfile: stableUserProfile,
        ...bodyPayload,
        ...facePayload // Fusionner les données faciales
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    latestScanData,
    isLoading,
    error,
    stableUserProfile,
    userId,
    profile,
    lastSaveDate: profile?.preferences?.lastMorphSave,
  };
}

/**
 * Validate complete payload structure for v2.0 with V2 skin tone
 */
function validateCompletePayload(payload: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Validate required fields
  if (!payload.finalShapeParams || Object.keys(payload.finalShapeParams).length === 0) {
    issues.push('Missing or empty finalShapeParams');
  }
  
  if (!payload.finalLimbMasses || Object.keys(payload.finalLimbMasses).length === 0) {
    issues.push('Missing or empty finalLimbMasses');
  }
  
  if (!payload.resolvedGender || !['male', 'female'].includes(payload.resolvedGender)) {
    issues.push('Missing or invalid resolvedGender');
  }
  
  if (!payload.gltfModelId) {
    issues.push('Missing gltfModelId');
  }
  
  if (!payload.materialConfigVersion) {
    issues.push('Missing materialConfigVersion');
  }
  
  if (!payload.avatarVersion || payload.avatarVersion !== 'v2.0') {
    issues.push('Missing or invalid avatarVersion');
  }
  
  // PHASE 3: Validate V2 skin tone structure if present
  if (payload.skinTone) {
    if (!isSkinToneV2(payload.skinTone)) {
      issues.push('Invalid skin tone format - expected V2 schema');
    } else {
      // Additional V2 validation
      if (payload.skinTone.rgb.r < 0 || payload.skinTone.rgb.r > 255 ||
          payload.skinTone.rgb.g < 0 || payload.skinTone.rgb.g > 255 ||
          payload.skinTone.rgb.b < 0 || payload.skinTone.rgb.b > 255) {
        issues.push('Invalid skin tone RGB values (must be 0-255)');
      }
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Generate model checksum for GLTF model identification
 */
function generateModelChecksum(gender: 'male' | 'female'): string {
  const modelVersion = 'v4.13';
  return `${gender}_${modelVersion}`;
}

