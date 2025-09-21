// src/system/data/repositories/faceScanRepo.ts
/**
 * Face Scan Repository - Supabase Implementation
 * Client-side interface for interacting with face scan Edge Functions
 */

import { supabase } from '../../supabase/client';
import logger from '../../../lib/utils/logger';
import { toDbGender } from '../../../lib/morph/keys/keyNormalizers'; // MODIFIED: Import toDbGender

interface FaceScanSemanticRequest {
  user_id: string;
  photos: Array<{
    url: string;
    view: 'front' | 'profile';
    report?: any;
  }>;
  user_declared_gender: 'male' | 'female';
  clientScanId?: string;
}

interface FaceScanMatchRequest {
  user_id: string;
  face_semantic_profile: {
    face_shape: string;
    eye_shape: string;
    nose_type: string;
    lip_fullness: string;
    gender?: 'male' | 'female';
  };
  clientScanId?: string;
}

interface FaceScanRefineRequest {
  scan_id: string;
  user_id: string;
  resolvedGender: 'male' | 'female'; // MODIFIED: Changed to 'male' | 'female' for client-side consistency
  photos: Array<{ view: string; url: string; report?: any }>;
  blend_face_params: Record<string, number>;
  mapping_version: string;
  k5_envelope?: {
    shape_params_envelope: Record<string, { min: number; max: number }>;
    limb_masses_envelope: Record<string, { min: number; max: number }>;
    envelope_metadata: any; // Metadata object, no min/max
  };
  face_semantic_profile?: {
    face_shape: string;
    eye_shape: string;
    nose_type: string;
    lip_fullness: string;
    gender?: 'male' | 'female';
  };
}

interface FaceScanCommitRequest {
  user_id: string;
  resolvedGender: 'male' | 'female';
  estimate_result: any; // Can be empty for face scan, but type requires it
  semantic_result: any;
  match_result: any;
  refine_result: any;
  photos_metadata: any[];
  skin_tone?: any; // Direct skin tone data from captured photos
  clientScanId?: string;
}

/**
 * Face Scan Repository Implementation
 */
