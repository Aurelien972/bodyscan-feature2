import * as THREE from 'three';
import logger from '../../../utils/logger';

// Exclusion list for materials that should never be tinted as skin
const MATERIAL_EXCLUSIONS = [
  'eyes', 'eye', 'reflection', 'teeth', 'tooth', 'nail', 'hair', 
  'eyelash', 'eyebrow', 'pupil', 'iris', 'cornea', 'sclera',
  'metal', 'glass', 'chrome', 'mirror', 'lens'
];

// Inclusion list for materials that should definitely be treated as skin
const SKIN_INCLUSIONS = [
  'skin', 'body', 'head', 'torso', 'basemesh', 'flesh'
];

// NOUVEAU: Inclusion list for materials that should be treated as face
const FACE_INCLUSIONS = [
  'face', 'head', 'visage', 'tete'
];

interface MaterialClassification {
  isSkinMaterial: boolean;
  isFaceMaterial: boolean; // NOUVEAU: Indicateur pour les matériaux faciaux
  isIncluded: boolean;
  isExcluded: boolean;
  inclusionMatches: string[];
  exclusionMatches: string[];
  reason: string;
}

/**
 * Classify if a material should be treated as skin or face
 */
export function classifyMaterial(
  material: THREE.Material,
  objectName: string
): MaterialClassification {
  const materialName = (material.name || '').toLowerCase();
  const objName = objectName.toLowerCase();
  
  // Check exclusions first (priority)
  const exclusionMatches = MATERIAL_EXCLUSIONS.filter(excluded => 
    materialName.includes(excluded) || objName.includes(excluded)
  );
  const isExcluded = exclusionMatches.length > 0;
  
  // Then check inclusions for body skin
  const skinInclusionMatches = SKIN_INCLUSIONS.filter(included => 
    materialName.includes(included) || objName.includes(included)
  );
  const isSkinMaterial = skinInclusionMatches.length > 0 && !isExcluded;

  // NOUVEAU: Check inclusions for face skin
  const faceInclusionMatches = FACE_INCLUSIONS.filter(included =>
    materialName.includes(included) || objName.includes(included)
  );
  const isFaceMaterial = faceInclusionMatches.length > 0 && !isExcluded;

  // Overall inclusion matches (for logging)
  const inclusionMatches = [...new Set([...skinInclusionMatches, ...faceInclusionMatches])];
  const isIncluded = inclusionMatches.length > 0;

  const reason = !isIncluded ? 'not_in_any_inclusions' : 
                isExcluded ? 'in_material_exclusions' : 
                (isSkinMaterial && isFaceMaterial) ? 'classified_as_skin_and_face' :
                isSkinMaterial ? 'classified_as_skin' :
                isFaceMaterial ? 'classified_as_face' : 'unknown';

  logger.info('MATERIAL_IDENTIFIER', 'Material classification decision', {
    materialName,
    objectName: objName,
    isIncluded,
    isExcluded,
    isSkinMaterial,
    isFaceMaterial, // NOUVEAU: Log isFaceMaterial
    inclusionMatches,
    exclusionMatches,
    materialUuid: material.uuid,
    decision: (isSkinMaterial || isFaceMaterial) ? 'APPLY_SKIN_TONE' : 'SKIP_MATERIAL',
    reason,
    philosophy: 'material_classification_logic'
  });

  return {
    isSkinMaterial,
    isFaceMaterial, // NOUVEAU: Retourner isFaceMaterial
    isIncluded,
    isExcluded,
    inclusionMatches,
    exclusionMatches,
    reason
  };
}

/**
 * Validate that material has required properties for skin application
 */
