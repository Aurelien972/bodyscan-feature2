import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { sanitizeAvatarScene } from '../../../../lib/3d/utils/meshSanitizer';
import { sanitizeSkeleton } from '../../../../lib/3d/utils/boneSanitizer';
import { getModelUrlForGender } from '../../../../system/data/repositories/assetsRepo';
import logger from '../../../../lib/utils/logger';

// Global GLTF cache to prevent re-loading models
const gltfCache = new Map<string, THREE.Group>();

interface ModelLoadOptions {
  scene: THREE.Scene;
  finalGender: 'male' | 'female';
  faceOnly?: boolean; // ADDED
  serverScanId?: string;
  abortSignal?: AbortSignal;
}

export interface LoadedModelResult {
  modelInstance: THREE.Group;
  mainMesh: THREE.SkinnedMesh;
  skeletonHelper?: THREE.SkeletonHelper;
}

/**
 * Load and prepare model for scene
 */
export async function loadAndPrepareModel(options: ModelLoadOptions): Promise<LoadedModelResult> {
  const { scene, finalGender, faceOnly, serverScanId, abortSignal } = options; // MODIFIED
  const loadStartTime = performance.now();

  logger.info('MODEL_LOADER', 'Starting model loading process', {
    gender: finalGender,
    faceOnly, // ADDED
    serverScanId,
    cacheSize: gltfCache.size,
    philosophy: 'core_model_loading'
  });

  // Check for abort before starting
  if (abortSignal?.aborted) {
    throw new Error('Model loading was aborted before starting');
  }

  const modelUrl = getModelUrlForGender(finalGender);
  logger.info('MODEL_LOADER', `Attempting to load model from URL: ${modelUrl}`, {
    gender: finalGender,
    serverScanId
  });

  let modelRoot = gltfCache.get(finalGender);
  
  if (!modelRoot) {
    logger.info('MODEL_LOADER', 'Fetching model from URL', { 
      gender: finalGender,
      modelUrl: modelUrl.substring(0, 50) + '...',
      serverScanId
    });
    
    // Setup loaders
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    // Load with AbortController support
    const gltf = await new Promise<any>((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Model loading was aborted'));
        return;
      }
      
      loader.load(
        modelUrl,
        (gltf) => {
          logger.info('MODEL_LOADER', 'Model downloaded successfully', {
            gender: finalGender,
            serverScanId,
            hasScene: !!gltf.scene,
            sceneChildren: gltf.scene.children.length,
            loadDuration: (performance.now() - loadStartTime).toFixed(2) + 'ms'
          });
          resolve(gltf);
        },
        (progress) => {
          logger.debug('MODEL_LOADER', 'Model loading progress', {
            loaded: progress.loaded,
            total: progress.total,
            percentage: progress.total > 0 ? ((progress.loaded / progress.total) * 100).toFixed(1) + '%' : 'unknown',
            serverScanId
          });
        },
        (error) => {
          logger.error('MODEL_LOADER', 'Model download failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            gender: finalGender,
            serverScanId
          });
          reject(error);
        }
      );
      
      // Handle abort signal
      abortSignal?.addEventListener('abort', () => {
        reject(new Error('Model loading was aborted'));
      });
    });
    
    modelRoot = gltf.scene;
    
    // Sanitize and get main mesh
    const mainMesh = sanitizeAvatarScene(modelRoot);
    if (!mainMesh) {
      throw new Error('No main mesh with morph targets found');
    }
    
    if (mainMesh.skeleton) {
      sanitizeSkeleton(mainMesh.skeleton);
    }
    
    // Cache the sanitized model
    gltfCache.set(finalGender, modelRoot);
    
    logger.info('MODEL_LOADER', 'Model processed and cached', {
      gender: finalGender,
      mainMeshName: mainMesh.name,
      morphTargetsCount: Object.keys(mainMesh.morphTargetDictionary || {}).length,
      serverScanId
    });
  } else {
    logger.info('MODEL_LOADER', 'Using cached model', { 
      gender: finalGender,
      serverScanId
    });
  }

  // Check for abort before proceeding
  if (abortSignal?.aborted) {
    throw new Error('Model loading was aborted before scene attachment');
  }

  // Create instance for this scene
  const modelInstance = modelRoot.clone(true);
  
  // Add to scene
  scene.add(modelInstance);

  // Find main mesh for camera fitting
  let selectedMainMesh: THREE.SkinnedMesh | null = null;
  
  modelInstance.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
      if (!selectedMainMesh || 
          Object.keys(child.morphTargetDictionary).length > Object.keys(selectedMainMesh.morphTargetDictionary || {}).length) {
        selectedMainMesh = child;
      }
    }
  });

  if (!selectedMainMesh) {
    throw new Error('No main mesh found for camera fitting');
  }

  // Position and scale model
  const box = new THREE.Box3().setFromObject(modelInstance);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Enhanced responsive positioning for better centering
  const targetHeight = 1.6; // Smaller for better full-body fit
  const scaleFactor = targetHeight / size.y;
  modelInstance.scale.setScalar(scaleFactor);
  
  // Better centering with responsive adjustments
  const scaledCenter = center.multiplyScalar(scaleFactor);
  modelInstance.position.set(0, -scaledCenter.y * 0.95, 0); // Center horizontally, minimal vertical adjustment
  
  // Ensure model is properly positioned for all screen sizes
  const boundingBox = new THREE.Box3().setFromObject(modelInstance);
  const modelSize = boundingBox.getSize(new THREE.Vector3());
  const modelCenter = boundingBox.getCenter(new THREE.Vector3());
  
  // Fine-tune vertical positioning for optimal viewing
  modelInstance.position.y = -modelCenter.y; // Perfect centering without adjustment

  // Add skeleton helper for debugging
  let skeletonHelper: THREE.SkeletonHelper | undefined;
  if (import.meta.env.DEV && selectedMainMesh.skeleton) {
    skeletonHelper = new THREE.SkeletonHelper(selectedMainMesh);
    skeletonHelper.visible = false;
    scene.add(skeletonHelper);
  }

  logger.info('MODEL_LOADER', 'Model loaded and positioned successfully', {
    modelName: modelInstance.name,
    mainMeshName: selectedMainMesh.name,
    morphTargetsCount: Object.keys(selectedMainMesh.morphTargetDictionary || {}).length,
    serverScanId
  });

  return {
    modelInstance,
    mainMesh: selectedMainMesh,
    skeletonHelper
  };
}

