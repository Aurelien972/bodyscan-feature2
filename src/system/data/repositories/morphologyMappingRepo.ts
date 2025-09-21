/**
 * Morphology Mapping Repository
 * Handles data access for morphological mapping from database
 */

import { supabase } from '../../supabase/client';
import logger from '../../../lib/utils/logger';
import type { MorphologyMappingData } from '../../../hooks/useMorphologyMapping';
import { buildMorphPolicy, type MorphPolicy } from '../../../lib/morph/constraints';

interface MorphologyMappingResponse {
  success: boolean;
  data: MorphologyMappingData;
  metadata: {
    generated_at: string;
    total_archetypes_analyzed: number;
    version: string;
  };
}

/**
 * Morphology Mapping Repository Implementation
 */
export const morphologyMappingRepo = {
  /**
   * Get complete morphology mapping from database
   */
  async getMapping(): Promise<MorphologyMappingData> {
    logger.debug('🔍 [MorphologyMappingRepo] Fetching morphology mapping from database');
    
    try {
      const { data, error } = await supabase.functions.invoke('morphology-mapping', {
        method: 'GET'
      });

      if (error) {
        logger.error('🔍 [MorphologyMappingRepo] Edge function error:', error);
        logger.warn('🔍 [MorphologyMappingRepo] Edge function failed, using fallback mapping');
        return getFallbackMapping();
      }

      if (!data || !data.success) {
        logger.error('🔍 [MorphologyMappingRepo] Invalid response:', data);
        logger.warn('🔍 [MorphologyMappingRepo] Invalid response, using fallback mapping');
        return getFallbackMapping();
      }

      const mappingData = data.data as MorphologyMappingData;
      
      // Validate response structure
      if (!mappingData.mapping_masculine || !mappingData.mapping_feminine) {
        logger.error('🔍 [MorphologyMappingRepo] Missing gender mappings in response');
        logger.warn('🔍 [MorphologyMappingRepo] Incomplete mapping data, using fallback mapping');
        return getFallbackMapping();
      }

      logger.info('✅ [MorphologyMappingRepo] Morphology mapping fetched successfully', {
        masculineMorphValues: Object.keys(mappingData.mapping_masculine.morph_values).length,
        feminineMorphValues: Object.keys(mappingData.mapping_feminine.morph_values).length,
        masculineLimbMasses: Object.keys(mappingData.mapping_masculine.limb_masses).length,
        feminineLimbMasses: Object.keys(mappingData.mapping_feminine.limb_masses).length,
        version: data.metadata?.version
      });

      return mappingData;

    } catch (error) {
      logger.error('🔍 [MorphologyMappingRepo] Failed to fetch morphology mapping:', error);
      logger.warn('🔍 [MorphologyMappingRepo] Using fallback mapping due to error');
      
      // Return fallback mapping based on provided data to prevent app crashes
      return getFallbackMapping();
    }
  },

  /**
   * Get morph policy for a specific gender
   */
  async getPolicy(gender: 'male' | 'female'): Promise<MorphPolicy> {
    const mapping = await this.getMapping();
    return buildMorphPolicy(mapping, gender);
  },

  /**
   * Validate mapping data structure
   */
  validateMapping(mapping: MorphologyMappingData): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check masculine mapping
    if (!mapping.mapping_masculine) {
      issues.push('Missing mapping_masculine');
    } else {
      if (!mapping.mapping_masculine.morph_values) issues.push('Missing masculine morph_values');
      if (!mapping.mapping_masculine.limb_masses) issues.push('Missing masculine limb_masses');
      if (!Array.isArray(mapping.mapping_masculine.levels)) issues.push('Invalid masculine levels');
      if (!Array.isArray(mapping.mapping_masculine.obesity)) issues.push('Invalid masculine obesity');
    }

    // Check feminine mapping
    if (!mapping.mapping_feminine) {
      issues.push('Missing mapping_feminine');
    } else {
      if (!mapping.mapping_feminine.morph_values) issues.push('Missing feminine morph_values');
      if (!mapping.mapping_feminine.limb_masses) issues.push('Missing feminine limb_masses');
      if (!Array.isArray(mapping.mapping_feminine.levels)) issues.push('Invalid feminine levels');
      if (!Array.isArray(mapping.mapping_feminine.obesity)) issues.push('Invalid feminine obesity');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
};

/**
 * Get morph policy from mapping data
 */
function getMorphPolicy(
  mapping: MorphologyMappingData,
  gender: 'male' | 'female'
): MorphPolicy {
  const genderMapping = gender === 'male' ? mapping.mapping_masculine : mapping.mapping_feminine;
  
  const requiredKeys: string[] = [];
  const optionalKeys: string[] = [];
  const ranges: Record<string, { min: number; max: number }> = {};
  
  // Classify keys based on DB ranges
  Object.entries(genderMapping.morph_values).forEach(([key, range]) => {
    ranges[key] = range;
    
    // If range is [0,0], it's effectively disabled but not required
    if (range.min === 0 && range.max === 0) {
      optionalKeys.push(key);
    } else {
      requiredKeys.push(key);
    }
  });
  
  // Face morphs are always optional
  const faceKeys = [
    'FaceLowerEyelashLength', 'eyelashLength', 'eyelashesSpecial',
    'eyesShape', 'eyesSpacing', 'eyesDown', 'eyesUp', 'eyesSpacingWide',
    'eyesClosedL', 'eyesClosedR'
  ];
  
  faceKeys.forEach(key => {
    if (!optionalKeys.includes(key) && !requiredKeys.includes(key)) {
      optionalKeys.push(key);
      ranges[key] = { min: -1, max: 1 }; // Default range for face morphs
    }
  });
  
  // Family caps and mutex groups (can be made configurable via DB later)
  const familyCaps = {
    waistFamily: {
      keys: ['narrowWaist', 'animeWaist'],
      cap: 6.2
    },
    chestFamily: {
      keys: ['bodybuilderSize', 'bodybuilderDetails'],
      cap: 7.046
    },
    hipsFamily: {
      keys: ['bigHips', 'assLarge'],
      cap: 13.5
    },
    chestVolumeFamily: {
      keys: ['superBreast', 'breastsSmall', 'breastsSag'],
      cap: 15.2
    }
  };
  
  const mutexGroups = [
    ['breastsSmall', 'breastsSag', 'superBreast'],
    ['bodybuilderSize', 'emaciated'],
  ];
  
  logger.debug('MORPH_POLICY', 'Morph policy generated from DB', {
    gender,
    requiredKeys: requiredKeys.length,
    optionalKeys: optionalKeys.length,
    totalRanges: Object.keys(ranges).length
  });
  
  return {
    requiredKeys,
    optionalKeys,
    ranges,
    familyCaps,
    mutexGroups
  };
}

/**
 * Fallback mapping based on provided data to prevent crashes
 */
function getFallbackMapping(): MorphologyMappingData {
  logger.warn('🔍 [MorphologyMappingRepo] Using fallback mapping data');
  
  return {
    mapping_masculine: {
      levels: ["Émacié", "Mince", "Normal", "Obèse", "Obèse morbide", "Obèse sévère", "Surpoids"],
      obesity: ["Non obèse", "Obèse", "Obésité morbide", "Surpoids"],
      bmi_range: { max: 48.1, min: 15.9 },
      limb_masses: {
        gate: { max: 1, min: 1 },
        armMass: { max: 1.8, min: 0.3 },
        calfMass: { max: 1.75, min: 0.3 },
        neckMass: { max: 1.6, min: 0.2 },
        thighMass: { max: 1.95, min: 0.4 },
        torsoMass: { max: 1.95, min: 0.3 },
        forearmMass: { max: 1.6, min: 0.2 }
      },
      morph_index: { max: 2, min: -0.6 },
      morphotypes: ["OVA", "POI", "POM", "REC", "SAB", "TRI"],
      muscularity: ["Atrophié sévère", "Légèrement atrophié", "Moyen musclé", "Musclé", "Normal costaud"],
      gender_codes: ["MAS"],
      height_range: { max: 191, min: 164 },
      morph_values: {
        bigHips: { max: 1, min: -0.5 },
        nipples: { max: 0, min: 0 },
        assLarge: { max: 1.1, min: -0.6 },
        dollBody: { max: 0.7, min: 0 },
        pregnant: { max: 0, min: 0 },
        animeNeck: { max: 0.8, min: 0 },
        emaciated: { max: 1.5, min: -2.2 },
        animeWaist: { max: 1, min: -1 },
        breastsSag: { max: 1.3, min: -1 },
        pearFigure: { max: 2, min: -0.5 },
        narrowWaist: { max: 0, min: -2 },
        superBreast: { max: 0, min: -0.5 },
        breastsSmall: { max: 2, min: 0 },
        animeProportion: { max: 0, min: 0 },
        bodybuilderSize: { max: 1.5, min: -0.8 },
        bodybuilderDetails: { max: 2.5, min: -1.5 },
        FaceLowerEyelashLength: { max: 1, min: 0 }
      },
      muscle_index: { max: 1.45, min: -0.92 },
      weight_range: { max: 175, min: 50 },
      abdomen_round: { max: 1, min: -0.3 }
    },
    mapping_feminine: {
      levels: ["Émacié", "Normal", "Obèse", "Obèse morbide", "Obèse sévère", "Surpoids"],
      obesity: ["Non obèse", "Obèse", "Obésité morbide", "Surpoids"],
      bmi_range: { max: 47, min: 16.5 },
      limb_masses: {
        gate: { max: 1, min: 1 },
        armMass: { max: 1.325, min: 0.862 },
        calfMass: { max: 1.35, min: 0.9 },
        neckMass: { max: 1.25, min: 0.889 },
        thighMass: { max: 1.525, min: 0.935 },
        torsoMass: { max: 1.375, min: 0.745 },
        forearmMass: { max: 1.2, min: 0.759 }
      },
      morph_index: { max: 1.92, min: -0.16 },
      morphotypes: ["OVA", "POI", "POM", "REC", "SAB", "TRI"],
      muscularity: ["Atrophiée sévère", "Moins musclée", "Moyennement musclée", "Musclée", "Normal costaud"],
      gender_codes: ["FEM"],
      height_range: { max: 178, min: 158 },
      morph_values: {
        bigHips: { max: 0.9, min: -1 },
        nipples: { max: 0, min: 0 },
        assLarge: { max: 1.2, min: -0.8 },
        dollBody: { max: 0.6, min: 0 },
        pregnant: { max: 0, min: 0 },
        animeNeck: { max: 0, min: 0 },
        emaciated: { max: 0.3, min: -2.3 },
        animeWaist: { max: 0.8, min: -0.5 },
        breastsSag: { max: 0.95, min: -0.8 },
        pearFigure: { max: 1.8, min: -0.4 },
        narrowWaist: { max: 1, min: -1.8 },
        superBreast: { max: 0.3, min: 0 },
        breastsSmall: { max: 1, min: 0 },
        animeProportion: { max: 0, min: 0 },
        bodybuilderSize: { max: 1.2, min: -0.8 },
        bodybuilderDetails: { max: 0.8, min: -1 },
        FaceLowerEyelashLength: { max: 1, min: 1 }
      },
      muscle_index: { max: 1.08, min: -0.79 },
      weight_range: { max: 140, min: 43 },
      abdomen_round: { max: 0.96, min: -0.08 }
    }
  };
}