import { useState, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { useSceneLifecycle } from './useSceneLifecycle';
import { useModelLifecycle } from './useModelLifecycle';
import { useMorphLifecycle } from './useMorphLifecycle';
import { useMaterialLifecycle } from './useMaterialLifecycle';
import { processViewerPayload, processSkinTone, determineFinalGender } from '../utils/payloadProcessor';
import { useMorphologyMapping } from '../../../../hooks/useMorphologyMapping';
import { useProgressStore } from '../../../../system/store/progressStore';
import type { Avatar3DViewerProps, ViewerState } from '../utils/viewerTypes';
import logger from '../../../../lib/utils/logger';
import * as THREE from 'three';

interface UseAvatarViewerOrchestratorProps extends Avatar3DViewerProps {
  container: HTMLDivElement | null;
}

interface AvatarViewerOrchestratorResult {
  // State
  viewerState: ViewerState;
  
  // Scene references
  scene: THREE.Scene | null;
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.PerspectiveCamera | null;
  controls: any;
  
  // Model references
  model: THREE.Group | null;
  mainMesh: THREE.SkinnedMesh | null;
  
  // Actions
  setCameraView: (view: 'front' | 'profile' | 'threequarter') => void;
  toggleAutoRotate: () => void;
  resetCamera: () => void;
  updateMorphData: (morphData: Record<string, number>) => void;
  retryInitialization: () => void;
  forceMorphsUpdate: (morphData: Record<string, number>) => void;
  
  // Status
  isReady: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Central orchestrator hook for Avatar 3D Viewer
 * Coordinates all lifecycle hooks and manages complete viewer state
 */
export function useAvatarViewerOrchestrator(
  props: UseAvatarViewerOrchestratorProps
): AvatarViewerOrchestratorResult {
  const {
    container,
    serverScanId,
    onViewerReady,
    onMorphDataChange,
    autoRotate = false,
    faceMorphData, // NOUVEAU: Récupérer faceMorphData
    faceSkinTone,  // NOUVEAU: Récupérer faceSkinTone
    faceOnly = false, // Nouveau: Récupérer faceOnly
    ...restProps
  } = props;

  // Central state management
  const [viewerState, setViewerState] = useState<ViewerState>({
    isLoading: true,
    error: null,
    isInitialized: false,
    isViewerReady: false,
    activeView: 'threequarter',
    isAutoRotating: autoRotate,
  });

  const onViewerReadyCalledRef = useRef(onViewerReady ? false : true); // Initialize to true if no callback
  const initGuardRef = useRef(false);

  // Get morphology mapping
  const { data: morphologyMapping } = useMorphologyMapping();

  // Process payload and determine final gender
  const finalGender = useMemo(() => determineFinalGender(props), [
    props.savedAvatarPayload?.resolved_gender,
    props.resolvedGender,
    props.userProfile?.sex
  ]);

  const processedSkinTone = useMemo(() => processSkinTone(props), [
    props.savedAvatarPayload?.skin_tone,
    props.skinTone,
    props.scanResult
  ]);

  // Initialize scene lifecycle
  const sceneLifecycle = useSceneLifecycle({
    container,
    finalGender,
    serverScanId,
    faceOnly, // ADDED
    onSceneReady: useCallback(() => {
      logger.info('ORCHESTRATOR', 'Scene ready, proceeding to model loading', {
        serverScanId,
        philosophy: 'scene_to_model_transition'
      });
      
    }, [serverScanId])
  });

  // Initialize model lifecycle
  const modelLifecycle = useModelLifecycle({
    finalGender,
    serverScanId,
    onModelLoaded: useCallback(async (model, mainMesh) => {
      logger.info('ORCHESTRATOR', 'Model loaded, applying morphs and materials', {
        modelName: model.name,
        mainMeshName: mainMesh.name,
        serverScanId,
        philosophy: 'model_to_morph_transition'
      });

      // Update viewer state
      setViewerState(prev => ({
        ...prev,
        isLoading: false,
        isInitialized: true,
      }));

      // Apply morphs and materials
      const payload = await processViewerPayload(props, morphologyMapping);
      if (payload.status === 'ready') {
        await morphLifecycle.applyMorphs(model, payload.shape_params, faceMorphData); // MODIFIED: Pass faceMorphData
        await morphLifecycle.applyLimbMasses(model, payload.limb_masses);
      } else {
        logger.warn('ORCHESTRATOR', 'Payload not ready for morph application, skipping', {
          payloadStatus: payload.status,
          payloadError: payload.error,
          serverScanId,
          philosophy: 'payload_not_ready_skip'
        });
      }

      await materialLifecycle.configureMaterials(faceSkinTone || processedSkinTone); // MODIFIED: Pass faceSkinTone

      // Adjust camera after morphs and materials are applied
      if (sceneLifecycle.controls) {
        if (faceOnly) {
          logger.info('ORCHESTRATOR', 'Adjusting camera for face scan focus', { serverScanId });
          sceneLifecycle.controls.setTarget(new THREE.Vector3(0, 1.5, 0)); // Target face center
          sceneLifecycle.controls.setCameraDistance(0.5); // Zoom in close
          sceneLifecycle.controls.snapTo('front'); // Front view
        } else {
          sceneLifecycle.controls.fitToObject(model, 0.02); // Fit to full body
        }
      }

      // Start render loop
      sceneLifecycle.startRenderLoop(viewerState.isAutoRotating, model);

      // Mark as ready
      setViewerState(prev => ({
        ...prev,
        isViewerReady: true,
      }));

      // Call onViewerReady only once
      if (!onViewerReadyCalledRef.current && onViewerReady) {
        onViewerReadyCalledRef.current = true;
        setTimeout(() => {
          onViewerReady();
        }, 0);
      }

      // Update progress
      const progressState = useProgressStore.getState();
      if (progressState.isActive && progressState.overallProgress < 100) {
        progressState.setOverallProgress(100, 'Avatar 3D Prêt', 'Votre reflet numérique est maintenant visible');
      }

    }, [props, morphologyMapping, onViewerReady, serverScanId, faceMorphData, faceSkinTone, processedSkinTone, faceOnly]) // NOUVEAU: Ajouter faceOnly aux dépendances
  });

  // Initialize morph lifecycle
  const morphLifecycle = useMorphLifecycle({
    finalGender,
    morphologyMapping,
    serverScanId
  });

  // Initialize material lifecycle
  const materialLifecycle = useMaterialLifecycle({
    scene: sceneLifecycle.scene,
    skinTone: processedSkinTone, // MODIFIED: Utiliser processedSkinTone par défaut
    finalGender,
    serverScanId
  });

  // Initialize scene when container is available
  useLayoutEffect(() => {
    if (!container || 
        sceneLifecycle.isInitialized || 
        sceneLifecycle.isInitializing ||
        initGuardRef.current) {
      return;
    }

    if (container.clientWidth === 0 || container.clientHeight === 0) {
      logger.warn('ORCHESTRATOR', 'Container has zero dimensions, deferring initialization', {
        containerSize: { width: container.clientWidth, height: container.clientHeight },
        serverScanId,
        philosophy: 'container_dimensions_invalid'
      });
      return;
    }

    initGuardRef.current = true;

    setViewerState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    sceneLifecycle.initializeScene().catch((error) => {
      logger.error('ORCHESTRATOR', 'Scene initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serverScanId,
        philosophy: 'scene_init_error'
      });
      
      setViewerState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Initialization failed',
        isLoading: false,
      }));
      
      initGuardRef.current = false;
    });

  }, [container, serverScanId]);

  // Separate effect to handle model loading when scene becomes available
  useLayoutEffect(() => {
    if (!sceneLifecycle.scene || !sceneLifecycle.isInitialized || modelLifecycle.isLoading) {
      logger.debug('ORCHESTRATOR', 'Model loading conditions not met', {
        hasScene: !!sceneLifecycle.scene,
        sceneInitialized: sceneLifecycle.isInitialized,
        modelIsLoading: modelLifecycle.isLoading,
        serverScanId,
        philosophy: 'model_loading_conditions_check'
      });
      return;
    }

    logger.info('ORCHESTRATOR', 'Scene verified available, triggering model loading with explicit scene reference', {
      hasScene: !!sceneLifecycle.scene,
      sceneInitialized: sceneLifecycle.isInitialized,
      sceneChildren: sceneLifecycle.scene.children.length,
      sceneUuid: sceneLifecycle.scene.uuid,
      serverScanId,
      philosophy: 'scene_verified_explicit_reference_model_loading'
    });

    // CRITICAL FIX: Pass scene explicitly to loadModel
    modelLifecycle.loadModel(sceneLifecycle.scene).catch((error) => {
      logger.error('ORCHESTRATOR', 'Model loading failed with explicit scene reference', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sceneWasValid: !!sceneLifecycle.scene,
        sceneUuid: sceneLifecycle.scene?.uuid,
        serverScanId,
        philosophy: 'model_loading_failure_explicit_scene_reference'
      });
      
      setViewerState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Model loading failed',
        isLoading: false,
      }));
    });
  }, [sceneLifecycle.scene, sceneLifecycle.isInitialized, modelLifecycle.isLoading, modelLifecycle.loadModel, serverScanId]);

  // Camera control functions
  const setCameraView = useCallback((view: 'front' | 'profile' | 'threequarter') => {
    if (!sceneLifecycle.controls) return;
    
    setViewerState(prev => ({ ...prev, activeView: view }));
    sceneLifecycle.controls.snapTo(view === 'threequarter' ? 'threequarter' : view);
  }, [sceneLifecycle.controls]);

  const toggleAutoRotate = useCallback(() => {
    const newAutoRotate = !viewerState.isAutoRotating;
    
    setViewerState(prev => ({ ...prev, isAutoRotating: newAutoRotate }));
    
    if (sceneLifecycle.controls) {
      sceneLifecycle.controls.setAutoRotate(newAutoRotate);
    }
  }, [viewerState.isAutoRotating, sceneLifecycle.controls]);

  const resetCamera = useCallback(() => {
    if (sceneLifecycle.controls) {
      sceneLifecycle.controls.reset();
      setViewerState(prev => ({ ...prev, activeView: 'threequarter' }));
    }
  }, [sceneLifecycle.controls]);

  const updateMorphData = useCallback((newMorphData: Record<string, number>) => {
    if (modelLifecycle.modelRef.current) {
      morphLifecycle.applyMorphs(modelLifecycle.modelRef.current, newMorphData, faceMorphData); // MODIFIED: Pass faceMorphData
      onMorphDataChange?.(newMorphData);
      
      logger.debug('ORCHESTRATOR', 'Direct morph update applied via ref', {
        morphDataKeys: Object.keys(newMorphData),
        serverScanId,
        philosophy: 'direct_ref_morph_update'
      });
    }
  }, [modelLifecycle.modelRef, morphLifecycle.applyMorphs, onMorphDataChange, serverScanId, faceMorphData]); // NOUVEAU: Ajouter faceMorphData aux dépendances

  const forceMorphsUpdate = useCallback((morphData: Record<string, number>) => {
    if (modelLifecycle.modelRef.current) {
      morphLifecycle.forceMorphsUpdate(modelLifecycle.modelRef.current, morphData, faceMorphData); // MODIFIED: Pass faceMorphData
      logger.debug('ORCHESTRATOR', 'Forced morph cache reset via orchestrator', {
        serverScanId,
        philosophy: 'orchestrator_force_morph_update'
      });
    }
  }, [modelLifecycle.modelRef, morphLifecycle.forceMorphsUpdate, serverScanId, faceMorphData]); // NOUVEAU: Ajouter faceMorphData aux dépendances

  const retryInitialization = useCallback(() => {
    logger.info('ORCHESTRATOR', 'Retrying initialization with complete cleanup', {
      serverScanId,
      philosophy: 'retry_with_cleanup'
    });

    // Complete cleanup
    sceneLifecycle.cleanup();
    modelLifecycle.cleanupModel();
    morphLifecycle.resetMorphs();

    // Reset state
    setViewerState({
      isLoading: true,
      error: null,
      isInitialized: false,
      isViewerReady: false,
      activeView: 'threequarter',
      isAutoRotating: autoRotate,
    });

    onViewerReadyCalledRef.current = false;
    initGuardRef.current = false;

    logger.info('ORCHESTRATOR', 'Retry initialization state reset completed', {
      serverScanId,
      philosophy: 'retry_state_reset_complete'
    });
  }, [sceneLifecycle.cleanup, modelLifecycle.cleanupModel, morphLifecycle.resetMorphs, autoRotate, serverScanId]);

  // Determine readiness and error state
  const isReady = viewerState.isViewerReady && !viewerState.isLoading && !viewerState.error;
  const hasError = !!viewerState.error;

  return {
    // State
    viewerState,
    
    // Scene references
    scene: sceneLifecycle.scene,
    renderer: sceneLifecycle.renderer,
    camera: sceneLifecycle.camera,
    controls: sceneLifecycle.controls,
    
    // Model references
    model: modelLifecycle.model,
    mainMesh: modelLifecycle.modelRef.current,
    
    // Actions
    setCameraView,
    toggleAutoRotate,
    resetCamera,
    updateMorphData,
    retryInitialization,
    forceMorphsUpdate,
    
    // Status
    isReady,
    hasError,
    errorMessage: viewerState.error,
  };
}

