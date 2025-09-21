/**
 * Apply Limb Mass To Bones - Modularized Implementation
 * Main orchestrator using specialized bone modules
 */

import * as THREE from 'three';
import { getBoneMappingConfig } from './boneMapping';
import { calculateAllDerivedMasses, type LimbMasses } from './core/derivedMassCalculator';
import { categorizeBonesByGroups } from './core/boneDiscovery';
import { calculateScaleFactor, applyBoneScaling } from './core/boneScaling';
import { shouldApplyLimbMassToBones } from './core/interplayEvaluator';

/**
 * PHASE A.5: Enhanced limb mass to bones application with strict mapping configuration
 * Implements the new bone mapping JSON with controlled enabling/disabling
 */
export function applyLimbMassToBones(
  root: THREE.Object3D,
  massesIn: LimbMasses,
  shapeParams: Record<string, number> = {},
  opts?: { lengthAxis?: 'x'|'y'|'z'; log?: boolean }
) {
  if (!root) return;
  
  const config = getBoneMappingConfig();
  const lengthAxis = opts?.lengthAxis ?? 'y';

  // Respecte gate / isActive
  if (massesIn?.gate !== 1 || massesIn?.isActive === false) {
    if (opts?.log) {
      console.info('BONE_APPLY — PHASE A.5: skipped by gate/isActive', {
        gate: massesIn?.gate,
        isActive: massesIn?.isActive,
        philosophy: 'phase_a_gate_control'
      });
    }
    return;
  }

  // Calculate derived masses using configuration
  const masses = calculateAllDerivedMasses(massesIn, config.derived_masses);
  
  // AUDIT: Log shape params for interplay debugging
  if (opts?.log) {
    console.info('BONE_APPLY — PHASE A.5: Shape params audit for interplay evaluation', {
      shapeParamsKeys: Object.keys(shapeParams),
      shapeParamsValues: Object.entries(shapeParams).map(([k, v]) => ({ key: k, value: v.toFixed(3) })),
      bodybuilderSize: shapeParams.bodybuilderSize?.toFixed(3) || 'undefined',
      pearFigure: shapeParams.pearFigure?.toFixed(3) || 'undefined',
      philosophy: 'phase_a_shape_params_audit'
    });
  }
  
  // Categorize bones by groups
  const categorizedBones = categorizeBonesByGroups(root, config.bone_groups);
  
  // Apply limb masses using configuration-driven approach
  const boneScaleTarget = new Map<THREE.Bone, number>();
  let touched = 0;
  const enabledMappings: string[] = [];
  const disabledMappings: string[] = [];
  const appliedScales: Array<{ boneName: string; limbMassKey: string; scale: number; enabled: boolean }> = [];

  // Process each mapping from configuration
  config.mappings.forEach(mapping => {
    const mass = (masses as any)[mapping.key];
    if (mass == null || !Number.isFinite(mass)) return;
    
    // Check if this limb mass should be applied to bones
    const shouldApply = mapping.enabled || shouldApplyLimbMassToBones(
      mapping.key, 
      shapeParams, 
      config.interplay.shape_key_overrides
    );
    
    if (!shouldApply) {
      disabledMappings.push(mapping.key);
      if (opts?.log) {
        console.log('BONE_APPLY — PHASE A.5: limb mass disabled by configuration', {
          limbMassKey: mapping.key,
          mass: mass.toFixed(3),
          enabled: mapping.enabled,
          interplayResult: false,
          philosophy: 'phase_a_controlled_disabling'
        });
      }
      return;
    }
    
    enabledMappings.push(mapping.key);

    // Calculate scale factor using configuration
    const scaleFactor = calculateScaleFactor(mass, mapping);
    
    // Find bones for each group
    mapping.groups.forEach(groupName => {
      const bones = categorizedBones[groupName] || [];
      
      bones.forEach(bone => {
        // Apply axis-specific scaling
        const currentScale = boneScaleTarget.get(bone) ?? 1;
        const newScale = Math.max(currentScale, scaleFactor);
        boneScaleTarget.set(bone, newScale);
        
        appliedScales.push({
          boneName: bone.name,
          limbMassKey: mapping.key,
          scale: newScale,
          enabled: true
        });
      });
    });
  });

  // Apply gate factor if configured
  if (config.interplay.gate.apply && masses.gate && masses.gate !== 1) {
    const gateFactor = Math.max(config.interplay.gate.clamp[0], Math.min(config.interplay.gate.clamp[1], masses.gate));
    
    boneScaleTarget.forEach((scale, bone) => {
      boneScaleTarget.set(bone, scale * gateFactor);
    });
    
    if (opts?.log) {
      console.info('BONE_APPLY — PHASE A.5: gate factor applied', {
        gateFactor: gateFactor.toFixed(3),
        gateClamp: config.interplay.gate.clamp,
        affectedBones: boneScaleTarget.size,
        philosophy: 'phase_a_gate_application'
      });
    }
  }

  // Apply bone scaling
  touched = applyBoneScaling(boneScaleTarget, lengthAxis);

  if (opts?.log) {
    console.info('BONE_APPLY — PHASE A.5: configuration-driven bone application completed', {
      touched,
      enabledMappings,
      disabledMappings,
      appliedScales: appliedScales.slice(0, 10), // Log first 10 for brevity
      configVersion: config.version,
      rigId: config.rig_id,
      philosophy: 'phase_a_configuration_driven_bone_application'
    });
  }
}