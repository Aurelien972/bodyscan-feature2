/**
 * Request validation for face-match Edge Function
 */

import { toDbGender } from '../_shared/utils/toDbGender.ts'; // MODIFIED: Import toDbGender

export interface FaceMatchRequest {
  user_id: string;
  face_semantic_profile: {
    face_shape: string;
    eye_shape: string;
    nose_type: string;
    lip_fullness: string;
    gender?: 'male' | 'female'; // MODIFIED: Expect 'male' | 'female'
  };
}

export function validateFaceMatchRequest(data: any): string | null {
  if (!data) {
    return "Request body is required";
  }

  if (!data.user_id || typeof data.user_id !== 'string') {
    return "user_id is required and must be a string";
  }

  if (!data.face_semantic_profile || typeof data.face_semantic_profile !== 'object') {
    return "face_semantic_profile is required and must be an object";
  }

  const profile = data.face_semantic_profile;
  const requiredFields = ['face_shape', 'eye_shape', 'nose_type', 'lip_fullness'];

  for (const field of requiredFields) {
    if (!profile[field] || typeof profile[field] !== 'string') {
      return `face_semantic_profile.${field} is required and must be a string`;
    }
  }

  // Validate ENUM values
  const validValues = {
    face_shape: ['oval', 'round', 'square', 'heart', 'diamond', 'long', 'triangle'],
    eye_shape: ['almond', 'round', 'hooded', 'upturned', 'downturned', 'monolid'],
    nose_type: ['aquiline', 'button', 'roman', 'nubian', 'straight', 'upturned'],
    lip_fullness: ['full', 'thin', 'average', 'pouty']
  };

  for (const [field, validOptions] of Object.entries(validValues)) {
    if (!validOptions.includes(profile[field])) {
      return `face_semantic_profile.${field} must be one of: ${validOptions.join(', ')}`;
    }
  }

  // MODIFIED: Validate gender to accept 'masculine' or 'feminine'
  if (profile.gender && !['masculine', 'feminine'].includes(profile.gender)) {
    return "face_semantic_profile.gender must be 'masculine' or 'feminine'";
  }

  return null;
}
