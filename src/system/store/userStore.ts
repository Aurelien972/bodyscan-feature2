import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '../../domain/profile';
import logger from '../../lib/utils/logger';

type Role = 'user' | 'coach' | 'admin';

type SessionInfo = {
  userId: string;
  role: Role;
  email?: string;
  displayName?: string;
};

/**
 * Utility function to convert empty strings to null
 */
function emptyStringToNull(value: any): any {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return value;
}

/**
 * Clean profile data by converting empty strings to null
 */
function cleanProfileForStorage(profile: Profile | null): Profile | null {
  if (!profile) return null;
  
  return {
    ...profile,
    displayName: emptyStringToNull(profile.displayName),
    phoneNumber: emptyStringToNull(profile.phoneNumber),
    sex: emptyStringToNull(profile.sex),
    activity_level: emptyStringToNull(profile.activity_level),
    job_category: emptyStringToNull(profile.job_category),
    objective: emptyStringToNull(profile.objective),
    birthdate: emptyStringToNull(profile.birthdate),
    portraitUrl: emptyStringToNull(profile.portraitUrl),
    avatarUrl: emptyStringToNull(profile.avatarUrl),
    portraitSource: emptyStringToNull(profile.portraitSource),
    avatarStatus: emptyStringToNull(profile.avatarStatus),
  };
}

// Stable storage key to prevent conflicts
const STORAGE_KEY = 'fastlift:userstore:main';

type Profile = UserProfile & {
  id: string;
  displayName?: string;
  phoneNumber?: string;
  avatarStatus?: 'none' | 'pending' | 'ready' | 'error';
  avatarUrl?: string;
  avatarOnboardingCompleted?: boolean;
  portraitUrl?: string;
  portraitSource?: string;
  // Legacy fields for backward compatibility
  preferences?: any;
};

