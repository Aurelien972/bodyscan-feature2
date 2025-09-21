/**
 * Store body scan data in the database
 */ export async function storeBodyScanData(supabase, scanId, scanData) {
  try {
    // Prepare metrics object with all scan data
    const metrics = {
      estimate_result: scanData.estimate_result,
      match_result: scanData.match_result,
      morph_bounds: scanData.morph_bounds,
      semantic_result: scanData.semantic_result,
      validation_metadata: scanData.validation_metadata,
      temporal_analysis: scanData.temporal_analysis,
      smoothing_metadata: scanData.smoothing_metadata,
      visionfit_result: scanData.visionfit_result,
      photos_metadata: scanData.photos_metadata,
      // CRITICAL: Include complete avatar data for persistence
      final_shape_params: scanData.final_shape_params,
      final_limb_masses: scanData.final_limb_masses,
      skin_tone: scanData.skin_tone,
      resolved_gender: scanData.resolved_gender,
      mapping_version: scanData.mapping_version,
      gltf_model_id: scanData.gltf_model_id,
      material_config_version: scanData.material_config_version,
      avatar_version: scanData.avatar_version
    };
    console.log('✅ [storeBodyScanData] Storing complete avatar data', {
      scanId,
      user_id: scanData.user_id,
      hasFinalShapeParams: !!scanData.final_shape_params,
      finalShapeParamsCount: scanData.final_shape_params ? Object.keys(scanData.final_shape_params).length : 0,
      hasFinalLimbMasses: !!scanData.final_limb_masses,
      finalLimbMassesCount: scanData.final_limb_masses ? Object.keys(scanData.final_limb_masses).length : 0,
      hasSkinTone: !!scanData.skin_tone,
      skinToneRGB: scanData.skin_tone ? `rgb(${scanData.skin_tone.r}, ${scanData.skin_tone.g}, ${scanData.skin_tone.b})` : 'none',
      resolvedGender: scanData.resolved_gender,
      avatarVersion: scanData.avatar_version,
      philosophy: 'complete_avatar_persistence_server_side'
    });
    // Insert the body scan data
    const { data, error } = await supabase.from('body_scans').insert({
      id: scanId,
      user_id: scanData.user_id,
      timestamp: new Date().toISOString(),
      metrics: metrics
    }).select().single();
    if (error) {
      console.error('Database error storing body scan:', error);
      throw new Error(`Failed to store body scan: ${error.message}`);
    }
    console.log('✅ [storeBodyScanData] Body scan stored successfully with complete avatar data:', {
      scanId: data.id,
      metricsKeys: Object.keys(metrics),
      hasFinalShapeParams: !!metrics.final_shape_params,
      hasFinalLimbMasses: !!metrics.final_limb_masses,
      hasSkinTone: !!metrics.skin_tone,
      philosophy: 'server_side_persistence_complete'
    });
    return data;
  } catch (error) {
    console.error('❌ [storeBodyScanData] Error storing scan data:', error);
    throw error;
  }
}
