/**
 * Derived Mass Calculator
 * Calculates derived masses using configuration formulas
 */

import type { DerivedMassConfig } from '../boneMapping';

export interface LimbMasses {
  gate?: number;
  isActive?: boolean;
  armMass?: number;
  forearmMass?: number;
  thighMass?: number;
  calfMass?: number;
  torsoMass?: number;
  neckMass?: number;
  hipMass?: number;
}

/**
 * Calculate derived mass using formula from configuration
 */
function calculateDerivedMass(derivedConfig: DerivedMassConfig, masses: LimbMasses): number {
  // For now, implement the hipMass formula directly
  // In a full implementation, this would parse the formula string
  if (derivedConfig.formula.includes('thighMass') && derivedConfig.formula.includes('torsoMass')) {
    const thighMass = masses.thighMass ?? 1;
    const torsoMass = masses.torsoMass ?? 1;
    const gate = masses.gate ?? 1;
    
    return 1 + 0.4 * (thighMass - 1) + 0.4 * (torsoMass - 1) + 0.2 * (gate - 1);
  }
  
  // Fallback for unknown formulas
  return 1.0;
}

/**
 * Calculate all derived masses from configuration
 */
export function calculateAllDerivedMasses(
  masses: LimbMasses,
  derivedMassConfigs: Record<string, DerivedMassConfig>
): LimbMasses {
  const updatedMasses = { ...masses };
  
  Object.entries(derivedMassConfigs).forEach(([derivedKey, derivedConfig]) => {
    if (updatedMasses[derivedKey as keyof LimbMasses] == null) {
      const calculatedValue = calculateDerivedMass(derivedConfig, masses);
      const clampedValue = Math.max(derivedConfig.clamp[0], Math.min(derivedConfig.clamp[1], calculatedValue));
      
      (updatedMasses as any)[derivedKey] = clampedValue;
      
      console.info('DERIVED_MASS_CALCULATOR', 'Derived mass calculated', {
        derivedKey,
        formula: derivedConfig.formula,
        calculatedValue: calculatedValue.toFixed(3),
        clampedValue: clampedValue.toFixed(3),
        clampRange: derivedConfig.clamp,
        philosophy: 'phase_a_derived_mass_calculation'
      });
    }
  });
  
  return updatedMasses;
}