type UserState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  saving: boolean;
  initialized: boolean;
  sessionReady: boolean;
  
  // Consolidated auth state
  sessionInfo: SessionInfo | null;
  authReady: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  setSessionReady: (ready: boolean) => void;
  setSessionInfo: (s: SessionInfo | null) => void;
  setAuthReady: (ready: boolean) => void;
  fetchProfile: () => Promise<void>;
  setProfile: (updates: Partial<Profile>) => void;
  saveProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      profile: null,
      loading: false,
      saving: false,
      initialized: false,
      sessionReady: false,
      sessionInfo: null,
      authReady: false,

      setSession: (session) => {
        set({ 
          session, 
          user: session?.user || null,
          initialized: true,
          authReady: !!session?.user, // Set authReady based on actual session
          sessionInfo: session?.user ? {
            userId: session.user.id,
            role: 'user',
            email: session.user.email || undefined,
            displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || undefined,
          } : null,
        });
        
        // Log authentication state change
        logger.debug('USER_STORE', 'Session updated', { hasSession: !!session, hasUser: !!session?.user, authReady: !!session?.user });
        
        // Fetch profile immediately after session is set
        if (session?.user) {
          setTimeout(() => {
            get().fetchProfile();
          }, 100);
        }
      },

      setSessionReady: (sessionReady) => {
        set({ sessionReady });
      },

      setSessionInfo: (sessionInfo) => {
        set({ sessionInfo });
      },

      setAuthReady: (authReady) => {
        set({ authReady });
      },

      setProfile: (updates) => {
        // Handle null updates (e.g., during sign-out)
        if (updates === null) {
          set({ profile: null });
          return;
        }
        
        set(state => ({
          profile: { 
            ...state.profile, 
            ...updates,
            // Ensure nested objects are properly merged
            preferences: updates.preferences ? {
              ...state.profile?.preferences,
              ...updates.preferences
            } : state.profile?.preferences
          }
        }));
      },

      fetchProfile: async () => {
        const { session } = get();
        logger.debug('USER_STORE', 'fetchProfile called', { hasSession: !!session, userId: session?.user?.id });
        
        if (!session?.user?.id) return;
        
        set({ loading: true });
        
        try {
          const { supabase } = await import('../supabase/client');
          
          logger.info('USER_STORE_FETCH_PROFILE', 'Starting profile fetch from database', {
            userId: session.user.id,
            timestamp: new Date().toISOString(),
            philosophy: 'profile_fetch_audit'
          });
          
          const { data, error } = await supabase
            .from('user_profile')
            .select('*')
            .eq('user_id', session.user.id)
            .limit(1);
          
          // DEBUG: Log raw database response
          logger.info('USER_STORE_FETCH_PROFILE', 'Raw DB response received', { 
            hasData: !!data, 
            dataLength: data?.length || 0,
            hasError: !!error,
            errorMessage: error?.message,
            rawProfileData: data && data.length > 0 ? {
              user_id: data[0].user_id,
              display_name: data[0].display_name,
              sex: data[0].sex,
              height_cm: data[0].height_cm,
              weight_kg: data[0].weight_kg,
              target_weight_kg: data[0].target_weight_kg,
              activity_level: data[0].activity_level,
              objective: data[0].objective,
              birthdate: data[0].birthdate,
              hasPreferences: !!data[0].preferences,
              preferencesKeys: data[0].preferences ? Object.keys(data[0].preferences) : []
            } : null,
            philosophy: 'raw_db_response_audit'
          });
          
          // CRITICAL AUDIT: Log raw DB response for skin_tone debugging
          if (data && data.length > 0 && data[0].preferences?.skin_tone) {
            logger.info('USER_STORE_CRITICAL_AUDIT', 'AUDIT: Raw DB response contains skin_tone', {
              rawDbSkinTone: data[0].preferences.skin_tone,
              rawDbSkinToneType: typeof data[0].preferences.skin_tone,
              rawDbSkinToneKeys: data[0].preferences.skin_tone ? Object.keys(data[0].preferences.skin_tone) : [],
              rawDbSkinToneStringified: data[0].preferences.skin_tone ? JSON.stringify(data[0].preferences.skin_tone) : null,
              hasAllV2PropertiesInRawDb: !!(data[0].preferences.skin_tone?.rgb && data[0].preferences.skin_tone?.hex && data[0].preferences.skin_tone?.srgb_f32 && data[0].preferences.skin_tone?.linear_f32 && data[0].preferences.skin_tone?.schema),
              v2PropertiesIntegrityInRawDb: data[0].preferences.skin_tone ? {
                rgb: data[0].preferences.skin_tone.rgb,
                hex: data[0].preferences.skin_tone.hex,
                srgb_f32: data[0].preferences.skin_tone.srgb_f32,
                linear_f32: data[0].preferences.skin_tone.linear_f32,
                schema: data[0].preferences.skin_tone.schema,
                source: data[0].preferences.skin_tone.source,
                confidence: data[0].preferences.skin_tone.confidence
              } : null,
              philosophy: 'raw_db_response_skin_tone_audit'
            });
          }
          
          // Check if profile exists
          const fetchData = data && data.length > 0 ? data[0] : null;
          
          if (error || !fetchData) {
            logger.info('USER_STORE_FETCH_PROFILE', 'No existing profile found, creating new profile', {
              userId: session.user.id,
              hasError: !!error,
              errorMessage: error?.message,
              philosophy: 'new_profile_creation'
            });
            
            // Create new profile for new users
            const newProfile = {
              user_id: session.user.id,
              display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || null,
              sex: null,
              height_cm: null,
              weight_kg: null,
              target_weight_kg: null,
              activity_level: null,
              objective: null,
              avatar_status: 'none' as const,
              preferences: {
                onboardingCompleted: false,
                onboardingSkipped: false,
                profileCompletion: 0.1,
                authProvider: 'email',
              },
              nutrition: { allergies: [], intolerances: [] },
              health: {},
              emotions: {},
            };
            
            try {
              const { data: createdProfile, error: createError } = await supabase
                .from('user_profile')
                .upsert(newProfile, { 
                  onConflict: 'user_id',
                  ignoreDuplicates: false
                })
                .select()
                .single();
                
              if (!createError) {
                const mappedProfile = await mapDbProfileToProfile(createdProfile);
                logger.info('USER_STORE_FETCH_PROFILE', 'New profile created and mapped successfully', {
                  userId: session.user.id,
                  mappedProfileKeys: Object.keys(mappedProfile),
                  hasRequiredFields: !!(mappedProfile.sex && mappedProfile.height_cm && mappedProfile.weight_kg),
                  philosophy: 'new_profile_creation_success'
                });
                set({ profile: mappedProfile });
              } else {
                logger.error('USER_STORE_FETCH_PROFILE', 'Failed to create new profile in DB', {
                  userId: session.user.id,
                  createError: createError.message,
                  philosophy: 'new_profile_creation_db_error'
                });
                set({ 
                  profile: {
                    userId: session.user.id,
                    id: session.user.id,
                    displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
                    sex: null,
                    height_cm: null,
                    weight_kg: null,
                    preferences: {
                      onboardingCompleted: false,
                      onboardingSkipped: false,
                      profileCompletion: 0.1,
                    },
                    nutrition: { allergies: [], intolerances: [] },
                    health: {},
                    emotions: {},
                  } as any
                });
              }
            } catch (createError) {
              logger.error('USER_STORE_FETCH_PROFILE', 'Exception during new profile creation', {
                userId: session.user.id,
                createError: createError instanceof Error ? createError.message : 'Unknown error',
                philosophy: 'new_profile_creation_exception'
              });
              set({ 
                profile: {
                  userId: session.user.id,
                  id: session.user.id,
                  displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
                  sex: null,
                  height_cm: null,
                  weight_kg: null,
                  preferences: {
                    onboardingCompleted: false,
                    onboardingSkipped: false,
                    profileCompletion: 0.1,
                  },
                  nutrition: { allergies: [], intolerances: [] },
                  health: {},
                  emotions: {},
                } as any
              });
            }
          } else {
            const mappedProfile = await mapDbProfileToProfile(fetchData);
            
            logger.info('USER_STORE_FETCH_PROFILE', 'Existing profile fetched and mapped', {
              userId: session.user.id,
              mappedProfileKeys: Object.keys(mappedProfile),
              profileIdentityData: {
                displayName: mappedProfile.displayName,
                sex: mappedProfile.sex,
                height_cm: mappedProfile.height_cm,
                weight_kg: mappedProfile.weight_kg,
                target_weight_kg: mappedProfile.target_weight_kg,
                activity_level: mappedProfile.activity_level,
                objective: mappedProfile.objective,
                birthdate: mappedProfile.birthdate
              },
              hasRequiredFields: !!(mappedProfile.sex && mappedProfile.height_cm && mappedProfile.weight_kg),
              isProfileCompleteForScan: !!(mappedProfile.sex && mappedProfile.height_cm && mappedProfile.weight_kg),
              philosophy: 'existing_profile_fetch_success'
            });
            
            // CRITICAL AUDIT: Log skin_tone after mapping from DB
            if (mappedProfile.preferences?.skin_tone) {
              logger.info('USER_STORE_CRITICAL_AUDIT', 'AUDIT: skin_tone after mapping from DB', {
                mappedSkinTone: mappedProfile.preferences.skin_tone,
                mappedSkinToneType: typeof mappedProfile.preferences.skin_tone,
                mappedSkinToneKeys: mappedProfile.preferences.skin_tone ? Object.keys(mappedProfile.preferences.skin_tone) : [],
                mappedSkinToneStringified: mappedProfile.preferences.skin_tone ? JSON.stringify(mappedProfile.preferences.skin_tone) : null,
                hasAllV2PropertiesAfterMapping: !!(mappedProfile.preferences.skin_tone?.rgb && mappedProfile.preferences.skin_tone?.hex && mappedProfile.preferences.skin_tone?.srgb_f32 && mappedProfile.preferences.skin_tone?.linear_f32 && mappedProfile.preferences.skin_tone?.schema),
                v2PropertiesIntegrityAfterMapping: mappedProfile.preferences.skin_tone ? {
                  rgb: mappedProfile.preferences.skin_tone.rgb,
                  hex: mappedProfile.preferences.skin_tone.hex,
                  srgb_f32: mappedProfile.preferences.skin_tone.srgb_f32,
                  linear_f32: mappedProfile.preferences.skin_tone.linear_f32,
                  schema: mappedProfile.preferences.skin_tone.schema,
                  source: mappedProfile.preferences.skin_tone.source,
                  confidence: mappedProfile.preferences.skin_tone.confidence
                } : null,
                philosophy: 'mapped_skin_tone_after_db_fetch_audit'
              });
            }
            
            // DETAILED SKIN TONE AUDIT - AFTER MAPPING
            if (mappedProfile.preferences?.skin_tone) {
              logger.info('USER_STORE', 'DETAILED SKIN TONE AUDIT - After mapping from DB', {
                userId: session.user.id,
                mappedSkinTone: mappedProfile.preferences.skin_tone,
                skinToneType: typeof mappedProfile.preferences.skin_tone,
                skinToneConstructor: mappedProfile.preferences.skin_tone.constructor?.name,
                skinToneKeys: Object.keys(mappedProfile.preferences.skin_tone),
                skinToneStringified: JSON.stringify(mappedProfile.preferences.skin_tone),
                hasRgbAfterMapping: !!mappedProfile.preferences.skin_tone.rgb,
                hasLinearF32AfterMapping: !!mappedProfile.preferences.skin_tone.linear_f32,
                hasSrgbF32AfterMapping: !!mappedProfile.preferences.skin_tone.srgb_f32,
                hasHexAfterMapping: !!mappedProfile.preferences.skin_tone.hex,
                hasSchemaAfterMapping: !!mappedProfile.preferences.skin_tone.schema,
                rgbValueAfterMapping: mappedProfile.preferences.skin_tone.rgb,
                linearF32ValueAfterMapping: mappedProfile.preferences.skin_tone.linear_f32,
                srgbF32ValueAfterMapping: mappedProfile.preferences.skin_tone.srgb_f32,
                hexValueAfterMapping: mappedProfile.preferences.skin_tone.hex,
                schemaValueAfterMapping: mappedProfile.preferences.skin_tone.schema,
                philosophy: 'mapped_skin_tone_structure_audit_after_db_fetch'
              });
            }
            
            set({ profile: mappedProfile });
          }
          
        } catch (error) {
          logger.error('USER_STORE_FETCH_PROFILE', 'Exception during profile fetch', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userId: session?.user?.id,
            philosophy: 'profile_fetch_exception'
          });
        } finally {
          set({ loading: false });
        }
      },

      saveProfile: async () => {
        const { session, profile } = get();
        if (!session?.user?.id || !profile) return;
        
        logger.info('USER_STORE_UPDATE_PROFILE', 'Starting profile update', {
          userId: session.user.id,
          updateKeys: Object.keys(profile),
          updateValues: profile,
          currentProfileKeys: Object.keys(profile),
          philosophy: 'profile_update_start'
        });
        
        set({ saving: true });
        try {
          const { supabase } = await import('../supabase/client');
          const dbProfile = mapProfileToDb(profile, session.user.id);
          
          const { data, error } = await supabase
            .from('user_profile')
            .upsert(dbProfile)
            .select()
            .single();
            
          if (error) throw error;
          set({ profile: await mapDbProfileToProfile(data) });
        } catch (error) {
          throw error;
        } finally {
          set({ saving: false });
        }
      },

      updateProfile: async (updates) => {
        const { session } = get();
        if (!session?.user?.id) return;
        
        // Optimistic update - update local state immediately
        const currentProfile = get().profile;
        if (currentProfile) {
          set({ 
            profile: { 
              ...currentProfile, 
              ...updates,
              // Ensure nested objects are properly merged
              preferences: updates.preferences ? {
                ...currentProfile.preferences,
                ...updates.preferences
              } : currentProfile.preferences
            }
          });
        }
        
        try {
          const { supabase } = await import('../supabase/client');
          const dbUpdates = mapProfileUpdatesToDb(updates);
          
          // Ensure user_id is included for upsert operation
          dbUpdates.user_id = session.user.id;
          
          const { data, error } = await supabase
            .from('user_profile')
            .upsert(dbUpdates, { onConflict: 'user_id' })
            .select()
            .single();
            
          if (error) throw error;
          
          // Update with confirmed data from database
          set({ profile: await mapDbProfileToProfile(data) });
        } catch (error) {
          // Rollback optimistic update on error
          if (currentProfile) {
            set({ profile: currentProfile });
          }
          throw error;
        }
      },

      // Avatar generation progress (local state only)
      setAvatarGenerationProgress: (progress, stage) => {
        set(state => ({
          profile: state.profile ? {
            ...state.profile,
            avatarGenerationProgressPercentage: progress,
            avatarGenerationStage: stage,
          } : state.profile,
          refreshKey: Date.now(), // Force UI refresh
        }));
      },

      // Reset avatar generation state (force clear stuck state)
      resetAvatarGeneration: async () => {
        const { session } = get();
        if (!session?.user?.id) return;
        
        set({ saving: true });
        try {
          const { supabase } = await import('../supabase/client');
          
          // Clear all avatar generation state in database
          const { error } = await supabase
            .from('user_profile')
            .update({
              avatar_generation_status: 'idle',
              avatar_generation_stage: null,
              avatar_generation_progress_percentage: 0,
              avatar_generation_script_index: 0,
              avatar_generation_script_length: 0,
              avatar_generation_fallback: false,
              avatar_creation_progress: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', session.user.id);
            
          if (error) throw error;
          
          // Update local state
          set(state => ({
            profile: state.profile ? {
              ...state.profile,
              avatarGenerationStatus: 'idle',
              avatarGenerationStage: null,
              avatarGenerationProgressPercentage: 0,
              avatarGenerationScriptIndex: 0,
              avatarGenerationScriptLength: 0,
              avatarGenerationFallback: false,
              avatarCreationProgress: null,
            } : state.profile,
          }));
          
          logger.info('USER_STORE', 'Avatar generation state reset successfully', {
            userId: session.user.id,
            philosophy: 'avatar_generation_reset'
          });
        } catch (error) {
          logger.error('USER_STORE', 'Failed to reset avatar generation state', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: session.user.id,
            philosophy: 'avatar_generation_reset_error'
          });
          throw error;
        } finally {
          set({ saving: false });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        session: state.session,
        profile: state.profile,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        // Clean profile data from storage to convert empty strings to null
        profile: cleanProfileForStorage((persistedState as any)?.profile),
        loading: currentState.loading,
        saving: currentState.saving,
      }),
    }
  )
);

