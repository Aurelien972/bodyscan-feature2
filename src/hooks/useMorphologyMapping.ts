import React from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { morphologyMappingRepo } from '../system/data/repositories/morphologyMappingRepo';
import logger from '../lib/utils/logger';

interface MorphologyRange {
  min: number;
  max: number;
}

export interface GenderMapping {
  levels: string[];
  obesity: string[];
  morphotypes: string[];
  muscularity: string[];
  gender_codes: string[];
  bmi_range: MorphologyRange;
  height_range: MorphologyRange;
  weight_range: MorphologyRange;
  morph_index: MorphologyRange;
  muscle_index: MorphologyRange;
  abdomen_round: MorphologyRange;
  morph_values: Record<string, MorphologyRange>;
  limb_masses: Record<string, MorphologyRange>;
  face_values: Record<string, MorphologyRange>; // ADDED
}

export interface MorphologyMappingData {
  mapping_masculine: GenderMapping;
  mapping_feminine: GenderMapping;
}

interface MorphologyMappingResult {
  data: MorphologyMappingData | null;
  isLoading: boolean;
  error: Error | null;
  
  // Utility functions
  getMorphValueRange: (morphKey: string, gender: 'male' | 'female') => MorphologyRange | null;
  getLimbMassRange: (limbKey: string, gender: 'male' | 'female') => MorphologyRange | null;
  getFaceValueRange: (faceKey: string, gender: 'male' | 'female') => MorphologyRange | null; // ADDED
  isValidMorphKey: (morphKey: string, gender: 'male' | 'female') => boolean;
  isValidLimbMassKey: (limbKey: string, gender: 'male' | 'female') => boolean;
  isValidFaceMorphKey: (faceKey: string, gender: 'male' | 'female') => boolean; // ADDED
  isMorphBanned: (morphKey: string, gender: 'male' | 'female') => boolean;
  getBannedMorphs: (gender: 'male' | 'female') => string[];
  getSemanticCategories: (gender: 'male' | 'female') => {
    levels: string[];
    obesity: string[];
    morphotypes: string[];
    muscularity: string[];
  };
  normalizeLimbMass: (value: number, limbKey: string, gender: 'male' | 'female') => number;
  denormalizeLimbMass: (normalizedValue: number, limbKey: string, gender: 'male' | 'female') => number;
  validateMorphValue: (morphKey: string, value: number, gender: 'male' | 'female') => {
    isValid: boolean;
    clampedValue: number;
    outOfRange: boolean;
  };
  validateLimbMass: (limbKey: string, value: number, gender: 'male' | 'female') => {
    isValid: boolean;
    clampedValue: number;
    outOfRange: boolean;
  };
  validateFaceValue: (faceKey: string, value: number, gender: 'male' | 'female') => { // ADDED
    isValid: boolean;
    clampedValue: number;
    outOfRange: boolean;
  };
}

/**
 * Hook to access morphology mapping data from database
 * Provides comprehensive utilities for morphological operations
 */