export function validateMaterialForSkin(material: THREE.Material): {
  isValid: boolean;
  hasColor: boolean;
  isCompatibleType: boolean;
  materialType: string;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check if material has color property
  const hasColor = 'color' in material && 
                   (material as any).color && 
                   ((material as any).color instanceof THREE.Color);
  
  if (!hasColor) {
    // ENHANCED: Detailed color property diagnosis
    const colorExists = 'color' in material;
    const colorValue = (material as any).color;
    const colorType = typeof colorValue;
    const isThreeColor = colorValue instanceof THREE.Color;
    
    issues.push(`Missing or invalid color property - exists: ${colorExists}, type: ${colorType}, isThreeColor: ${isThreeColor}, value: ${colorValue}`);
    
    logger.warn('MATERIAL_IDENTIFIER', 'DETAILED COLOR PROPERTY DIAGNOSIS', {
      materialName: material.name || 'unnamed',
      materialType: material.type,
      materialConstructor: material.constructor.name,
      colorPropertyDiagnosis: {
        colorPropertyExists: colorExists,
        colorValue: colorValue,
        colorType: colorType,
        colorConstructor: colorValue ? colorValue.constructor.name : 'undefined',
        isThreeColor: isThreeColor,
        colorHex: isThreeColor ? '#' + colorValue.getHexString() : 'invalid',
        materialReadOnly: Object.isFrozen(material),
        materialSealed: Object.isSealed(material)
      },
      philosophy: 'detailed_color_property_diagnosis'
    });
  }
  
  // Check if material type is compatible with PBR
  const isCompatibleType = material instanceof THREE.MeshStandardMaterial || 
                          material instanceof THREE.MeshPhysicalMaterial;
  
  if (!isCompatibleType) {
    issues.push(`Incompatible material type: ${material.type} (constructor: ${material.constructor.name})`);
    
    logger.warn('MATERIAL_IDENTIFIER', 'MATERIAL TYPE INCOMPATIBILITY DETAILED', {
      materialName: material.name || 'unnamed',
      materialType: material.type,
      materialConstructor: material.constructor.name,
      materialUuid: material.uuid,
      typeCompatibilityAnalysis: {
        isMeshStandardMaterial: material instanceof THREE.MeshStandardMaterial,
        isMeshPhysicalMaterial: material instanceof THREE.MeshPhysicalMaterial,
        isMeshBasicMaterial: material instanceof THREE.MeshBasicMaterial,
        isMeshLambertMaterial: material instanceof THREE.MeshLambertMaterial,
        isMeshPhongMaterial: material instanceof THREE.MeshPhongMaterial,
        actualType: material.type,
        supportsPBR: material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial,
        supportsSSS: material instanceof THREE.MeshPhysicalMaterial
      },
      philosophy: 'material_type_incompatibility_detailed'
    });
  }
  
  const isValid = hasColor && issues.length === 0;
  
  // ENHANCED: Always log material validation details, especially for failures
  const logLevel = isValid ? 'debug' : 'warn';
  const logMessage = isValid ? 'Material validation for skin application' : 'MATERIAL VALIDATION FAILED - Detailed analysis';
  
  logger[logLevel]('MATERIAL_IDENTIFIER', logMessage, {
    materialName: material.name || 'unnamed',
    materialType: material.type,
    materialConstructor: material.constructor.name,
    materialUuid: material.uuid,
    hasColor,
    isCompatibleType,
    isValid,
    issues,
    // ENHANCED: Additional material properties for debugging
    materialProperties: {
      hasMap: !!(material as any).map,
      hasNormalMap: !!(material as any).normalMap,
      hasRoughnessMap: !!(material as any).roughnessMap,
      hasMetalnessMap: !!(material as any).metalnessMap,
      hasEmissiveMap: !!(material as any).emissiveMap,
      // Check for PBR-specific properties
      hasTransmission: 'transmission' in material,
      hasThickness: 'thickness' in material,
      hasIor: 'ior' in material,
      hasAttenuationColor: 'attenuationColor' in material,
      hasSheen: 'sheen' in material,
      hasClearcoat: 'clearcoat' in material,
      // Current property values if they exist
      currentColor: hasColor ? (material as any).color.getHex() : 'none',
      currentMetalness: (material as any).metalness || 'undefined',
      currentRoughness: (material as any).roughness || 'undefined',
      currentTransmission: (material as any).transmission || 'undefined',
      currentThickness: (material as any).thickness || 'undefined'
    },
    // ENHANCED: Detailed validation breakdown
    validationBreakdown: {
      colorValidation: {
        hasColorProperty: 'color' in material,
        colorIsObject: !!(material as any).color,
        colorIsThreeColor: (material as any).color instanceof THREE.Color,
        colorValue: hasColor ? (material as any).color.getHex() : 'invalid'
      },
      typeValidation: {
        isMeshStandardMaterial: material instanceof THREE.MeshStandardMaterial,
        isMeshPhysicalMaterial: material instanceof THREE.MeshPhysicalMaterial,
        actualType: material.type,
        actualConstructor: material.constructor.name,
        supportsPBR: material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial,
        supportsSSS: material instanceof THREE.MeshPhysicalMaterial
      }
    },
    philosophy: 'material_validation_audit'
  });
  
  return {
    isValid,
    hasColor,
    isCompatibleType,
    materialType: material.type,
    issues
  };
}

/**
 * Get all materials from an object (handles both single and array materials)
 */
export function getMaterialsFromObject(obj: THREE.Object3D): THREE.Material[] {
  const material = (obj as any).material;
  if (!material) return [];
  
  return Array.isArray(material) ? material : [material];
}

