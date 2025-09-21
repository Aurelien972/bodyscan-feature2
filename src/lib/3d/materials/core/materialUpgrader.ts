/**
 * Material Upgrader
 * Upgrades MeshStandardMaterial to MeshPhysicalMaterial for advanced skin rendering
 */

import * as THREE from 'three';
import logger from '../../../utils/logger';

interface MaterialUpgradeResult {
  upgraded: boolean;
  originalType: string;
  newType: string;
  reason: string;
  sssEnabled: boolean;
}

/**
 * Upgrade MeshStandardMaterial to MeshPhysicalMaterial for skin rendering
 * This is necessary because only MeshPhysicalMaterial supports SSS properties
 */
export function upgradeMaterialToPhysical(
  material: THREE.Material,
  materialName: string
): MaterialUpgradeResult {
  const originalType = material.type;
  const originalConstructor = material.constructor.name;
  
  logger.info('MATERIAL_UPGRADER', 'Evaluating material for upgrade', {
    materialName,
    originalType,
    originalConstructor,
    isMeshStandardMaterial: material instanceof THREE.MeshStandardMaterial,
    isMeshPhysicalMaterial: material instanceof THREE.MeshPhysicalMaterial,
    philosophy: 'material_upgrade_evaluation'
  });

  // If already MeshPhysicalMaterial, just ensure SSS is enabled
  if (material instanceof THREE.MeshPhysicalMaterial) {
    const mat = material as THREE.MeshPhysicalMaterial;
    
    // Force enable SSS if not already enabled
    if (!mat.transmission || mat.transmission === 0) {
      mat.transmission = 0.2;
      mat.thickness = 0.3;
      mat.ior = 1.35;
      mat.attenuationDistance = 0.5;
      mat.attenuationColor = new THREE.Color(0.8, 0.4, 0.2);
      mat.needsUpdate = true;
      
      logger.info('MATERIAL_UPGRADER', 'Enabled SSS on existing MeshPhysicalMaterial', {
        materialName,
        transmission: mat.transmission,
        thickness: mat.thickness,
        ior: mat.ior,
        philosophy: 'sss_activation_existing_physical'
      });
      
      return {
        upgraded: true,
        originalType,
        newType: 'MeshPhysicalMaterial',
        reason: 'sss_enabled_on_existing_physical',
        sssEnabled: true
      };
    }
    
    return {
      upgraded: false,
      originalType,
      newType: 'MeshPhysicalMaterial',
      reason: 'already_physical_with_sss',
      sssEnabled: true
    };
  }

  // If MeshStandardMaterial, upgrade to MeshPhysicalMaterial
  if (material instanceof THREE.MeshStandardMaterial) {
    const oldMat = material as THREE.MeshStandardMaterial;
    
    logger.info('MATERIAL_UPGRADER', 'Upgrading MeshStandardMaterial to MeshPhysicalMaterial', {
      materialName,
      originalProperties: {
        color: oldMat.color ? '#' + oldMat.color.getHexString() : 'none',
        metalness: oldMat.metalness,
        roughness: oldMat.roughness,
        hasMap: !!oldMat.map,
        hasNormalMap: !!oldMat.normalMap,
        hasRoughnessMap: !!oldMat.roughnessMap
      },
      philosophy: 'standard_to_physical_upgrade'
    });

    // Create new MeshPhysicalMaterial with all properties from old material
    const newMat = new THREE.MeshPhysicalMaterial({
      // Copy basic properties
      color: oldMat.color ? oldMat.color.clone() : new THREE.Color(0.8, 0.6, 0.4),
      metalness: oldMat.metalness,
      roughness: oldMat.roughness,
      
      // Copy textures
      map: oldMat.map,
      normalMap: oldMat.normalMap,
      roughnessMap: oldMat.roughnessMap,
      metalnessMap: oldMat.metalnessMap,
      emissiveMap: oldMat.emissiveMap,
      emissive: oldMat.emissive,
      emissiveIntensity: oldMat.emissiveIntensity,
      
      // Copy other properties
      transparent: oldMat.transparent,
      opacity: oldMat.opacity,
      alphaTest: oldMat.alphaTest,
      side: oldMat.side,
      
      // Enable SSS properties for realistic skin
      transmission: 0.2,
      thickness: 0.3,
      ior: 1.35,
      attenuationDistance: 0.5,
      attenuationColor: new THREE.Color(0.8, 0.4, 0.2),
      
      // Surface properties for skin
      sheen: 0.25,
      sheenRoughness: 0.4,
      clearcoat: 0.15,
      clearcoatRoughness: 0.4,
      specularIntensity: 0.8,
      iridescence: 0.05,
      iridescenceIOR: 1.3,
    });

    // Copy name and other metadata
    newMat.name = oldMat.name;
    newMat.userData = { ...oldMat.userData };
    
    logger.info('MATERIAL_UPGRADER', 'MeshPhysicalMaterial created with SSS properties', {
      materialName,
      newMaterialProperties: {
        color: '#' + newMat.color.getHexString(),
        metalness: newMat.metalness,
        roughness: newMat.roughness,
        transmission: newMat.transmission,
        thickness: newMat.thickness,
        ior: newMat.ior,
        attenuationColor: '#' + newMat.attenuationColor.getHexString(),
        sheen: newMat.sheen,
        clearcoat: newMat.clearcoat
      },
      philosophy: 'physical_material_with_sss_created'
    });

    return {
      upgraded: true,
      originalType,
      newType: 'MeshPhysicalMaterial',
      reason: 'upgraded_standard_to_physical_with_sss',
      sssEnabled: true
    };
  }

  // For other material types, cannot upgrade
  logger.warn('MATERIAL_UPGRADER', 'Cannot upgrade material type', {
    materialName,
    materialType: material.type,
    materialConstructor: material.constructor.name,
    reason: 'unsupported_material_type_for_upgrade',
    philosophy: 'upgrade_limitation'
  });

  return {
    upgraded: false,
    originalType,
    newType: originalType,
    reason: 'unsupported_material_type',
    sssEnabled: false
  };
}