export const faceScanRepo = {
  /**
   * Call face-semantic Edge Function
   */
  async semantic(request: FaceScanSemanticRequest) {
    logger.info('Calling face-semantic edge function', {
      clientScanId: request.clientScanId,
      userId: request.user_id,
      photosCount: request.photos?.length || 0,
      userGender: request.user_declared_gender,
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase.functions.invoke('face-semantic', {
      body: {
        ...request,
        user_declared_gender: toDbGender(request.user_declared_gender) // MODIFIED: Convert to DB gender enum
      }
    });

    logger.info('Face-semantic response received', {
      clientScanId: request.clientScanId,
      hasResponse: !!data,
      hasError: !!error,
      responseKeys: data ? Object.keys(data) : [],
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      logger.error('Face-semantic failed', { 
        clientScanId: request.clientScanId,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Face semantic failed: ${error.message}`);
    }

    logger.info('Face-semantic completed successfully', {
      clientScanId: request.clientScanId,
      hasSemanticProfile: !!data?.semantic_profile,
      semanticConfidence: data?.semantic_confidence,
      adjustmentsMade: data?.adjustments_made?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    return data;
  },

  /**
   * Call face-match Edge Function
   */
  async match(request: FaceScanMatchRequest) {
    logger.info('Calling face-match edge function', {
      clientScanId: request.clientScanId,
      userId: request.user_id,
      faceSemanticProfile: request.face_semantic_profile,
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase.functions.invoke('face-match', {
      body: {
        ...request,
        face_semantic_profile: {
          ...request.face_semantic_profile,
          gender: request.face_semantic_profile.gender ? toDbGender(request.face_semantic_profile.gender) : undefined // MODIFIED: Convert to DB gender enum
        }
      }
    });

    logger.info('Face-match response received', {
      clientScanId: request.clientScanId,
      hasResponse: !!data,
      hasError: !!error,
      responseKeys: data ? Object.keys(data) : [],
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      logger.error('Face-match failed', { 
        clientScanId: request.clientScanId,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Face match failed: ${error.message}`);
    }

    logger.info('Face-match completed successfully', {
      clientScanId: request.clientScanId,
      selectedArchetypesCount: data?.selected_archetypes?.length || 0,
      k5EnvelopeKeys: data?.k5_envelope ? Object.keys(data.k5_envelope).length : 0,
      timestamp: new Date().toISOString()
    });
    
    return data;
  },

  /**
   * Call face-refine-morphs Edge Function
   */
  async refine(request: FaceScanRefineRequest) {
    logger.info('Calling face-refine-morphs edge function', {
      scanId: request.scan_id,
      userId: request.user_id,
      resolvedGender: request.resolvedGender,
      photosCount: request.photos?.length || 0,
      blendFaceParamsCount: Object.keys(request.blend_face_params).length,
      mappingVersion: request.mapping_version,
      hasK5Envelope: !!request.k5_envelope,
      hasFaceSemanticProfile: !!request.face_semantic_profile,
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase.functions.invoke('face-refine-morphs', {
      body: {
        ...request,
        resolvedGender: toDbGender(request.resolvedGender), // MODIFIED: Convert to DB gender enum
        face_semantic_profile: {
          ...request.face_semantic_profile,
          gender: request.face_semantic_profile.gender ? toDbGender(request.face_semantic_profile.gender) : undefined // MODIFIED: Convert to DB gender enum
        }
      }
    });

    logger.info('Face-refine-morphs response received', {
      scanId: request.scan_id,
      hasResponse: !!data,
      hasError: !!error,
      responseKeys: data ? Object.keys(data) : [],
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      logger.error('Face-refine-morphs failed', { 
        scanId: request.scan_id,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Face refine failed: ${error.message}`);
    }

    logger.info('Face-refine-morphs completed successfully', {
      scanId: request.scan_id,
      aiRefine: data.ai_refine,
      finalFaceParamsCount: Object.keys(data.final_face_params || {}).length,
      aiConfidence: data.ai_confidence,
      timestamp: new Date().toISOString()
    });
    
    return data;
  },

  /**
   * Call face-commit Edge Function
   */
  async commit(request: FaceScanCommitRequest) {
    logger.info('Calling face-commit edge function', {
      clientScanId: request.clientScanId,
      userId: request.user_id,
      resolvedGender: request.resolvedGender,
      hasEstimateResult: !!request.estimate_result,
      hasSemanticResult: !!request.semantic_result,
      hasMatchResult: !!request.match_result,
      hasRefineResult: !!request.refine_result,
      timestamp: new Date().toISOString()
    });
    
    const response = await supabase.functions.invoke('face-commit', {
      body: {
        ...request,
        resolvedGender: toDbGender(request.resolvedGender) // MODIFIED: Convert to DB gender enum
      }
    });

    logger.info('Face-commit response received', {
      clientScanId: request.clientScanId,
      hasResponse: !!response,
      responseKeys: response ? Object.keys(response) : [],
      hasData: !!response?.data,
      hasError: !!response?.error,
      timestamp: new Date().toISOString()
    });
    
    if (!response) {
      logger.error('No response from face-commit', {
        clientScanId: request.clientScanId
      });
      throw new Error('No response received from face-commit function');
    }
    
    if (response.error) {
      const errorMessage = response.error?.message || response.error || 'Unknown commit error';
      logger.error('Face-commit returned error', {
        clientScanId: request.clientScanId,
        error: response.error,
        errorMessage,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Face commit failed: ${errorMessage}`);
    }

    if (!response.data) {
      logger.warn('Face-commit returned no data', {
        clientScanId: request.clientScanId,
        response
      });
      return { success: true, message: 'Commit completed without data' };
    }
    
    logger.info('Face-commit completed successfully', {
      clientScanId: request.clientScanId,
      serverScanId: response.data.scan_id,
      commitSuccess: !!response.data.success,
      processingComplete: !!response.data.processing_complete
    });
    
    return response.data;
  },
};
