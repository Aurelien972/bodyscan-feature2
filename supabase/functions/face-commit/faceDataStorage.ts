// supabase/functions/face-commit/faceDataStorage.ts
import { createClient } from 'npm:@supabase/supabase-js@2.54.0';

interface FaceScanRecord {
  id: string;
  user_id: string;
  active: boolean;
  final_face_params: Record<string, number>;
  archetype_mix: any; // From match_result
  skin_tone: any; // From estimate_result
  head_model_url: string; // Derived from resolvedGender
  preview_url: string; // Placeholder or derived
  estimate_result: any;
  semantic_result: any;
  match_result: any;
  refine_result: any;
  photos_metadata: any[];
  resolved_gender: 'masculine' | 'feminine'; // MODIFIED: Use DB enum
  client_scan_id: string;
  // ADDED: New fields for face scan data
  client_scan_id: string;
  estimate_result: any;
  match_result: any;
  refine_result: any;
  semantic_result: any;
  photos_metadata: any[];
  resolved_gender: 'masculine' | 'feminine';
  skin_tone: any;
}

/**
 * Stores complete face scan data in the user_face_profiles table.
 * This function also handles setting the new scan as active and deactivating previous ones.
 */
export async function storeFaceScanData(
  supabase: ReturnType<typeof createClient>,
  scanId: string,
  data: {
    user_id: string;
    estimate_result: any;
    semantic_result: any;
    match_result: any;
    refine_result: any;
    photos_metadata: any[];
    resolvedGender: 'masculine' | 'feminine'; // MODIFIED: Use DB enum
    skin_tone?: any;
    clientScanId: string;
  }
): Promise<FaceScanRecord> {
  console.log('🔍 [faceDataStorage] Storing face scan data for user:', data.user_id);

  const { user_id, estimate_result, semantic_result, match_result, refine_result, photos_metadata, resolvedGender, skin_tone, clientScanId } = data;

  // Deactivate any previously active face profiles for this user
  const { error: deactivateError } = await supabase
    .from('user_face_profiles')
    .update({ active: false })
    .eq('user_id', user_id)
    .eq('active', true);

  if (deactivateError) {
    console.error('❌ [faceDataStorage] Failed to deactivate previous face profiles:', deactivateError);
    // Continue despite error, as it's not critical for the new insert
  } else {
    console.log('✅ [faceDataStorage] Deactivated previous active face profiles.');
  }

  // Prepare the new face scan record
  const newFaceScan: FaceScanRecord = {
    id: scanId,
    user_id: user_id,
    active: true, // Set this new scan as active
    final_face_params: refine_result.final_face_params, // Use canonical keys from refine_result
    archetype_mix: match_result.selected_archetypes, // Store selected archetypes as mix
    skin_tone: skin_tone || estimate_result.extracted_data?.skin_tone, // Use direct skin tone or fallback to estimate
    head_model_url: `https://your-cdn.com/models/${resolvedGender}-head.glb`, // Placeholder URL
    preview_url: photos_metadata[0]?.url || 'https://your-cdn.com/default-preview.jpg', // Use front photo as preview
    estimate_result: estimate_result,
    semantic_result: semantic_result,
    match_result: match_result,
    refine_result: refine_result,
    photos_metadata: photos_metadata,
    resolved_gender: resolvedGender,
    client_scan_id: clientScanId,
  };

  // Insert the new face scan record
  const { data: insertedRecord, error: insertError } = await supabase
    .from('user_face_profiles')
    .insert([newFaceScan])
    .select()
    .single();

  if (insertError) {
    console.error('❌ [faceDataStorage] Failed to store face scan data:', insertError);
    throw new Error(`Failed to store face scan data: ${insertError.message}`);
  }

  console.log('✅ [faceDataStorage] Face scan data stored successfully:', insertedRecord.id);
  return insertedRecord;
}

