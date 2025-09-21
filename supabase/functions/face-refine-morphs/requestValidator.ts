// supabase/functions/face-refine-morphs/requestValidator.ts
import { toDbGender } from '../_shared/utils/toDbGender.ts';

export interface FaceRefineRequest {
  scan_id: string;
  user_id: string;
  resolvedGender: 'male' | 'female'; // MODIFIED: Changed to 'male' | 'female' for client-side consistency
  photos: Array<{ view: string; url: string; report?: any }>;
  blend_face_params: Record<string, number>;
  mapping_version: string;
  k5_envelope: {
    shape_params_envelope: Record<string, { min: number; max: number }>;
    limb_masses_envelope: Record<string, { min: number; max: number }>;
    envelope_metadata: any; // Metadata object, no min/max
  };
  face_semantic_profile: {
    face_shape: string;
    eye_shape: string;
    nose_type: string;
    lip_fullness: string;
    gender?: 'male' | 'female';
  };
}

export function validateRefineRequest(data: any): string | null {
  if (!data) {
    return "Request body is required";
  }

  const requiredFields = [
    'scan_id', 'user_id', 'resolvedGender', 'photos', 
    'blend_face_params', 'mapping_version', 'k5_envelope', 'face_semantic_profile'
  ];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      return `${field} is required`;
    }
  }

  if (typeof data.scan_id !== 'string' || data.scan_id.length === 0) {
    return "scan_id must be a non-empty string";
  }
  if (typeof data.user_id !== 'string' || data.user_id.length === 0) {
    return "user_id must be a non-empty string";
  }
  
  // MODIFIED: Validate resolvedGender to accept 'masculine' or 'feminine'
  if (!['masculine', 'feminine'].includes(data.resolvedGender)) {
    return "resolvedGender must be 'masculine' or 'feminine'";
  }

  if (!Array.isArray(data.photos) || data.photos.length === 0) {
    return "photos must be a non-empty array";
  }
  for (const photo of data.photos) {
    if (typeof photo.url !== 'string' || photo.url.length === 0 || typeof photo.view !== 'string' || photo.view.length === 0) {
      return "Each photo must have a 'url' and 'view'";
    }
  }

  // MODIFIED: Changed validation for blend_face_params to allow empty object
  if (typeof data.blend_face_params !== 'object') {
    return "blend_face_params must be an object";
  }
  for (const key in data.blend_face_params) {
    if (typeof data.blend_face_params[key] !== 'number') {
      return `blend_face_params.${key} must be a number`;
    }
  }

  if (typeof data.mapping_version !== 'string' || data.mapping_version.length === 0) {
    return "mapping_version must be a non-empty string";
  }

  // MODIFIED: Validate k5_envelope structure more precisely
  if (typeof data.k5_envelope !== 'object' || Object.keys(data.k5_envelope).length === 0) {
    return "k5_envelope must be a non-empty object";
  }
  if (typeof data.k5_envelope.shape_params_envelope !== 'object' || Object.keys(data.k5_envelope.shape_params_envelope).length === 0) {
    return "k5_envelope.shape_params_envelope must be a non-empty object";
  }
  if (typeof data.k5_envelope.limb_masses_envelope !== 'object') { // limb_masses_envelope can be empty for face
    return "k5_envelope.limb_masses_envelope must be an object";
  }
  if (typeof data.k5_envelope.envelope_metadata !== 'object') {
    return "k5_envelope.envelope_metadata must be an object";
  }

  // Validate ranges within shape_params_envelope
  for (const key in data.k5_envelope.shape_params_envelope) {
    const bounds = data.k5_envelope.shape_params_envelope[key];
    if (typeof bounds.min !== 'number' || typeof bounds.max !== 'number' || !Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) {
      return `k5_envelope.shape_params_envelope.${key} must have numeric 'min' and 'max' properties`;
    }
  }

  // Validate ranges within limb_masses_envelope (can be empty for face)
  for (const key in data.k5_envelope.limb_masses_envelope) {
    const bounds = data.k5_envelope.limb_masses_envelope[key];
    if (typeof bounds.min !== 'number' || typeof bounds.max !== 'number' || !Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) {
      return `k5_envelope.limb_masses_envelope.${key} must have numeric 'min' and 'max' properties`;
    }
  }

  if (typeof data.face_semantic_profile !== 'object' || Object.keys(data.face_semantic_profile).length === 0) {
    return "face_semantic_profile must be a non-empty object";
  }
  const semanticFields = ['face_shape', 'eye_shape', 'nose_type', 'lip_fullness'];
  for (const field of semanticFields) {
    if (typeof data.face_semantic_profile[field] !== 'string' || data.face_semantic_profile[field].length === 0) {
      return `face_semantic_profile.${field} is required and must be a non-empty string`;
    }
  }
  // MODIFIED: Validate face_semantic_profile.gender to accept 'masculine' or 'feminine'
  if (data.face_semantic_profile.gender && !['masculine', 'feminine'].includes(data.face_semantic_profile.gender)) {
    return "face_semantic_profile.gender must be 'masculine' or 'feminine'";
  }

  // Validate user_measurements if provided (optional but recommended)
  if (data.user_measurements) {
    if (typeof data.user_measurements.height_cm !== 'number' || data.user_measurements.height_cm < 120 || data.user_measurements.height_cm > 230) {
      return 'Invalid user_measurements.height_cm (must be 120-230)';
    }
    if (typeof data.user_measurements.weight_kg !== 'number' || data.user_measurements.weight_kg < 30 || data.user_measurements.weight_kg > 300) {
      return 'Invalid user_measurements.weight_kg (must be 30-300)';
    }
    if (typeof data.user_measurements.estimated_bmi !== 'number' || data.user_measurements.estimated_bmi < 10 || data.user_measurements.estimated_bmi > 60) {
      return 'Invalid user_measurements.estimated_bmi (must be 10-60)';
    }
    if (!data.user_measurements.raw_measurements || typeof data.user_measurements.raw_measurements !== 'object') {
      return 'Invalid user_measurements.raw_measurements object';
    }
    const { waist_cm, chest_cm, hips_cm } = data.user_measurements.raw_measurements;
    if (typeof waist_cm !== 'number' || typeof chest_cm !== 'number' || typeof hips_cm !== 'number') {
      return 'Invalid raw_measurements: waist_cm, chest_cm, and hips_cm must be numbers';
    }
  }

  // Validate blend data contains finite numbers
  for (const [key, value] of Object.entries(data.blend_face_params)){
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `Invalid blend_face_params.${key}: must be a finite number`;
    }
  }
  // Note: blend_limb_masses is not part of face-refine-morphs request, so no validation here.

  return null;
}
