/**
 * PHASE A.5: Bone Mapping Configuration
 * Implements the strict bone mapping JSON for controlled limb mass application
 */

export interface BoneGroupConfig {
  patterns: string[];
}

export interface BoneMappingConfig {
  key: string;
  enabled: boolean;
  groups: string[];
  axis_scale: { x: number; y: number; z: number };
  distribution: string | Record<string, number>;
  pivot: string;
  propagate_children: boolean;
  blend_mode: string;
  clamp: [number, number];
}

export interface DerivedMassConfig {
  formula: string;
  clamp: [number, number];
}

export interface InterplayRule {
  when: string;
  bones?: string[];
  axis_scale_multiplier?: { x: number; y: number; z: number };
  enable_keys?: string[];
}

interface BoneMappingData {
  version: string;
  rig_id: string;
  gate_default: number;
  selectors: {
    include_regex: string[];
    exclude_regex: string[];
    symmetry: { left_token: string; right_token: string };
  };
  bone_groups: Record<string, BoneGroupConfig>;
  derived_masses: Record<string, DerivedMassConfig>;
  mappings: BoneMappingConfig[];
  interplay: {
    gate: { apply: boolean; mode: string; clamp: [number, number] };
    shape_key_overrides: InterplayRule[];
  };
}

/**
 * PHASE A.5: Strict bone mapping configuration as defined in the plan
 * torsoMass, neckMass, hipMass, and shoulderMass enabled by default
 */
const BONE_MAPPING_CONFIG: BoneMappingData = {
  "version": "1.0",
  "rig_id": "MAS_RIG_V1",
  "gate_default": 1.0,
  "selectors": {
    "include_regex": ["(?i)^(?!c_).*", "(?i)^(?!.*_(ik|fk|ref)).*"],
    "exclude_regex": ["(?i)^c_.*", "(?i).*(?:_ik|_fk|_ref).*", "(?i).*control.*"],
    "symmetry": { "left_token": "l", "right_token": "r" }
  },
  "bone_groups": {
    "CHEST_CORE": { "patterns": ["^spine_01x?$", "^spine_02x?$", "^spine_03x?$"] },
    "NECK_CORE": { "patterns": ["^neckx?$", "^neck_twistx?$"] },
    "HIP_CORE": { "patterns": ["^pelvisx?$", "^hipx?$", "^spine_00x?$"] },
    "SHOULDER_L": { "patterns": ["^clavicle_l$", "^shoulderl?$"] },
    "SHOULDER_R": { "patterns": ["^clavicle_r$", "^shoulderr?$"] },
    "UPPER_ARM_L": { "patterns": ["^shoulderl?$", "^arml?$"] },
    "UPPER_ARM_R": { "patterns": ["^shoulderr?$", "^armr?$"] },
    "FOREARM_L": { "patterns": ["^forearml?$"] },
    "FOREARM_R": { "patterns": ["^forearmr?$"] },
    "THIGH_L": { "patterns": ["^thighl?$"] },
    "THIGH_R": { "patterns": ["^thighr?$"] },
    "CALF_L": { "patterns": ["^(leg|calf)l?$"] },
    "CALF_R": { "patterns": ["^(leg|calf)r?$"] }
  },
  "derived_masses": {},
  "mappings": [
    {
      "key": "torsoMass",
      "enabled": true,
      "groups": ["CHEST_CORE"],
      "axis_scale": { "x": 0.85, "y": 0.10, "z": 0.05 },
      "distribution": { "spine_01": 0.20, "spine_02": 0.45, "spine_03": 0.35 },
      "pivot": "local",
      "propagate_children": true,
      "blend_mode": "multiply",
      "clamp": [0.9, 1.6]
    },
    {
      "key": "neckMass",
      "enabled": true,
      "groups": ["NECK_CORE"],
      "axis_scale": { "x": 0.75, "y": 0.15, "z": 0.10 },
      "distribution": "uniform",
      "pivot": "local",
      "propagate_children": true,
      "blend_mode": "multiply",
      "clamp": [0.85, 1.4]
    },
    {
      "key": "hipMass",
      "enabled": true,
      "groups": ["HIP_CORE"],
      "axis_scale": { "x": 0.8, "y": 0.1, "z": 0.1 },
      "distribution": "uniform",
      "pivot": "local",
      "propagate_children": true,
      "blend_mode": "multiply",
      "clamp": [0.5, 2.0]
    },
    {
      "key": "shoulderMass",
      "enabled": true,
      "groups": ["SHOULDER_L", "SHOULDER_R"],
      "axis_scale": { "x": 0.7, "y": 0.15, "z": 0.15 },
      "distribution": "uniform",
      "pivot": "local",
      "propagate_children": true,
      "blend_mode": "multiply",
      "clamp": [0.5, 2.0]
    },
    {
      "key": "armMass",
      "enabled": true,
      "groups": ["UPPER_ARM_L", "UPPER_ARM_R"],
      "axis_scale": { "x": 0.65, "y": 0.20, "z": 0.15 },
      "distribution": "uniform",
      "pivot": "local",
      "propagate_children": true,
      "blend_mode": "multiply",
      "clamp": [0.85, 1.35]
    },
    {
      "key": "forearmMass",
      "enabled": true,
      "groups": ["FOREARM_L", "FOREARM_R"],
      "axis_scale": { "x": 0.65, "y": 0.20, "z": 0.15 },
      "distribution": "uniform",
      "pivot": "local",
      "propagate_children": true,
      "blend_mode": "multiply",
      "clamp": [0.85, 1.35]
    },
    {
      "key": "thighMass",
      "enabled": true,
      "groups": ["THIGH_L", "THIGH_R"],
      "axis_scale": { "x": 0.70, "y": 0.20, "z": 0.10 },
      "distribution": "uniform",
      "pivot": "local",
      "propagate_children": true,
      "blend_mode": "multiply",
      "clamp": [0.85, 1.45]
    },
    {
      "key": "calfMass",
      "enabled": true,
      "groups": ["CALF_L", "CALF_R"],
      "axis_scale": { "x": 0.70, "y": 0.20, "z": 0.10 },
      "distribution": "uniform",
      "pivot": "local",
      "propagate_children": true,
      "blend_mode": "multiply",
      "clamp": [0.85, 1.45]
    }
  ],
  "interplay": {
    "gate": { "apply": true, "mode": "multiply_all", "clamp": [0.8, 1.2] },
    "shape_key_overrides": [
      {
        "when": "pearFigure>=1.2 || bodybuilderSize<=-0.5",
        "bones": ["CHEST_CORE"],
        "axis_scale_multiplier": { "x": 1.0, "y": 0.9, "z": 0.9 }
      },
      {
        "when": "bodybuilderSize>=0.8",
        "bones": ["UPPER_ARM_L", "UPPER_ARM_R", "FOREARM_L", "FOREARM_R", "THIGH_L", "THIGH_R", "CALF_L", "CALF_R"],
        "enable_keys": ["armMass", "forearmMass", "thighMass", "calfMass"]
      },
      {
        "when": "pearFigure>=0.5",
        "bones": ["UPPER_ARM_L", "UPPER_ARM_R", "FOREARM_L", "FOREARM_R", "THIGH_L", "THIGH_R", "CALF_L", "CALF_R"],
        "enable_keys": ["armMass", "forearmMass", "thighMass", "calfMass"]
      }
    ]
  }
};