/**
 * Remove all models from scene
 */
export function removeModelFromScene(scene: THREE.Scene, serverScanId?: string): void {
  logger.info('MODEL_LOADER', 'Removing all models from scene', {
    serverScanId,
    philosophy: 'core_model_cleanup'
  });

  const modelsToRemove: THREE.Object3D[] = [];
  scene.traverse((child) => {
    if (child.name && (child.name.includes('character') || child.name.includes('basemesh'))) {
      modelsToRemove.push(child);
    }
  });
  
  logger.info('MODEL_LOADER', 'Found models to remove', {
    modelsToRemoveCount: modelsToRemove.length,
    modelNames: modelsToRemove.map(m => m.name),
    serverScanId
  });
  
  modelsToRemove.forEach(model => {
    scene.remove(model);
    
    // Dispose model resources
    model.traverse((obj: THREE.Object3D) => {
      const geometry = (obj as any).geometry;
      const material = (obj as any).material;
      
      if (geometry) {
        geometry.dispose();
      }
      
      if (material) {
        const materials = Array.isArray(material) ? material : [material];
        materials.forEach((mat: THREE.Material) => {
          Object.values(mat).forEach((value: any) => {
            if (value && typeof value.dispose === 'function') {
              value.dispose();
            }
          });
          mat.dispose();
        });
      }
    });
  });

  logger.info('MODEL_LOADER', 'Model cleanup completed', {
    removedCount: modelsToRemove.length,
    serverScanId
  });
}

/**
 * Position model in scene
 */
function positionModel(model: THREE.Group): void {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const targetHeight = 2.0;
  const scaleFactor = targetHeight / size.y;
  model.scale.setScalar(scaleFactor);
  model.position.sub(center.multiplyScalar(scaleFactor));
}

/**
 * Create skeleton helper for debugging
 */
function createSkeletonHelper(
  scene: THREE.Scene,
  mainMesh: THREE.SkinnedMesh
): THREE.SkeletonHelper | null {
  if (!import.meta.env.DEV || !mainMesh.skeleton) {
    return null;
  }

  const helper = new THREE.SkeletonHelper(mainMesh);
  helper.visible = false;
  scene.add(helper);
  
  // Toggle with 'B' key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'b') {
      helper.visible = !helper.visible;
      logger.debug('MODEL_LOADER', 'Skeleton visibility toggled', { 
        visible: helper.visible 
      });
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  (helper as any)._cleanup = () => {
    window.removeEventListener('keydown', handleKeyDown);
    scene.remove(helper);
  };

  return helper;
}

