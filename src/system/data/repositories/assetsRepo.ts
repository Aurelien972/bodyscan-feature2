/**
 * Assets Repository - Supabase Storage Integration
 * Handles 3D model and asset loading from Supabase Storage
 */

import logger from '../../../lib/utils/logger';

// Direct model URLs - no Supabase Storage lookup needed
const MODEL_URLS = {
  male: 'https://kwipydbtjagypocpvbwn.supabase.co/storage/v1/object/public/3d-models/M_character_uniq.glb',
  female: 'https://kwipydbtjagypocpvbwn.supabase.co/storage/v1/object/public/3d-models/F_character_uniq_4.13.glb',
};

/**
 * Get model URL for gender - ALWAYS returns valid public URL (no 404s)
 */
export function getModelUrlForGender(gender: 'male' | 'female'): string {
  const url = MODEL_URLS[gender] || MODEL_URLS.male;
  
  logger.debug('ASSETS_REPO', 'Using base model for gender', {
    gender,
    modelUrl: url,
    timestamp: new Date().toISOString()
  });
  
  return url;
}

/**
 * Get fallback model URL - same as getModelUrlForGender (no custom models)
 */
function getFallbackModelUrl(gender: 'male' | 'female'): string {
  const url = getModelUrlForGender(gender);
  
  logger.debug('ASSETS_REPO', 'Using fallback model URL', {
    gender,
    fallbackUrl: url,
    reason: 'no_custom_models_implemented',
    timestamp: new Date().toISOString()
  });
  
  return url;
}