/**
 * Replace material on object
 * Replaces the material on a 3D object and disposes of the old material
 */
export function replaceMaterialOnObject(
  obj: THREE.Object3D,
  oldMaterial: THREE.Material,
  newMaterial: THREE.Material
): boolean {
  try {
    const mesh = obj as THREE.Mesh;
    
    if (!mesh.material) {
      logger.warn('MATERIAL_UPGRADER', 'Object has no material to replace', {
        objectName: obj.name,
        philosophy: 'no_material_to_replace'
      });
      return false;
    }

    // Handle both single material and material array
    if (Array.isArray(mesh.material)) {
      const materialIndex = mesh.material.indexOf(oldMaterial);
      if (materialIndex !== -1) {
        mesh.material[materialIndex] = newMaterial;
        
        logger.info('MATERIAL_UPGRADER', 'Replaced material in array', {
          objectName: obj.name,
          materialIndex,
          oldMaterialName: oldMaterial.name,
          newMaterialName: newMaterial.name,
          philosophy: 'array_material_replacement'
        });
        
        return true;
      }
    } else if (mesh.material === oldMaterial) {
      mesh.material = newMaterial;
      
      logger.info('MATERIAL_UPGRADER', 'Replaced single material', {
        objectName: obj.name,
        oldMaterialName: oldMaterial.name,
        newMaterialName: newMaterial.name,
        philosophy: 'single_material_replacement'
      });
      
      return true;
    }

    logger.warn('MATERIAL_UPGRADER', 'Material not found on object for replacement', {
      objectName: obj.name,
      oldMaterialName: oldMaterial.name,
      philosophy: 'material_not_found_for_replacement'
    });
    
    return false;
  } catch (error) {
    logger.error('MATERIAL_UPGRADER', 'Error replacing material on object', {
      objectName: obj.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      philosophy: 'material_replacement_error'
    });
    
    return false;
  }
}

/**
 * Ensure material has valid color property
 * Initializes color property if missing or invalid
 */
export function ensureValidColorProperty(material: THREE.Material): boolean {
  const mat = material as any;
  
  // Check if color property exists and is valid
  if (!mat.color || !(mat.color instanceof THREE.Color)) {
    logger.warn('MATERIAL_UPGRADER', 'Material missing valid color property, initializing', {
      materialName: material.name,
      hasColorProperty: 'color' in mat,
      colorType: typeof mat.color,
      colorConstructor: mat.color ? mat.color.constructor.name : 'undefined',
      philosophy: 'color_property_initialization'
    });
    
    // Initialize with default skin color
    mat.color = new THREE.Color(0.8, 0.6, 0.4);
    mat.needsUpdate = true;
    
    return true;
  }
  
  return false;
}