// Helper function to map camelCase profile updates to snake_case database columns
function mapProfileUpdatesToDb(updates: Partial<Profile>): any {
  const DB_COLUMNS = new Set([
    'user_id', 'display_name', 'birthdate', 'sex', 'height_cm', 'weight_kg', 
    'target_weight_kg', 'body_fat_perc', 'activity_level', 'job_category', 'phone_number',
    'objective', 'avatar_status', 'avatar_url', 'created_at', 'updated_at',
    'goals', 'constraints', 'preferences', 'emotion_baseline', 'role',
    'emotions', 'nutrition', 'health', 'avatar_onboarding_completed',
    'portrait_url', 'portrait_source'
  ]);

  // Text fields that should be null instead of empty strings
  const TEXT_FIELDS = new Set([
    'display_name', 'phone_number', 'sex', 'objective', 'activity_level', 'job_category', 'birthdate'
  ]);
  
  function camelToSnake(key: string): string {
    return key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
  }

  const dbUpdates: any = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    
    const snakeKey = camelToSnake(key);
    if (DB_COLUMNS.has(snakeKey)) {
      // Convert empty strings to null for text fields
      if (TEXT_FIELDS.has(snakeKey) && value === '') {
        dbUpdates[snakeKey] = null;
      } else {
        dbUpdates[snakeKey] = value;
      }
    } else if (key === 'preferences' && typeof value === 'object') {
      // MODIFIED: Merge preferences instead of replacing
      dbUpdates.preferences = {
        ...(get().profile?.preferences || {}), // Get current preferences from store
        ...value
      };
      
      // CRITICAL AUDIT: Log skin_tone in preferences before DB update
      if (value.skin_tone) {
        logger.info('USER_STORE_CRITICAL_AUDIT', 'AUDIT: skin_tone in preferences before DB update', {
          skinToneInPreferences: value.skin_tone,
          skinToneType: typeof value.skin_tone,
          skinToneKeys: value.skin_tone ? Object.keys(value.skin_tone) : [],
          skinToneStringified: value.skin_tone ? JSON.stringify(value.skin_tone) : null,
          hasAllV2Properties: !!(value.skin_tone?.rgb && value.skin_tone?.hex && value.skin_tone?.srgb_f32 && value.skin_tone?.linear_f32 && value.skin_tone?.schema),
          v2PropertiesIntegrity: value.skin_tone ? {
            rgb: value.skin_tone.rgb,
            hex: value.skin_tone.hex,
            srgb_f32: value.skin_tone.srgb_f32,
            linear_f32: value.skin_tone.linear_f32,
            schema: value.skin_tone.schema,
            source: value.skin_tone.source,
            confidence: value.skin_tone.confidence
          } : null,
          // CRITICAL: Validate linear_f32 integrity before DB save
          linearF32Integrity: value.skin_tone?.linear_f32 ? {
            hasLinearF32: !!value.skin_tone.linear_f32,
            linearF32Type: typeof value.skin_tone.linear_f32,
            linearF32Keys: value.skin_tone.linear_f32 ? Object.keys(value.skin_tone.linear_f32) : [],
            linearF32Values: value.skin_tone.linear_f32 ? {
              r: value.skin_tone.linear_f32.r,
              g: value.skin_tone.linear_f32.g,
              b: value.skin_tone.linear_f32.b
            } : null,
            linearF32AllFinite: value.skin_tone.linear_f32 ? 
              Number.isFinite(value.skin_tone.linear_f32.r) && 
              Number.isFinite(value.skin_tone.linear_f32.g) && 
              Number.isFinite(value.skin_tone.linear_f32.b) : false,
            linearF32InRange: value.skin_tone.linear_f32 ? 
              value.skin_tone.linear_f32.r >= 0 && value.skin_tone.linear_f32.r <= 1 &&
              value.skin_tone.linear_f32.g >= 0 && value.skin_tone.linear_f32.g <= 1 &&
              value.skin_tone.linear_f32.b >= 0 && value.skin_tone.linear_f32.b <= 1 : false
          } : null,
          philosophy: 'preferences_skin_tone_before_db_update_audit'
        });
      }
      
      // CRITICAL: Enhanced logging for avatar payload updates
      if (value.avatar_version || value.final_shape_params || value.final_limb_masses || value.skin_tone) {
        logger.debug('USER_STORE', 'Avatar payload update detected in preferences', {
          avatarVersion: value.avatar_version,
          hasFinalShapeParams: !!value.final_shape_params,
          finalShapeParamsCount: value.final_shape_params ? Object.keys(value.final_shape_params).length : 0,
          hasFinalLimbMasses: !!value.final_limb_masses,
          finalLimbMassesCount: value.final_limb_masses ? Object.keys(value.final_limb_masses).length : 0,
          hasSkinTone: !!value.skin_tone,
          skinToneRGB: value.skin_tone ? `rgb(${value.skin_tone.r}, ${value.skin_tone.g}, ${value.skin_tone.b})` : 'none',
          hasResolvedGender: !!value.resolved_gender,
          resolvedGender: value.resolved_gender,
          gltfModelId: value.gltf_model_id,
          materialConfigVersion: value.material_config_version,
          mappingVersion: value.mapping_version,
          philosophy: 'avatar_payload_preferences_update'
        });
      }
    }
  }
  
  return dbUpdates;
}

