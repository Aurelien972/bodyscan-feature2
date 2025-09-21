/**
 * Request Validation
 * Validates incoming AI refinement requests
 */ /**
 * PHASE B: Validate AI refinement request with K=5 envelope requirements
 */ export function validateRefineRequest(request) {
  if (!request) {
    return 'Request body is required';
  }
  const { scan_id, user_id, resolvedGender, photos, blend_shape_params, blend_limb_masses, mapping_version, k5_envelope, vision_classification, user_measurements } = request;
  if (!scan_id || typeof scan_id !== 'string') {
    return 'Valid scan_id is required';
  }
  if (!user_id || typeof user_id !== 'string') {
    return 'Valid user_id is required';
  }
  if (!resolvedGender || ![
    'masculine',
    'feminine'
  ].includes(resolvedGender)) {
    return 'Valid resolvedGender is required (masculine or feminine)';
  }
  // PHASE B: Validate K=5 envelope is present and valid
  if (!k5_envelope || typeof k5_envelope !== 'object') {
    return 'Valid k5_envelope is required for PHASE B AI refinement';
  }
  if (!k5_envelope.shape_params_envelope || typeof k5_envelope.shape_params_envelope !== 'object') {
    return 'Valid k5_envelope.shape_params_envelope is required';
  }
  if (!k5_envelope.limb_masses_envelope || typeof k5_envelope.limb_masses_envelope !== 'object') {
    return 'Valid k5_envelope.limb_masses_envelope is required';
  }
  if (!k5_envelope.envelope_metadata || !Array.isArray(k5_envelope.envelope_metadata.archetypes_used)) {
    return 'Valid k5_envelope.envelope_metadata with archetypes_used array is required';
  }
  // PHASE B: Validate vision classification is present and valid
  if (!vision_classification || typeof vision_classification !== 'object') {
    return 'Valid vision_classification is required for PHASE B AI refinement';
  }
  const requiredVisionFields = [
    'muscularity',
    'obesity',
    'morphotype',
    'level'
  ];
  for (const field of requiredVisionFields){
    if (!vision_classification[field] || typeof vision_classification[field] !== 'string') {
      return `Valid vision_classification.${field} is required`;
    }
  }
  if (!photos || !Array.isArray(photos) || photos.length < 1) {
    return 'At least one photo is required';
  }
  // Validate photo structure
  for (const photo of photos){
    if (!photo.view || ![
      'front',
      'profile'
    ].includes(photo.view)) {
      return 'Photo view must be either "front" or "profile"';
    }
    if (!photo.url || typeof photo.url !== 'string') {
      return 'Photo URL is required and must be a string';
    }
  }
  if (!blend_shape_params || typeof blend_shape_params !== 'object') {
    return 'Valid blend_shape_params object is required';
  }
  if (!blend_limb_masses || typeof blend_limb_masses !== 'object') {
    return 'Valid blend_limb_masses object is required';
  }
  if (!mapping_version || typeof mapping_version !== 'string') {
    return 'Valid mapping_version is required';
  }
  // PHASE B: Validate K=5 envelope ranges
  for (const [key, range] of Object.entries(k5_envelope.shape_params_envelope)){
    if (typeof range.min !== 'number' || typeof range.max !== 'number' || !Number.isFinite(range.min) || !Number.isFinite(range.max)) {
      return `Invalid K=5 envelope range for shape param ${key}`;
    }
    if (range.min > range.max) {
      return `Invalid K=5 envelope range for shape param ${key}: min > max`;
    }
  }
  for (const [key, range] of Object.entries(k5_envelope.limb_masses_envelope)){
    if (typeof range.min !== 'number' || typeof range.max !== 'number' || !Number.isFinite(range.min) || !Number.isFinite(range.max)) {
      return `Invalid K=5 envelope range for limb mass ${key}`;
    }
    if (range.min > range.max) {
      return `Invalid K=5 envelope range for limb mass ${key}: min > max`;
    }
  }
  // Validate user_measurements if provided (optional but recommended)
  if (user_measurements) {
    if (typeof user_measurements.height_cm !== 'number' || user_measurements.height_cm < 120 || user_measurements.height_cm > 230) {
      return 'Invalid user_measurements.height_cm (must be 120-230)';
    }
    if (typeof user_measurements.weight_kg !== 'number' || user_measurements.weight_kg < 30 || user_measurements.weight_kg > 300) {
      return 'Invalid user_measurements.weight_kg (must be 30-300)';
    }
    if (typeof user_measurements.estimated_bmi !== 'number' || user_measurements.estimated_bmi < 10 || user_measurements.estimated_bmi > 60) {
      return 'Invalid user_measurements.estimated_bmi (must be 10-60)';
    }
    if (!user_measurements.raw_measurements || typeof user_measurements.raw_measurements !== 'object') {
      return 'Invalid user_measurements.raw_measurements object';
    }
    const { waist_cm, chest_cm, hips_cm } = user_measurements.raw_measurements;
    if (typeof waist_cm !== 'number' || typeof chest_cm !== 'number' || typeof hips_cm !== 'number') {
      return 'Invalid raw_measurements: waist_cm, chest_cm, and hips_cm must be numbers';
    }
  }
  // Validate blend data contains finite numbers
  for (const [key, value] of Object.entries(blend_shape_params)){
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `Invalid blend_shape_params.${key}: must be a finite number`;
    }
  }
  for (const [key, value] of Object.entries(blend_limb_masses)){
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `Invalid blend_limb_masses.${key}: must be a finite number`;
    }
  }
  return null; // Valid request
}
