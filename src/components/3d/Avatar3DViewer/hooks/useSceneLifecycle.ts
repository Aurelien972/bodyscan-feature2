import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitTouchControls } from '../../../../lib/3d/camera/OrbitTouchControls';
import { createScene, startAnimationLoop, disposeSceneResources, createResizeHandler, type SceneInstance } from '../core/sceneManager';
import logger from '../../../../lib/utils/logger';

interface UseSceneLifecycleProps {
  container: HTMLDivElement | null;
  finalGender: 'male' | 'female';
  faceOnly?: boolean; // ADDED
  serverScanId?: string;
  onSceneReady?: () => void;
}

/**
 * Hook for managing 3D scene lifecycle with React state
 */
export function useSceneLifecycle({
  container,
  finalGender,
  faceOnly, // ADDED
  serverScanId,
  onSceneReady
}: UseSceneLifecycleProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sceneInstanceRef = useRef<SceneInstance | null>(null);
  const animationCleanupRef = useRef<(() => void) | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  // Initialize scene
  const initializeScene = useCallback(async () => {
    if (!container || isInitialized || isInitializing || sceneInstanceRef.current) {
      logger.debug('SCENE_LIFECYCLE', 'Scene initialization blocked', {
        hasContainer: !!container,
        isInitialized,
        isInitializing,
        hasSceneInstance: !!sceneInstanceRef.current,
        serverScanId,
        philosophy: 'initialization_guard'
      });
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      logger.info('SCENE_LIFECYCLE', 'Starting scene initialization', {
        finalGender,
        faceOnly, // ADDED
        serverScanId,
        containerSize: { width: container.clientWidth, height: container.clientHeight },
        philosophy: 'scene_lifecycle_init'
      });

      const sceneInstance = createScene({
        container,
        finalGender,
        faceOnly, // ADDED
        serverScanId
      });

      sceneInstanceRef.current = sceneInstance;

      // Setup resize handler
      const resizeHandler = createResizeHandler(container, sceneInstance.camera, sceneInstance.renderer);
      window.addEventListener('resize', resizeHandler);
      resizeCleanupRef.current = () => window.removeEventListener('resize', resizeHandler);

      setIsInitialized(true);
      setIsInitializing(false);

      // Call onSceneReady callback
      onSceneReady?.();

      logger.info('SCENE_LIFECYCLE', 'Scene initialization completed', {
        containerId: sceneInstance.containerId,
        serverScanId,
        philosophy: 'scene_lifecycle_ready'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      setIsInitializing(false);
      
      logger.error('SCENE_LIFECYCLE', 'Scene initialization failed', {
        error: errorMessage,
        serverScanId,
        philosophy: 'scene_lifecycle_error'
      });
    }
  }, [container, finalGender, faceOnly, serverScanId, isInitialized, isInitializing, onSceneReady]); // MODIFIED

  // Start render loop
  const startRenderLoop = useCallback((autoRotate: boolean = false, model?: THREE.Group) => {
    if (!sceneInstanceRef.current) {
      logger.warn('SCENE_LIFECYCLE', 'Cannot start render loop - no scene instance');
      return;
    }

    const cleanup = startAnimationLoop(sceneInstanceRef.current, autoRotate, () => {
      logger.debug('SCENE_LIFECYCLE', 'First frame rendered', { serverScanId });
    });

    animationCleanupRef.current = cleanup;

    logger.info('SCENE_LIFECYCLE', 'Render loop started', {
      autoRotate,
      serverScanId,
      philosophy: 'render_loop_active'
    });
  }, [serverScanId]);

  // Cleanup scene
  const cleanup = useCallback(() => {
    logger.info('SCENE_LIFECYCLE', 'Starting scene cleanup', {
      hasSceneInstance: !!sceneInstanceRef.current,
      serverScanId,
      philosophy: 'scene_lifecycle_cleanup'
    });

    // Stop animation loop
    if (animationCleanupRef.current) {
      animationCleanupRef.current();
      animationCleanupRef.current = null;
    }

    // Remove resize listener
    if (resizeCleanupRef.current) {
      resizeCleanupRef.current();
      resizeCleanupRef.current = null;
    }

    // Dispose scene resources
    if (sceneInstanceRef.current) {
      disposeSceneResources(sceneInstanceRef.current);
      sceneInstanceRef.current = null;
    }

    // Reset state
    setIsInitialized(false);
    setIsInitializing(false);
    setError(null);

    logger.info('SCENE_LIFECYCLE', 'Scene cleanup completed', {
      serverScanId,
      philosophy: 'scene_lifecycle_cleaned'
    });
  }, [serverScanId]);

  return {
    // State
    isInitialized,
    isInitializing,
    error,
    
    // Scene references
    scene: sceneInstanceRef.current?.scene || null,
    renderer: sceneInstanceRef.current?.renderer || null,
    camera: sceneInstanceRef.current?.camera || null,
    controls: sceneInstanceRef.current?.controls || null,
    
    // Actions
    initializeScene,
    startRenderLoop,
    cleanup
  };
}
