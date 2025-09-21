// supabase/functions/face-commit/profileUpdater.ts
import { createClient } from 'npm:@supabase/supabase-js@2.54.0';

/**
 * Updates the user_profile table with the active_face_profile_id and preferences.
 */
export async function updateUserProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  faceProfileId: string,
  refineResult: any,
  estimateResult: any,
  skinTone?: any,
): Promise<void> {
  console.log('🔍 [profileUpdater] Updating user profile for user:', userId);

  // Prepare the preferences object for the user_profile table
  const preferencesUpdate = {
    active_face_profile_id: faceProfileId,
    // Store refined face parameters and skin tone in preferences for fast-path access
    face: {
      final_face_params: refineResult.final_face_params,
      skin_tone: skinTone || estimateResult.extracted_data?.skin_tone,
      // Add other relevant fast-path data here
    },
    // Ensure other preferences are merged if they exist
    // This requires fetching current preferences first if not passed in request
  };

  // Fetch current user profile to merge preferences
  const { data: currentProfile, error: fetchError } = await supabase
    .from('user_profile')
    .select('preferences')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('❌ [profileUpdater] Failed to fetch current user profile:', fetchError);
    // Continue despite error, as upsert will handle creation if profile doesn't exist
  }

  const mergedPreferences = {
    ...(currentProfile?.preferences || {}), // Keep existing preferences
    ...preferencesUpdate, // Apply new face preferences
  };

  const { error: updateError } = await supabase
    .from('user_profile')
    .upsert(
      {
        user_id: userId,
        active_face_profile_id: faceProfileId,
        preferences: mergedPreferences,
        updated_at: new Date().toISOString(), // Update timestamp
      },
      { onConflict: 'user_id' } // Upsert based on user_id
    );

  if (updateError) {
    console.error('❌ [profileUpdater] Failed to update user profile:', updateError);
    throw new Error(`Failed to update user profile: ${updateError.message}`);
  }

  console.log('✅ [profileUpdater] User profile updated successfully with active face profile ID and preferences.');
}
