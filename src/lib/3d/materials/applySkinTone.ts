import * as THREE from 'three';
import logger from '../../utils/logger';
import { type SkinToneV2, isSkinToneV2 } from '../../scan/normalizeSkinTone';
import { classifyMaterial, validateMaterialForSkin } from './core/materialIdentifier';
import { calculateSkinProperties, applySkinPropertiesToMaterial } from './core/skinProperties';
import { traverseSceneForMaterials } from './core/sceneTraverser';
import { forceMaterialCompilation, updateAllMaterials } from './core/materialCompiler';
import { upgradeMaterialToPhysical, replaceMaterialOnObject, ensureValidColorProperty } from './core/materialUpgrader';

export interface SkinToneApplicationResult {
  appliedCount: number;
  skippedCount: number;
  errorCount: number;
  success: boolean;
  errorMessage?: string;
  materialsProcessed: number;
  traversalResult?: any;
  skinMaterialsFound: number;
  skinMaterialsModified: number;
  materialsUpgraded: number;
  sssEnabled: number;
}

/**
 * Apply skin tone to all skin materials in the scene
 * MODULARIZED: Uses specialized modules for each aspect of skin tone application
 */
export function applySkinToneToScene(scene: THREE.Scene, tone: SkinToneV2): SkinToneApplicationResult {
  // Input validation and telemetry
  logger.info('SKIN_TONE_APPLICATION_V2', 'Starting modularized V2 skin tone application', {
    inputSkinTone: {
      rgb: tone.rgb,
      hex: tone.hex,
      srgb_f32: tone.srgb_f32,
      linear_f32: tone.linear_f32,
      schema: tone.schema,
      source: tone.source,
      confidence: tone.confidence,
      space: tone.space,
      format: tone.format
    },
    sceneChildren: scene.children.length,
    philosophy: 'modularized_v2_skin_tone_application'
  });

  // Validate V2 format
  if (!isSkinToneV2(tone)) {
    logger.error('SKIN_TONE_APPLICATION_V2', 'Invalid skin tone format - expected V2', {
      receivedTone: tone,
      philosophy: 'v2_format_validation_failed'
    });
    return {
      appliedCount: 0,
      skippedCount: 0,
      errorCount: 1,
      success: false,
      errorMessage: 'Invalid skin tone format - expected V2',
      materialsProcessed: 0,
      skinMaterialsFound: 0,
      skinMaterialsModified: 0,
      materialsUpgraded: 0,
      sssEnabled: 0
    };
  }

  // Calculate optimal skin properties
  const skinProperties = calculateSkinProperties(tone);

  // Initialize counters
  let appliedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let skinMaterialsFound = 0;
  let materialsUpgraded = 0;
  let sssEnabled = 0;
  let lastError: string | undefined;

  // Traverse scene and process materials
  const traversalResult = traverseSceneForMaterials(scene, (obj, materials) => {
    materials.forEach((material, index) => {
      try {
        // STEP 0: Ensure material has valid color property
        const colorFixed = ensureValidColorProperty(material);
        if (colorFixed) {
          logger.info('SKIN_TONE_APPLICATION_V2', 'Fixed missing color property', {
            materialName: material.name || 'unnamed',
            objectName: obj.name || 'unnamed',
            philosophy: 'color_property_initialization'
          });
        }

        // ENHANCED: Log every material being processed with comprehensive details
        logger.info('SKIN_TONE_APPLICATION_V2', 'PROCESSING MATERIAL - Comprehensive Analysis', {
          materialName: material.name || 'unnamed',
          objectName: obj.name || 'unnamed',
          materialIndex: index,
          materialType: material.type,
          materialConstructor: material.constructor.name,
          materialUuid: material.uuid,
          // ENHANCED: Complete material capabilities audit
          materialCapabilities: {
            isPBRCompatible: material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial,
            isMeshStandardMaterial: material instanceof THREE.MeshStandardMaterial,
            isMeshPhysicalMaterial: material instanceof THREE.MeshPhysicalMaterial,
            supportsSSS: material instanceof THREE.MeshPhysicalMaterial,
            hasColorProperty: 'color' in material && (material as any).color instanceof THREE.Color,
            hasTransmissionSupport: 'transmission' in material,
            hasThicknessSupport: 'thickness' in material,
            hasAttenuationSupport: 'attenuationColor' in material,
            hasSheenSupport: 'sheen' in material,
            hasClearcoatSupport: 'clearcoat' in material,
            hasIorSupport: 'ior' in material
          },
          // ENHANCED: Current material state before modification
          currentMaterialState: {
            color: 'color' in material && (material as any).color ? 
              '#' + (material as any).color.getHexString() : 'none',
            metalness: (material as any).metalness || 'undefined',
            roughness: (material as any).roughness || 'undefined',
            transmission: (material as any).transmission || 'undefined',
            thickness: (material as any).thickness || 'undefined',
            ior: (material as any).ior || 'undefined',
            attenuationColor: (material as any).attenuationColor ? 
              '#' + (material as any).attenuationColor.getHexString() : 'undefined',
            sheen: (material as any).sheen || 'undefined',
            clearcoat: (material as any).clearcoat || 'undefined',
            needsUpdate: (material as any).needsUpdate || false,
            hasMap: !!(material as any).map,
            hasNormalMap: !!(material as any).normalMap,
            hasRoughnessMap: !!(material as any).roughnessMap
          },
          philosophy: 'comprehensive_material_pre_processing_audit'
        });

        // Classify material first
        const classification = classifyMaterial(material, obj.name || '');
        
        // MODIFIED: Inclure les matériaux faciaux dans la classification
        if (!classification.isSkinMaterial && !classification.isFaceMaterial) {
          logger.debug('SKIN_TONE_APPLICATION_V2', 'Material skipped - not classified as skin or face', {
            materialName: material.name || 'unnamed',
            objectName: obj.name || 'unnamed',
            classification,
            philosophy: 'material_classification_skip'
          });
          skippedCount++;
          return;
        }

        // Found a skin or face material
        skinMaterialsFound++;
        
        // STEP 1: Try to upgrade material to MeshPhysicalMaterial if needed
        let workingMaterial = material;
        const upgradeResult = upgradeMaterialToPhysical(material, material.name || 'unnamed');
        
        if (upgradeResult.upgraded && upgradeResult.reason === 'upgraded_standard_to_physical_with_sss') {
          // The upgrade function returns info but doesn't actually replace the material
          // We need to create the new material and replace it
          const oldMat = material as THREE.MeshStandardMaterial;
          const newMat = new THREE.MeshPhysicalMaterial({
            // Copy all properties from old material
            color: oldMat.color ? oldMat.color.clone() : new THREE.Color(0.8, 0.6, 0.4),
            metalness: oldMat.metalness,
            roughness: oldMat.roughness,
            map: oldMat.map,
            normalMap: oldMat.normalMap,
            roughnessMap: oldMat.roughnessMap,
            metalnessMap: oldMat.metalnessMap,
            emissiveMap: oldMat.emissiveMap,
            emissive: oldMat.emissive,
            emissiveIntensity: oldMat.emissiveIntensity,
            transparent: oldMat.transparent,
            opacity: oldMat.opacity,
            alphaTest: oldMat.alphaTest,
            side: oldMat.side,
            // SSS properties
            transmission: 0.2,
            thickness: 0.3,
            ior: 1.35,
            attenuationDistance: 0.5,
            attenuationColor: new THREE.Color(0.8, 0.4, 0.2),
            sheen: 0.25,
            sheenRoughness: 0.4,
            clearcoat: 0.15,
            clearcoatRoughness: 0.4,
            specularIntensity: 0.8,
            iridescence: 0.05,
            iridescenceIOR: 1.3,
          });
          
          newMat.name = oldMat.name;
          newMat.userData = { ...oldMat.userData };
          
          // Replace material on object
          const replaced = replaceMaterialOnObject(obj, material, newMat);
          if (replaced) {
            workingMaterial = newMat;
            materialsUpgraded++;
            sssEnabled++;
            
            // Dispose old material
            material.dispose();
            
            logger.info('MATERIAL_UPGRADER', 'Successfully upgraded and replaced material', {
              materialName: newMat.name || 'unnamed',
              objectName: obj.name || 'unnamed',
              upgradeResult,
              philosophy: 'material_upgrade_and_replacement_success'
            });
          } else {
            logger.error('MATERIAL_UPGRADER', 'Failed to replace upgraded material on object', {
              materialName: material.name || 'unnamed',
              objectName: obj.name || 'unnamed',
              philosophy: 'material_replacement_failure'
            });
            errorCount++;
            return;
          }
        } else if (upgradeResult.sssEnabled) {
          // Material was already physical, just SSS was enabled
          sssEnabled++;
        }

        // Validate material
        const validation = validateMaterialForSkin(workingMaterial);
        if (!validation.isValid) {
          // ENHANCED: Detailed validation failure logging
          logger.warn('SKIN_TONE_APPLICATION_V2', 'MATERIAL VALIDATION FAILED - Complete Diagnostic', {
            materialName: workingMaterial.name || 'unnamed',
            objectName: obj.name || 'unnamed',
            materialType: workingMaterial.type,
            materialConstructor: workingMaterial.constructor.name,
            materialUuid: workingMaterial.uuid,
            issues: validation.issues,
            // ENHANCED: Detailed validation breakdown
            validationDetails: {
              hasColor: validation.hasColor,
              isCompatibleType: validation.isCompatibleType,
              materialType: validation.materialType,
              colorPropertyExists: 'color' in workingMaterial && (workingMaterial as any).color instanceof THREE.Color,
              colorIsThreeColor: 'color' in workingMaterial && (workingMaterial as any).color instanceof THREE.Color,
              colorValue: 'color' in workingMaterial && (workingMaterial as any).color ? 
                '#' + (workingMaterial as any).color.getHexString() : 'none',
              isMeshStandardMaterial: workingMaterial instanceof THREE.MeshStandardMaterial,
              isMeshPhysicalMaterial: workingMaterial instanceof THREE.MeshPhysicalMaterial,
              actualType: workingMaterial.type,
              actualConstructor: workingMaterial.constructor.name
            },
            // ENHANCED: Failure impact analysis
            failureImpact: {
              willSkipMaterial: true,
              reasonForSkip: validation.issues.join(', '),
              potentialSkinMaterial: workingMaterial.name ? 
                (workingMaterial.name.toLowerCase().includes('skin') || 
                 workingMaterial.name.toLowerCase().includes('body') || 
                 workingMaterial.name.toLowerCase().includes('basemesh')) : false
            },
            philosophy: 'material_validation_failed'
          });
          skippedCount++;
          return;
        }

        // ENHANCED: Comprehensive skin material processing log
        logger.info('SKIN_TONE_APPLICATION_V2', 'PROCESSING SKIN MATERIAL - Complete Pre-Processing Audit', {
          materialName: workingMaterial.name || 'unnamed',
          objectName: obj.name || 'unnamed',
          materialType: workingMaterial.type,
          materialConstructor: workingMaterial.constructor.name,
          materialUuid: workingMaterial.uuid,
          materialIndex: index,
          classification,
          validation,
          upgradeResult,
          // ENHANCED: Pre-processing material state
          preProcessingState: {
            currentColor: 'color' in workingMaterial && (workingMaterial as any).color ? 
              '#' + (workingMaterial as any).color.getHexString() : 'none',
            currentColorRGB: 'color' in workingMaterial && (workingMaterial as any).color ? {
              r: (workingMaterial as any).color.r.toFixed(6),
              g: (workingMaterial as any).color.g.toFixed(6),
              b: (workingMaterial as any).color.b.toFixed(6)
            } : null,
            currentMetalness: (workingMaterial as any).metalness || 'undefined',
            currentRoughness: (workingMaterial as any).roughness || 'undefined',
            currentTransmission: (workingMaterial as any).transmission || 'undefined',
            currentThickness: (workingMaterial as any).thickness || 'undefined',
            currentIor: (workingMaterial as any).ior || 'undefined',
            currentAttenuationColor: (workingMaterial as any).attenuationColor ? 
              '#' + (workingMaterial as any).attenuationColor.getHexString() : 'undefined',
            currentSheen: (workingMaterial as any).sheen || 'undefined',
            currentClearcoat: (workingMaterial as any).clearcoat || 'undefined',
            hasBaseColorTexture: !!(workingMaterial as any).map,
            needsUpdate: (workingMaterial as any).needsUpdate || false
          },
          // ENHANCED: SSS capability analysis
          sssCapabilityAnalysis: {
            isMeshPhysicalMaterial: workingMaterial instanceof THREE.MeshPhysicalMaterial,
            hasAllSSSProperties: workingMaterial instanceof THREE.MeshPhysicalMaterial && 
              'transmission' in workingMaterial && 'thickness' in workingMaterial && 'attenuationColor' in workingMaterial,
            sssPropertiesAvailable: {
              transmission: 'transmission' in workingMaterial,
              thickness: 'thickness' in workingMaterial,
              ior: 'ior' in workingMaterial,
              attenuationDistance: 'attenuationDistance' in workingMaterial,
              attenuationColor: 'attenuationColor' in workingMaterial,
              sheen: 'sheen' in workingMaterial,
              sheenRoughness: 'sheenRoughness' in workingMaterial,
              clearcoat: 'clearcoat' in workingMaterial
            }
          },
          philosophy: 'skin_material_processing'
        });

        // Apply skin properties
        const success = applySkinPropertiesToMaterial(
          workingMaterial,
          skinProperties,
          workingMaterial.name || 'unnamed'
        );

        if (success) {
          appliedCount++;
          
          // Force material compilation
          forceMaterialCompilation(scene, workingMaterial.name || 'unnamed');
          
          // ENHANCED: Detailed success logging with post-processing state
          logger.info('SKIN_TONE_APPLICATION_V2', 'SUCCESS: Skin material updated - Post-Processing Audit', {
            materialName: workingMaterial.name || 'unnamed',
            objectName: obj.name || 'unnamed',
            materialType: workingMaterial.type,
            materialConstructor: workingMaterial.constructor.name,
            skinToneApplied: `rgb(${tone.rgb.r}, ${tone.rgb.g}, ${tone.rgb.b})`,
            materialWasUpgraded: upgradeResult.upgraded,
            sssWasEnabled: upgradeResult.sssEnabled,
            // ENHANCED: Post-processing material state
            postProcessingState: {
              finalColor: 'color' in workingMaterial && (workingMaterial as any).color ? 
                '#' + (workingMaterial as any).color.getHexString() : 'none',
              finalColorRGB: 'color' in workingMaterial && (workingMaterial as any).color ? {
                r: (workingMaterial as any).color.r.toFixed(6),
                g: (workingMaterial as any).color.g.toFixed(6),
                b: (workingMaterial as any).color.b.toFixed(6)
              } : null,
              finalMetalness: (workingMaterial as any).metalness || 'undefined',
              finalRoughness: (workingMaterial as any).roughness || 'undefined',
              finalTransmission: (workingMaterial as any).transmission || 'undefined',
              finalThickness: (workingMaterial as any).thickness || 'undefined',
              finalIor: (workingMaterial as any).ior || 'undefined',
              finalAttenuationColor: (workingMaterial as any).attenuationColor ? 
                '#' + (workingMaterial as any).attenuationColor.getHexString() : 'undefined',
              finalSheen: (workingMaterial as any).sheen || 'undefined',
              finalClearcoat: (workingMaterial as any).clearcoat || 'undefined',
              needsUpdateSet: (workingMaterial as any).needsUpdate || false,
              baseTextureRemoved: !(workingMaterial as any).map
            },
            // ENHANCED: Application success metrics
            applicationMetrics: {
              colorApplicationSuccess: 'color' in workingMaterial && (workingMaterial as any).color && 
                Math.abs((workingMaterial as any).color.r - tone.linear_f32.r) < 0.01 &&
                Math.abs((workingMaterial as any).color.g - tone.linear_f32.g) < 0.01 &&
                Math.abs((workingMaterial as any).color.b - tone.linear_f32.b) < 0.01,
              sssPropertiesApplied: material instanceof THREE.MeshPhysicalMaterial,
              materialCompilationForced: true
            },
            philosophy: 'skin_material_success'
          });
        } else {
          errorCount++;
          lastError = `Failed to apply properties to material ${workingMaterial.name}`;
          
          // ENHANCED: Detailed failure logging
          logger.error('SKIN_TONE_APPLICATION_V2', 'FAILED: Skin material update failed - Complete Diagnostic', {
            materialName: workingMaterial.name || 'unnamed',
            objectName: obj.name || 'unnamed',
            materialType: workingMaterial.type,
            materialConstructor: workingMaterial.constructor.name,
            materialUuid: workingMaterial.uuid,
            // ENHANCED: Failure analysis
            failureAnalysis: {
              materialWasValidated: validation.isValid,
              materialWasClassifiedAsSkin: classification.isSkinMaterial,
              materialTypeSupported: workingMaterial instanceof THREE.MeshStandardMaterial || workingMaterial instanceof THREE.MeshPhysicalMaterial,
              colorPropertyExists: 'color' in workingMaterial,
              colorIsThreeColor: 'color' in workingMaterial && (workingMaterial as any).color instanceof THREE.Color,
              possibleCauses: [
                !validation.isValid ? 'Material validation failed' : null,
                !classification.isSkinMaterial ? 'Material not classified as skin' : null,
                !(workingMaterial instanceof THREE.MeshStandardMaterial || workingMaterial instanceof THREE.MeshPhysicalMaterial) ? 'Incompatible material type' : null,
                !('color' in workingMaterial) ? 'Missing color property' : null,
                'color' in workingMaterial && !((workingMaterial as any).color instanceof THREE.Color) ? 'Invalid color object' : null
              ].filter(Boolean)
            },
            // ENHANCED: Material state at failure
            materialStateAtFailure: {
              hasColor: 'color' in workingMaterial,
              colorType: 'color' in workingMaterial ? typeof (workingMaterial as any).color : 'undefined',
              colorConstructor: 'color' in workingMaterial && (workingName as any).color ? 
                (workingMaterial as any).color.constructor.name : 'undefined',
              materialReadOnly: Object.isFrozen(workingMaterial),
              materialSealed: Object.isSealed(workingMaterial)
            },
            philosophy: 'skin_material_failure'
          });
        }

      } catch (materialError) {
        errorCount++;
        lastError = materialError instanceof Error ? materialError.message : 'Unknown material error';
        
        // ENHANCED: Exception logging with stack trace and context
        logger.error('SKIN_TONE_APPLICATION_V2', 'EXCEPTION during material processing - Complete Error Context', {
          materialName: material.name || 'unnamed',
          objectName: obj.name || 'unnamed',
          materialType: material.type,
          materialConstructor: material.constructor.name,
          materialIndex: index,
          error: lastError,
          stack: materialError instanceof Error ? materialError.stack : undefined,
          // ENHANCED: Exception context
          exceptionContext: {
            materialWasValid: !!(material && material.type),
            skinToneWasValid: !!(tone && tone.rgb),
            sceneWasValid: !!(scene && scene.isScene),
            errorType: materialError instanceof Error ? materialError.name : typeof materialError,
            errorMessage: materialError instanceof Error ? materialError.message : String(materialError),
            materialProperties: material ? {
              name: material.name,
              type: material.type,
              uuid: material.uuid,
              hasColor: 'color' in material,
              constructor: material.constructor.name
            } : null
          },
          philosophy: 'material_processing_exception'
        });
      }
    });
  });

  // Update all materials to ensure changes are rendered
  updateAllMaterials(scene);

  const success = appliedCount > 0 && errorCount === 0;
  
  // Final comprehensive audit
  logger.info('SKIN_TONE_APPLICATION_V2', 'MODULARIZED APPLICATION COMPLETED', {
    inputSkinTone: { 
      rgb: tone.rgb, 
      hex: tone.hex,
      schema: tone.schema,
      source: tone.source,
      confidence: tone.confidence 
    },
    traversalResult: {
      totalObjects: traversalResult.totalObjects,
      objectsWithMaterials: traversalResult.objectsWithMaterials,
      totalMaterials: traversalResult.totalMaterials,
      materialsByType: traversalResult.materialsByType,
      objectNames: traversalResult.objectNames, // ADDED: Include objectNames
      materialNames: traversalResult.materialNames // ADDED: Include materialNames
    },
    skinMaterialAnalysis: {
      skinMaterialsFound,
      skinMaterialsModified: appliedCount,
      skinMaterialsSkipped: skippedCount,
      skinMaterialsErrored: errorCount,
      skinMaterialSuccessRate: skinMaterialsFound > 0 ? 
        ((appliedCount / skinMaterialsFound) * 100).toFixed(1) + '%' : '0%'
    },
    applicationResults: {
      materialsUpdated: appliedCount,
      materialsSkipped: skippedCount,
      materialsErrored: errorCount,
      totalProcessed: traversalResult.totalMaterials,
      success,
      lastError,
      successRate: traversalResult.totalMaterials > 0 ? 
        ((appliedCount / traversalResult.totalMaterials) * 100).toFixed(1) + '%' : '0%'
    },
    renderingEnhancements: {
      subsurfaceScatteringEnabled: true,
      adaptiveSkinProperties: true,
      materialCompilationForced: true,
      globalMaterialUpdateApplied: true
    },
    philosophy: 'modularized_photo_realistic_skin_rendering_complete'
  });

  // Critical failure analysis
  if (appliedCount === 0) {
    logger.error('SKIN_TONE_APPLICATION_V2', 'CRITICAL: No skin materials were updated', {
      totalMaterialsFound: traversalResult.totalMaterials,
      skinMaterialsFound,
      possibleCauses: [
        'No materials match skin inclusion criteria',
        'All skin materials excluded by exclusion list',
        'Materials missing color property',
        'Material types incompatible with PBR'
      ],
      debugRecommendations: [
        'Check object names in scene for skin materials',
        'Verify material names match inclusion criteria',
        'Ensure materials are MeshStandardMaterial or MeshPhysicalMaterial'
      ],
      sceneStructure: {
        uniqueObjectNames: [...new Set(traversalResult.objectNames)].slice(0, 10),
        uniqueMaterialNames: [...new Set(traversalResult.materialNames)].slice(0, 10),
        materialsByType: traversalResult.materialsByType
      },
      philosophy: 'critical_failure_comprehensive_analysis'
    });
  }
  
  return {
    appliedCount,
    skippedCount,
    errorCount,
    success,
    errorMessage: lastError,
    materialsProcessed: traversalResult.totalMaterials,
    traversalResult,
    skinMaterialsFound,
    skinMaterialsModified: appliedCount,
    materialsUpgraded,
    sssEnabled
  };
}