export function useMorphologyMapping(): MorphologyMappingResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['morphology-mapping'],
    queryFn: morphologyMappingRepo.getMapping,
    staleTime: 30 * 60 * 1000, // 30 minutes - mapping data changes rarely
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2,
  });
  
  // PHASE 0: Log mapping data availability for debugging
  React.useEffect(() => {
    if (data) {
      logger.info('MORPHOLOGY_MAPPING_HOOK', 'Mapping data loaded successfully', {
        masculineMorphValues: Object.keys(data.mapping_masculine.morph_values).length,
        feminineMorphValues: Object.keys(data.mapping_feminine.morph_values).length,
        masculineLimbMasses: Object.keys(data.mapping_masculine.limb_masses).length,
        feminineLimbMasses: Object.keys(data.mapping_feminine.limb_masses).length,
        masculineFaceValues: Object.keys(data.mapping_masculine.face_values).length, // ADDED
        feminineFaceValues: Object.keys(data.mapping_feminine.face_values).length,   // ADDED
        timestamp: new Date().toISOString()
      });
    } else if (error) {
      logger.error('MORPHOLOGY_MAPPING_HOOK', 'Failed to load mapping data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }, [data, error]);

  // Memoized utility functions to prevent unnecessary re-renders
  const utilities = useMemo(() => {
    if (!data) {
      // Return safe fallback functions when data is not available
      return {
        getMorphValueRange: () => null,
        getLimbMassRange: () => null,
        getFaceValueRange: () => null, // ADDED
        isValidMorphKey: () => false,
        isValidLimbMassKey: () => false,
        isValidFaceMorphKey: () => false, // ADDED
        isMorphBanned: () => false,
        getBannedMorphs: () => [],
        getSemanticCategories: () => ({ levels: [], obesity: [], morphotypes: [], muscularity: [] }),
        normalizeLimbMass: (value: number) => value,
        denormalizeLimbMass: (value: number) => value,
        validateMorphValue: (morphKey: string, value: number) => ({ 
          isValid: false, 
          clampedValue: value, 
          outOfRange: false 
        }),
        validateLimbMass: (limbKey: string, value: number) => ({ 
          isValid: false, 
          clampedValue: value, 
          outOfRange: false 
        }),
        validateFaceValue: (faceKey: string, value: number) => ({ // ADDED
          isValid: false, 
          clampedValue: value, 
          outOfRange: false 
        }),
      };
    }

    const getMorphValueRange = (morphKey: string, gender: 'male' | 'female'): MorphologyRange | null => {
      const mapping = gender === 'male' ? data.mapping_masculine : data.mapping_feminine;
      return mapping.morph_values[morphKey] || null;
    };

    const getLimbMassRange = (limbKey: string, gender: 'male' | 'female'): MorphologyRange | null => {
      const mapping = gender === 'male' ? data.mapping_masculine : data.mapping_feminine;
      return mapping.limb_masses[limbKey] || null;
    };

    const getFaceValueRange = (faceKey: string, gender: 'male' | 'female'): MorphologyRange | null => { // ADDED
      const mapping = gender === 'male' ? data.mapping_masculine : data.mapping_feminine;
      return mapping.face_values[faceKey] || null;
    };

    const isValidMorphKey = (morphKey: string, gender: 'male' | 'female'): boolean => {
      const mapping = gender === 'male' ? data.mapping_masculine : data.mapping_feminine;
      return morphKey in mapping.morph_values;
    };

    const isValidLimbMassKey = (limbKey: string, gender: 'male' | 'female'): boolean => {
      const mapping = gender === 'male' ? data.mapping_masculine : data.mapping_feminine;
      return limbKey in mapping.limb_masses;
    };

    const isValidFaceMorphKey = (faceKey: string, gender: 'male' | 'female'): boolean => { // ADDED
      const mapping = gender === 'male' ? data.mapping_masculine : data.mapping_feminine;
      return faceKey in mapping.face_values;
    };

    const isMorphBanned = (morphKey: string, gender: 'male' | 'female'): boolean => {
      const range = getMorphValueRange(morphKey, gender);
      if (!range) return false;
      // Morph is banned if min === max === 0
      return range.min === 0 && range.max === 0;
    };

    const getBannedMorphs = (gender: 'male' | 'female'): string[] => {
      const mapping = gender === 'male' ? data.mapping_masculine : data.mapping_feminine;
      return Object.keys(mapping.morph_values).filter(key => isMorphBanned(key, gender));
    };

    const getSemanticCategories = (gender: 'male' | 'female') => {
      const mapping = gender === 'male' ? data.mapping_masculine : data.mapping_feminine;
      return {
        levels: mapping.levels,
        obesity: mapping.obesity,
        morphotypes: mapping.morphotypes,
        muscularity: mapping.muscularity,
      };
    };

    const normalizeLimbMass = (value: number, limbKey: string, gender: 'male' | 'female'): number => {
      const range = getLimbMassRange(limbKey, gender);
      if (!range) return value;
      
      // Normalize from [min, max] to [-1, 1] range for 3D application
      const normalized = ((value - range.min) / (range.max - range.min)) * 2 - 1;
      return Math.max(-1, Math.min(1, normalized));
    };

    const denormalizeLimbMass = (normalizedValue: number, limbKey: string, gender: 'male' | 'female'): number => {
      const range = getLimbMassRange(limbKey, gender);
      if (!range) return normalizedValue;
      
      // Denormalize from [-1, 1] back to [min, max] range
      const denormalized = ((normalizedValue + 1) / 2) * (range.max - range.min) + range.min;
      return Math.max(range.min, Math.min(range.max, denormalized));
    };

    const validateMorphValue = (morphKey: string, value: number, gender: 'male' | 'female') => {
      const range = getMorphValueRange(morphKey, gender);
      if (!range) {
        return { isValid: false, clampedValue: value, outOfRange: false };
      }
      
      const clampedValue = Math.max(range.min, Math.min(range.max, value));
      const isValid = value >= range.min && value <= range.max;
      const outOfRange = !isValid;
      
      return { isValid, clampedValue, outOfRange };
    };

    const validateLimbMass = (limbKey: string, value: number, gender: 'male' | 'female') => {
      const range = getLimbMassRange(limbKey, gender);
      if (!range) {
        return { isValid: false, clampedValue: value, outOfRange: false };
      }
      
      const clampedValue = Math.max(range.min, Math.min(range.max, value));
      const isValid = value >= range.min && value <= range.max;
      const outOfRange = !isValid;
      
      return { isValid, clampedValue, outOfRange };
    };

    const validateFaceValue = (faceKey: string, value: number, gender: 'male' | 'female') => { // ADDED
      const range = getFaceValueRange(faceKey, gender);
      if (!range) {
        return { isValid: false, clampedValue: value, outOfRange: false };
      }
      
      const clampedValue = Math.max(range.min, Math.min(range.max, value));
      const isValid = value >= range.min && value <= range.max;
      const outOfRange = !isValid;
      
      return { isValid, clampedValue, outOfRange };
    };

    return {
      getMorphValueRange,
      getLimbMassRange,
      getFaceValueRange, // ADDED
      isValidMorphKey,
      isValidLimbMassKey,
      isValidFaceMorphKey, // ADDED
      isMorphBanned,
      getBannedMorphs,
      getSemanticCategories,
      normalizeLimbMass,
      denormalizeLimbMass,
      validateMorphValue,
      validateLimbMass,
      validateFaceValue, // ADDED
    };
  }, [data]);

  return {
    data,
    isLoading,
    error,
    ...utilities,
  };
}

/**
 * Hook to prefetch morphology mapping data
 * Use this in AppProviders or route prefetching to prevent UI flashes
 */
export function usePrefetchMorphologyMapping() {
  const { data } = useQuery({
    queryKey: ['morphology-mapping'],
    queryFn: morphologyMappingRepo.getMapping,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return { isPrefetched: !!data };
}
