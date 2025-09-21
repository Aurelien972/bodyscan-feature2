// supabase/functions/face-commit/requestValidator.ts
import { toDbGender } from '../_shared/utils/toDbGender.ts'; // MODIFIED: Import toDbGender

export interface FaceCommitRequest {
  user_id: string;
  resolvedGender: 'male' | 'female';
  estimate_result: any;
  semantic_result: any;
  match_result: any;
  refine_result: any;
  photos_metadata: Array<{ view: string; url: string; report?: any }>;
  clientScanId: string;
}

export function validateCommitRequest(data: any): string | null {
  if (!data) {
    return "Request body is required";
  }

  const requiredFields = [
    'user_id', 'resolvedGender', 'estimate_result', 'semantic_result',
    'match_result', 'refine_result', 'photos_metadata', 'clientScanId'
  ];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      return `${field} is required`;
    }
  }

  if (typeof data.user_id !== 'string' || data.user_id.length === 0) {
    return "user_id must be a non-empty string";
  }
  // MODIFIED: Validate resolvedGender to accept 'masculine' or 'feminine'
  if (!['masculine', 'feminine'].includes(data.resolvedGender)) {
    return "resolvedGender must be 'masculine' or 'feminine'";
  }
  if (typeof data.clientScanId !== 'string' || data.clientScanId.length === 0) {
    return "clientScanId must be a non-empty string";
  }

  // Basic checks for nested objects
  if (typeof data.estimate_result !== 'object') return "estimate_result must be an object";
  if (typeof data.semantic_result !== 'object') return "semantic_result must be an object";
  if (typeof data.match_result !== 'object') return "match_result must be an object";
  if (typeof data.refine_result !== 'object') return "refine_result must be an object";
  
  if (!Array.isArray(data.photos_metadata)) return "photos_metadata must be an array";

  // Validate refine_result's core properties
  if (typeof data.refine_result.final_face_params !== 'object' || Object.keys(data.refine_result.final_face_params).length === 0) {
    return "refine_result.final_face_params is required and must be a non-empty object";
  }

  return null;
}