// Helper functions to map between DB and store formats
async function mapDbProfileToProfile(dbProfile: any): Promise<Profile> {
  // CRITICAL: Validate and correct skin_tone data on retrieval
  let correctedPreferences = dbProfile.preferences || {};
  
  if (correctedPreferences.skin_tone) {
    logger.info('USER_STORE_SKIN_TONE_CORRECTION', 'CRITICAL: Validating skin_tone on profile retrieval', {
      originalSkinTone: correctedPreferences.skin_tone,
      originalSkinToneType: typeof correctedPreferences.skin_tone,
      originalSkinToneKeys: Object.keys(correctedPreferences.skin_tone),
      hasLinearF32: !!correctedPreferences.skin_tone.linear_f32,
      linearF32Value: correctedPreferences.skin_tone.linear_f32,
      hasRgb: !!correctedPreferences.skin_tone.rgb,
      rgbValue: correctedPreferences.skin_tone.rgb,
      philosophy: 'skin_tone_validation_on_retrieval'
    });
    
    try {
      const { isSkinToneV2, createCompleteSkinTone } = await import('../../lib/scan/normalizeSkinTone');
      
      // Check if skin_tone is valid V2 format
      if (!isSkinToneV2(correctedPreferences.skin_tone)) {
        logger.warn('USER_STORE_SKIN_TONE_CORRECTION', 'Invalid V2 format detected, converting to V2', {
          invalidSkinTone: correctedPreferences.skin_tone,
          philosophy: 'invalid_v2_format_conversion'
        });
        
        // Convert to V2 format if it has RGB values
        if (correctedPreferences.skin_tone.r !== undefined && 
            correctedPreferences.skin_tone.g !== undefined && 
            correctedPreferences.skin_tone.b !== undefined) {
          correctedPreferences.skin_tone = createCompleteSkinTone(
            correctedPreferences.skin_tone.r,
            correctedPreferences.skin_tone.g,
            correctedPreferences.skin_tone.b,
            correctedPreferences.skin_tone.source || 'legacy_converted_on_retrieval',
            correctedPreferences.skin_tone.confidence || 0.5
          );
          
          logger.info('USER_STORE_SKIN_TONE_CORRECTION', 'Successfully converted legacy to V2 on retrieval', {
            convertedSkinTone: correctedPreferences.skin_tone,
            philosophy: 'legacy_to_v2_conversion_on_retrieval'
          });
        }
      } else {
        // V2 format but validate linear_f32 integrity
        const skinTone = correctedPreferences.skin_tone;
        const hasValidLinearF32 = skinTone.linear_f32 && 
          typeof skinTone.linear_f32.r === 'number' && Number.isFinite(skinTone.linear_f32.r) &&
          typeof skinTone.linear_f32.g === 'number' && Number.isFinite(skinTone.linear_f32.g) &&
          typeof skinTone.linear_f32.b === 'number' && Number.isFinite(skinTone.linear_f32.b);
        
        if (!hasValidLinearF32 && skinTone.rgb) {
          logger.warn('USER_STORE_SKIN_TONE_CORRECTION', 'V2 format but invalid linear_f32, regenerating', {
            originalLinearF32: skinTone.linear_f32,
            rgbValues: skinTone.rgb,
            philosophy: 'v2_linear_f32_corruption_fix'
          });
          
          // Regenerate complete V2 skin tone from RGB
          correctedPreferences.skin_tone = createCompleteSkinTone(
            skinTone.rgb.r,
            skinTone.rgb.g,
            skinTone.rgb.b,
            skinTone.source || 'regenerated_on_retrieval',
            skinTone.confidence || 0.5
          );
          
          logger.info('USER_STORE_SKIN_TONE_CORRECTION', 'Successfully regenerated V2 skin tone with valid linear_f32', {
            regeneratedSkinTone: correctedPreferences.skin_tone,
            newLinearF32: correctedPreferences.skin_tone.linear_f32,
            philosophy: 'v2_regeneration_with_valid_linear_f32'
          });
        } else {
          logger.info('USER_STORE_SKIN_TONE_CORRECTION', 'V2 skin tone is valid, no correction needed', {
            validSkinTone: skinTone,
            validLinearF32: skinTone.linear_f32,
            philosophy: 'v2_skin_tone_valid_no_correction'
          });
        }
      }
    } catch (importError) {
      logger.error('USER_STORE_SKIN_TONE_CORRECTION', 'Failed to import skin tone utilities', {
        error: importError instanceof Error ? importError.message : 'Unknown error',
        philosophy: 'skin_tone_correction_import_failed'
      });
    }
  }
  
  return {
    userId: dbProfile.user_id,
    id: dbProfile.user_id,
    displayName: emptyStringToNull(dbProfile.display_name),
    phoneNumber: emptyStringToNull(dbProfile.phone_number),
    birthdate: emptyStringToNull(dbProfile.birthdate || dbProfile.dob),
    sex: emptyStringToNull(dbProfile.sex),
    height_cm: dbProfile.height_cm,
    weight_kg: dbProfile.weight_kg,
    target_weight_kg: dbProfile.target_weight_kg,
    bodyFatPerc: dbProfile.body_fat_perc,
    activity_level: emptyStringToNull(dbProfile.activity_level),
    job_category: emptyStringToNull(dbProfile.job_category),
    objective: emptyStringToNull(dbProfile.objective),
    nutrition: {
      ...(dbProfile.nutrition || {}),
      allergies: Array.isArray(dbProfile.nutrition?.allergies) ? dbProfile.nutrition.allergies : [],
      intolerances: Array.isArray(dbProfile.nutrition?.intolerances) ? dbProfile.nutrition.intolerances : [],
    },
    health: dbProfile.health || {},
    emotions: dbProfile.emotions || {},
    // Legacy support
    goals: dbProfile.goals || {},
    constraints: dbProfile.constraints || {},
    preferences: correctedPreferences,
    emotionBaseline: dbProfile.emotion_baseline || {},
    avatarStatus: emptyStringToNull(dbProfile.avatar_status),
    avatarUrl: emptyStringToNull(dbProfile.avatar_url),
    avatarOnboardingCompleted: dbProfile.avatar_onboarding_completed,
    portraitUrl: emptyStringToNull(dbProfile.portrait_url),
    portraitSource: emptyStringToNull(dbProfile.portrait_source),
  };
}

function mapProfileToDb(profile: Profile, userId: string): any {
  return {
    user_id: userId,
    display_name: profile.displayName,
    phone_number: profile.phoneNumber,
    birthdate: profile.birthdate,
    sex: profile.sex,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    target_weight_kg: profile.target_weight_kg,
    activity_level: profile.activity_level,
    job_category: profile.job_category,
    objective: profile.objective,
    portrait_url: profile.portraitUrl,
    portrait_source: profile.portraitSource,
    preferences: profile.preferences || {},
    avatar_status: profile.avatarStatus,
    avatar_url: profile.avatarUrl,
    avatar_onboarding_completed: profile.avatarOnboardingCompleted,
  };
}
