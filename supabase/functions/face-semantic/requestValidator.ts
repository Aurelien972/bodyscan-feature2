/**
 * Request validation for face-semantic Edge Function
 */

export interface FaceSemanticRequest {
  user_id: string;
  photos: Array<{
    url: string;
    view: 'front' | 'profile';
    report?: any;
  }>;
  user_declared_gender: 'male' | 'female'; // MODIFIED: Expect 'male' | 'female'
}

export function validateFaceSemanticRequest(data: any): string | null {
  if (!data) {
    return "Request body is required";
  }

  if (!data.user_id || typeof data.user_id !== 'string') {
    return "user_id is required and must be a string";
  }

  if (!Array.isArray(data.photos) || data.photos.length === 0) {
    return "photos is required and must be a non-empty array";
  }

  for (const photo of data.photos) {
    if (typeof photo.url !== 'string' || photo.url.length === 0) {
      return "Each photo must have a 'url'";
    }
    if (!['front', 'profile'].includes(photo.view)) {
      return "Each photo 'view' must be 'front' or 'profile'";
    }
  }

  // MODIFIED: Validate user_declared_gender to accept 'masculine' or 'feminine'
  if (!data.user_declared_gender || !['masculine', 'feminine'].includes(data.user_declared_gender)) {
    return "user_declared_gender is required and must be 'masculine' or 'feminine'";
  }

  return null;
}
