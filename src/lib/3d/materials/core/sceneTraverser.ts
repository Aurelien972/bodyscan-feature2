/**
 * Scene Traverser
 * Handles scene traversal and material discovery
 */

import * as THREE from 'three';
import { getMaterialsFromObject } from './materialIdentifier';
import logger from '../../../utils/logger';

interface TraversalResult {
  totalObjects: number;
  objectsWithMaterials: number;
  totalMaterials: number;
  materialsByType: Record<string, number>;
  objectNames: string[];
  materialNames: string[];
}

/**
 * Traverse scene and collect material information
 */
export function traverseSceneForMaterials(
  scene: THREE.Scene,
  callback: (obj: THREE.Object3D, materials: THREE.Material[]) => void
): TraversalResult {
  logger.info('SCENE_TRAVERSER', 'Starting scene traversal for materials', {
    sceneChildren: scene.children.length,
    sceneUuid: scene.uuid,
    philosophy: 'scene_traversal_audit'
  });

  const result: TraversalResult = {
    totalObjects: 0,
    objectsWithMaterials: 0,
    totalMaterials: 0,
    materialsByType: {},
    objectNames: [],
    materialNames: []
  };

  scene.traverse((obj: THREE.Object3D) => {
    result.totalObjects++;
    result.objectNames.push(obj.name || 'unnamed');
    
    // ENHANCED: Log every object being traversed with material details
    logger.debug('SCENE_TRAVERSER', 'Traversing object with detailed material analysis', {
      objectName: obj.name || 'unnamed',
      objectType: obj.type || 'unknown',
      objectUuid: obj.uuid,
      hasMaterial: !!(obj as any).material,
      isSkinnedMesh: (obj as any).isSkinnedMesh || false,
      isMesh: (obj as any).isMesh || false,
      // ENHANCED: Detailed material information
      materialDetails: (obj as any).material ? {
        materialCount: Array.isArray((obj as any).material) ? (obj as any).material.length : 1,
        materialTypes: Array.isArray((obj as any).material) ? 
          (obj as any).material.map((m: THREE.Material) => m.type) : 
          [(obj as any).material.type],
        materialNames: Array.isArray((obj as any).material) ? 
          (obj as any).material.map((m: THREE.Material) => m.name || 'unnamed') : 
          [(obj as any).material.name || 'unnamed'],
        materialConstructors: Array.isArray((obj as any).material) ? 
          (obj as any).material.map((m: THREE.Material) => m.constructor.name) : 
          [(obj as any).material.constructor.name]
      } : null,
      philosophy: 'object_traversal_audit'
    });

    const materials = getMaterialsFromObject(obj);
    
    if (materials.length > 0) {
      result.objectsWithMaterials++;
      result.totalMaterials += materials.length;
      
      materials.forEach(material => {
        const materialType = material.type;
        result.materialsByType[materialType] = (result.materialsByType[materialType] || 0) + 1;
        result.materialNames.push(material.name || 'unnamed');
        
        // ENHANCED: Comprehensive material discovery logging
        logger.debug('SCENE_TRAVERSER', 'Found material - comprehensive analysis', {
          objectName: obj.name || 'unnamed',
          materialName: material.name || 'unnamed',
          materialType,
          materialConstructor: material.constructor.name,
          materialUuid: material.uuid,
          // ENHANCED: Material capabilities analysis
          materialCapabilities: {
            isPBRCompatible: material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial,
            supportsSSS: material instanceof THREE.MeshPhysicalMaterial,
            hasColorProperty: 'color' in material && (material as any).color instanceof THREE.Color,
            currentColor: 'color' in material && (material as any).color ? 
              '#' + (material as any).color.getHexString() : 'none',
            hasTransmissionSupport: 'transmission' in material,
            hasThicknessSupport: 'thickness' in material,
            hasAttenuationSupport: 'attenuationColor' in material,
            hasSheenSupport: 'sheen' in material,
            hasClearcoatSupport: 'clearcoat' in material
          },
          // ENHANCED: Current material state
          currentMaterialState: {
            metalness: (material as any).metalness || 'undefined',
            roughness: (material as any).roughness || 'undefined',
            transmission: (material as any).transmission || 'undefined',
            thickness: (material as any).thickness || 'undefined',
            ior: (material as any).ior || 'undefined',
            needsUpdate: (material as any).needsUpdate || false
          },
          philosophy: 'material_discovery'
        });
      });
      
      // Call the callback for processing
      callback(obj, materials);
    } else {
      // ENHANCED: Log objects without materials with more context
      logger.debug('SCENE_TRAVERSER', 'Object has no materials - detailed analysis', {
        objectName: obj.name || 'unnamed',
        objectType: obj.type,
        objectConstructor: obj.constructor.name,
        objectUuid: obj.uuid,
        hasGeometry: !!(obj as any).geometry,
        hasChildren: obj.children.length > 0,
        childrenCount: obj.children.length,
        isLight: !!(obj as any).isLight,
        isCamera: !!(obj as any).isCamera,
        isHelper: obj.type.includes('Helper'),
        philosophy: 'no_materials_found'
      });
    }
  });

  logger.info('SCENE_TRAVERSER', 'Scene traversal completed', {
    totalObjects: result.totalObjects,
    objectsWithMaterials: result.objectsWithMaterials,
    totalMaterials: result.totalMaterials,
    materialsByType: result.materialsByType,
    uniqueObjectNames: [...new Set(result.objectNames)].slice(0, 10),
    uniqueMaterialNames: [...new Set(result.materialNames)].slice(0, 10),
    philosophy: 'scene_traversal_complete'
  });

  return result;
}