/**
 * PHASE A.5: Get bone mapping configuration
 */
export function getBoneMappingConfig(): BoneMappingData {
  return BONE_MAPPING_CONFIG;
}

/**
 * PHASE A.5: Check if a limb mass key should be applied to bones
 */
function shouldApplyLimbMassToBones(
  limbMassKey: string,
  shapeParams: Record<string, number> = {}
): boolean {
  const config = getBoneMappingConfig();
  
  // Find the mapping for this limb mass key
  const mapping = config.mappings.find(m => m.key === limbMassKey);
  
  if (!mapping) {
    console.warn('BONE_MAPPING', 'No mapping found for limb mass key', {
      limbMassKey,
      availableKeys: config.mappings.map(m => m.key),
      philosophy: 'phase_a_strict_mapping'
    });
    return false;
  }
  
  // Check if enabled by default
  if (mapping.enabled) {
    console.log('BONE_MAPPING', 'Limb mass enabled by default', {
      limbMassKey,
      enabled: true,
      philosophy: 'phase_a_default_enabled'
    });
    return true;
  }
  
  // Check interplay rules for dynamic enabling
  for (const rule of config.interplay.shape_key_overrides) {
    if (rule.enable_keys?.includes(limbMassKey)) {
      const shouldEnable = evaluateInterplayCondition(rule.when, shapeParams);
      
      console.log('BONE_MAPPING', 'Interplay rule evaluation', {
        limbMassKey,
        condition: rule.when,
        shouldEnable,
        shapeParamsUsed: Object.keys(shapeParams).filter(k => rule.when.includes(k)),
        philosophy: 'phase_a_interplay_evaluation'
      });
      
      if (shouldEnable) {
        return true;
      }
    }
  }
  
  console.log('BONE_MAPPING', 'Limb mass disabled by configuration', {
    limbMassKey,
    defaultEnabled: mapping.enabled,
    interplayEnabled: false,
    philosophy: 'phase_a_controlled_disabling'
  });
  
  return false;
}

/**
 * PHASE A.5: Evaluate interplay condition
 * Simple expression evaluator for bone mapping conditions
 */
function evaluateInterplayCondition(
  condition: string,
  shapeParams: Record<string, number>
): boolean {
  try {
    // Replace shape param names with their values
    let expression = condition;
    
    Object.entries(shapeParams).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, value.toString());
    });
    
    // Simple evaluation for basic conditions
    // This is a simplified evaluator - in production, use a proper expression parser
    if (expression.includes('>=')) {
      const [left, right] = expression.split('>=').map(s => s.trim());
      const leftVal = parseFloat(left);
      const rightVal = parseFloat(right);
      return !isNaN(leftVal) && !isNaN(rightVal) && leftVal >= rightVal;
    }
    
    if (expression.includes('<=')) {
      const [left, right] = expression.split('<=').map(s => s.trim());
      const leftVal = parseFloat(left);
      const rightVal = parseFloat(right);
      return !isNaN(leftVal) && !isNaN(rightVal) && leftVal <= rightVal;
    }
    
    if (expression.includes('||')) {
      const conditions = expression.split('||').map(s => s.trim());
      return conditions.some(cond => evaluateInterplayCondition(cond, shapeParams));
    }
    
    if (expression.includes('&&')) {
      const conditions = expression.split('&&').map(s => s.trim());
      return conditions.every(cond => evaluateInterplayCondition(cond, shapeParams));
    }
    
    // Fallback: return false for unknown expressions
    console.warn('BONE_MAPPING', 'Unknown interplay condition format', {
      condition,
      expression,
      philosophy: 'phase_a_condition_evaluation_fallback'
    });
    
    return false;
  } catch (error) {
    console.error('BONE_MAPPING', 'Error evaluating interplay condition', {
      condition,
      error: error instanceof Error ? error.message : 'Unknown error',
      philosophy: 'phase_a_condition_evaluation_error'
    });
    return false;
  }
}