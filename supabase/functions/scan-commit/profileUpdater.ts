/**
 * Updates the user_profile table with the latest scan data and preferences.
 */ export async function updateUserProfile(supabase, userId, estimateResult, matchResult, semanticResult, aiRefinementResult, resolvedGender, finalShapeParams, finalLimbMasses, skinTone, gltfModelId, materialConfigVersion, mappingVersion, avatarVersion) {
  console.log('🔍 [profileUpdater] Updating user profile for user:', userId);
  // Fetch current user profile to merge preferences
  const { data: currentProfile, error: fetchError } = await supabase.from('user_profile').select('preferences').eq('user_id', userId).single();
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('❌ [profileUpdater] Failed to fetch current user profile:', fetchError);
  // Continue despite error, as upsert will handle creation if profile doesn't exist
  }
  // Prepare the new avatar data for preferences
  const newAvatarPreferences = {
    final_shape_params: finalShapeParams,
    final_limb_masses: finalLimbMasses,
    skin_tone: skinTone,
    resolved_gender: resolvedGender,
    gltf_model_id: gltfModelId,
    material_config_version: materialConfigVersion,
    mapping_version: mappingVersion,
    avatar_version: avatarVersion,
    lastMorphSave: new Date().toISOString()
  };
  // Merge existing preferences with new avatar data
  // CRITICAL: Ensure existing 'face' data is preserved if it exists
  const mergedPreferences = {
    ...currentProfile?.preferences || {},
    ...newAvatarPreferences
  };
  const { error: updateError } = await supabase.from('user_profile').upsert({
    user_id: userId,
    preferences: mergedPreferences,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id'
  } // Upsert based on user_id
  );
  if (updateError) {
    console.error('❌ [profileUpdater] Failed to update user profile:', updateError);
    throw new Error(`Failed to update user profile: ${updateError.message}`);
  }
  console.log('✅ [profileUpdater] User profile updated successfully with latest scan data and merged preferences.');
}
