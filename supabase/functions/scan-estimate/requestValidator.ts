/**
 * Request Validation
 * Validates incoming scan estimate requests
 */ /**
 * Validate scan estimate request
 */ export function validateEstimateRequest(request) {
  if (!request) {
    return 'Request body is required';
  }
  const { user_id, photos, user_declared_height_cm, user_declared_weight_kg, user_declared_gender } = request;
  if (!user_id || typeof user_id !== 'string') {
    return 'Valid user_id is required';
  }
  if (!photos || !Array.isArray(photos) || photos.length !== 2) {
    return 'At least 1 photo is required (maximum 2: front and profile)';
  }
  if (!user_declared_height_cm || typeof user_declared_height_cm !== 'number' || user_declared_height_cm < 120 || user_declared_height_cm > 230) {
    return 'Valid user_declared_height_cm is required (120-230cm)';
  }
  if (!user_declared_weight_kg || typeof user_declared_weight_kg !== 'number' || user_declared_weight_kg < 30 || user_declared_weight_kg > 300) {
    return 'Valid user_declared_weight_kg is required (30-300kg)';
  }
  if (!user_declared_gender || ![
    'masculine',
    'feminine'
  ].includes(user_declared_gender)) {
    return 'Valid user_declared_gender is required (masculine or feminine)';
  }
  // Validate photo structure
  for (const photo of photos){
    if (!photo.view || ![
      'front',
      'profile'
    ].includes(photo.view)) {
      return 'Photo view must be either "front" or "profile"';
    }
    if (!photo.url) {
      return 'Photo URL is required';
    }
    if (!photo.report) {
      return 'Photo report is required';
    }
  }
  return null; // Valid request
}
