/**
 * Payload Types - Shared Type Definitions
 * Common types used across the payload preparation system
 */

export interface ScanResults {
  estimate?: {
    extracted_data?: {
      shape_params?: Record<string, number>;
      limb_masses?: Record<string, number>;
      raw_measurements?: {
        height_cm?: number;
        weight_kg?: number;
        waist_cm?: number;
        chest_cm?: number;
        hips_cm?: number;
      };
      estimated_bmi?: number;
      skin_tone?: {
        r: number;
        g: number;
        b: number;
        confidence?: number;
      };
    };
    photos_metadata?: Array<{
      view: string;
      url: string;
      report?: any;
    }>;
  };
  semantic?: {
    semantic_profile?: {
      validated_morph_values?: Record<string, number>;
      obesity?: string;
      muscularity?: string;
      level?: string;
      morphotype?: string;
    };
  };
  match?: {
    selected_archetypes?: Array<{
      id: string;
      name: string;
      morph_values: Record<string, number>;
      limb_masses: Record<string, number>;
      distance?: number;
    }>;
    blended_shape_params?: Record<string, number>;
    blended_limb_masses?: Record<string, number>;
    strategy_used?: string;
    strategy?: string;
    k5_envelope?: any;
    ai_refinement?: {
      ai_refine: boolean;
      final_shape_params?: Record<string, number>;
      final_limb_masses?: Record<string, number>;
      mapping_version?: string;
      ai_confidence?: number;
      clamped_keys?: string[];
      envelope_violations?: string[];
      db_violations?: string[];
      out_of_range_count?: number;
      missing_keys_added?: string[];
      extra_keys_removed?: string[];
      active_keys_count?: number;
      refinement_deltas?: {
        top_10_shape_deltas?: Array<{ key: string; delta: number; blend: number; final: number }>;
        top_10_limb_deltas?: Array<{ key: string; delta: number; blend: number; final: number }>;
      };
    };
  };
  refine?: {
    final_shape_params?: Record<string, number>;
    final_limb_masses?: Record<string, number>;
    ai_refine?: boolean;
    mapping_version?: string;
  };
  userId?: string;
  serverScanId?: string;
  commit?: {
    scan_id?: string;
  };
}

export interface PreparedPayload {
  shape_params: Record<string, number>;
  limb_masses: Record<string, number>;
  blender_shape_keys: Record<string, number>;
  metadata: {
    strategy: string;
    finalGender: 'male' | 'female';
    confidence: number;
    quality_score: number;
    constraints_applied: number;
    missing_required: string[];
    missing_optional: string[];
    ai_refined: boolean;
    mapping_version?: string;
    allowlisted_keys_count: number;
    rejected_keys_count: number;
    envelope_constrained: boolean;
    morph_generation_fallback: boolean;
    phase_b_ai_refinement_metrics?: {
      clamped_keys: string[];
      envelope_violations: string[];
      db_violations: string[];
      out_of_range_count: number;
      missing_keys_added: string[];
      extra_keys_removed: string[];
      active_keys_count: number;
      top_shape_deltas: Array<{ key: string; delta: number; blend: number; final: number }>;
      top_limb_deltas: Array<{ key: string; delta: number; blend: number; final: number }>;
      k5_envelope_used: boolean;
      vision_classification_used: boolean;
    };
  };
}

/**
 * PHASE 1: Strict schema for AI refinement response
 * Ensures all expected fields are present and correctly typed
 */
export interface RefineResponse {
  ai_refine: boolean;
  final_shape_params: Record<string, number>;
  final_limb_masses: Record<string, number>;
  clamped_keys: string[];
  envelope_violations?: string[];
  db_violations?: string[];
  out_of_range_count: number;
  missing_keys_added?: string[];
  extra_keys_removed?: string[];
  active_keys_count: number;
  mapping_version: string;
  ai_confidence?: number;
  refinement_deltas?: {
    top_10_shape_deltas: Array<{ key: string; delta: number; blend: number; final: number }>;
    top_10_limb_deltas: Array<{ key: string; delta: number; blend: number; final: number }>;
  };
}

/**
 * PHASE 1: Validation result for RefineResponse
 */
interface RefineResponseValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * PHASE 1: Validate RefineResponse against strict schema
 */
export function validateRefineResponse(response: any): RefineResponseValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields validation
  if (typeof response.ai_refine !== 'boolean') {
    errors.push('ai_refine must be a boolean');
  }
  
  if (!response.final_shape_params || typeof response.final_shape_params !== 'object') {
    errors.push('final_shape_params must be a valid object');
  } else {
    // Validate all shape params are finite numbers
    Object.entries(response.final_shape_params).forEach(([key, value]) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`final_shape_params.${key} must be a finite number, got ${typeof value}: ${value}`);
      }
    });
  }
  
  if (!response.final_limb_masses || typeof response.final_limb_masses !== 'object') {
    errors.push('final_limb_masses must be a valid object');
  } else {
    // Validate all limb masses are finite numbers
    Object.entries(response.final_limb_masses).forEach(([key, value]) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`final_limb_masses.${key} must be a finite number, got ${typeof value}: ${value}`);
      }
    });
  }
  
  if (!Array.isArray(response.clamped_keys)) {
    errors.push('clamped_keys must be an array');
  }
  
  if (typeof response.out_of_range_count !== 'number' || !Number.isFinite(response.out_of_range_count)) {
    errors.push('out_of_range_count must be a finite number');
  }
  
  if (typeof response.active_keys_count !== 'number' || !Number.isFinite(response.active_keys_count)) {
    errors.push('active_keys_count must be a finite number');
  }
  
  if (!response.mapping_version || typeof response.mapping_version !== 'string') {
    errors.push('mapping_version must be a non-empty string');
  }
  
  // Optional fields validation
  if (response.ai_confidence !== undefined && 
      (typeof response.ai_confidence !== 'number' || !Number.isFinite(response.ai_confidence))) {
    warnings.push('ai_confidence should be a finite number if provided');
  }
  
  if (response.envelope_violations !== undefined && !Array.isArray(response.envelope_violations)) {
    warnings.push('envelope_violations should be an array if provided');
  }
  
  if (response.db_violations !== undefined && !Array.isArray(response.db_violations)) {
    warnings.push('db_violations should be an array if provided');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}