/**
 * Model Lifecycle Hook
 * Manages the React state for 3D model loading and lifecycle
 */

import { useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { loadAndPrepareModel, removeModelFromScene, type LoadedModelResult } from '../core/modelLoader';
import logger from '../../../../lib/utils/logger';

interface UseModelLifecycleProps {
  finalGender: 'male' | 'female';
  serverScanId?: string;
  onModelLoaded?: (model: THREE.Group, mainMesh: THREE.SkinnedMesh) => void;
}

/**
 * Hook for managing 3D model lifecycle with React state
 */
export function useModelLifecycle({
  finalGender,
  serverScanId,
  onModelLoaded
}: UseModelLifecycleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const modelRef = useRef<THREE.Group | null>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const modelLoadedRef = useRef<boolean>(false);
  const loadInFlightRef = useRef<boolean>(false);
  const lastLoadedScanIdRef = useRef<string | null>(null);
  const lastLoadedGenderRef = useRef<'male' | 'female' | null>(null);

  // Load model using core function
  const loadModel = useCallback(async (scene: THREE.Scene) => {
    if (!scene || !scene.isScene) {
      logger.warn('MODEL_LIFECYCLE', 'Cannot load model - scene not available', {
        hasScene: !!scene,
        isScene: scene?.isScene,
        serverScanId,
        philosophy: 'scene_dependency_guard'
      });
      return;
    }

    // Single-flight guard
    if (loadInFlightRef.current || modelLoadedRef.current) {
      logger.debug('MODEL_LIFECYCLE', 'Model loading blocked by single-flight guard', {
        loadInFlight: loadInFlightRef.current,
        modelLoaded: modelLoadedRef.current,
        serverScanId,
        philosophy: 'single_flight_protection'
      });
      return;
    }

    loadInFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    // Create abort controller for this load operation
    abortControllerRef.current = new AbortController();

    try {
      logger.info('MODEL_LIFECYCLE', 'Starting model loading', {
        gender: finalGender,
        serverScanId,
        sceneChildren: scene.children.length,
        philosophy: 'model_loading_start'
      });

      const result: LoadedModelResult = await loadAndPrepareModel({
        scene,
        finalGender,
        serverScanId,
        abortSignal: abortControllerRef.current.signal
      });

      // Store references
      modelRef.current = result.modelInstance;
      skeletonHelperRef.current = result.skeletonHelper || null;
      lastLoadedScanIdRef.current = serverScanId || null;
      lastLoadedGenderRef.current = finalGender;

      modelLoadedRef.current = true;
      setIsLoading(false);

      // Call onModelLoaded callback
      if (onModelLoaded) {
        onModelLoaded(result.modelInstance, result.mainMesh);
      }

      logger.info('MODEL_LIFECYCLE', 'Model loading completed successfully', {
        modelName: result.modelInstance.name,
        mainMeshName: result.mainMesh.name,
        serverScanId,
        philosophy: 'model_loading_complete'
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('aborted')) {
        logger.debug('MODEL_LIFECYCLE', 'Model loading was aborted', {
          serverScanId,
          philosophy: 'model_loading_aborted'
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('MODEL_LIFECYCLE', 'Model loading failed', {
          error: errorMessage,
          serverScanId,
          philosophy: 'model_loading_failure'
        });
        setError(errorMessage);
      }
      setIsLoading(false);
    } finally {
      loadInFlightRef.current = false;
      abortControllerRef.current = null;
    }
  }, [finalGender, serverScanId, onModelLoaded]);

  // Cleanup model
  const cleanupModel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (modelRef.current) {
      // Find the scene from the model's parent hierarchy
      let currentParent = modelRef.current.parent;
      while (currentParent && !currentParent.isScene) {
        currentParent = currentParent.parent;
      }
      
      if (currentParent && currentParent.isScene) {
        removeModelFromScene(currentParent as THREE.Scene, serverScanId);
      }
    }

    modelRef.current = null;
    skeletonHelperRef.current = null;
    modelLoadedRef.current = false;
    loadInFlightRef.current = false;
    lastLoadedScanIdRef.current = null;
    lastLoadedGenderRef.current = null;
    setIsLoading(false);
    setError(null);

    logger.debug('MODEL_LIFECYCLE', 'Model cleanup completed', {
      serverScanId,
      philosophy: 'model_cleanup_complete'
    });
  }, [serverScanId]);

  return {
    isLoading,
    error,
    modelRef,
    skeletonHelperRef,
    modelLoadedRef,
    loadInFlightRef,
    lastLoadedScanIdRef,
    lastLoadedGenderRef,
    loadModel,
    cleanupModel
  };
}