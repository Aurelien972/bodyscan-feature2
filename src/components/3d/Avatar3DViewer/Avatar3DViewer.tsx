// src/components/3d/Avatar3DViewer/Avatar3DViewer.tsx
import React, { forwardRef, useImperativeHandle, useCallback } from 'react';
import { OrbitTouchControls } from '../../../lib/3d/camera/OrbitTouchControls';
import { useAvatarViewerOrchestrator } from './hooks/useAvatarViewerOrchestrator';
import ViewerControls from './components/ViewerControls';
import LoadingOverlay from './components/LoadingOverlay';
import ErrorOverlay from './components/ErrorOverlay';
import DebugInfo from './components/DebugInfo';
import type { Avatar3DViewerProps, Avatar3DViewerRef } from './utils/viewerTypes';
import logger from '../../../lib/utils/logger';

/**
 * Avatar 3D Viewer - Simplified with Central Orchestrator
 * Now uses the central orchestrator to coordinate all lifecycle hooks
 */
const Avatar3DViewer = forwardRef<Avatar3DViewerRef, Avatar3DViewerProps>((props, ref) => {
  const {
    serverScanId,
    className = '',
    showControls = true,
    faceMorphData, // Nouveau: Prop pour les morphs faciaux
    faceSkinTone,  // Nouveau: Prop pour le skin tone facial
    faceOnly = false, // Nouveau: Prop pour indiquer un viewer facial
    ...restProps
  } = props;

  // Container state
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);

  // Container ref callback
  const containerRef: ContainerRefCallback = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  // Use central orchestrator
  const orchestrator = useAvatarViewerOrchestrator({
    container,
    serverScanId,
    faceMorphData, // Nouveau: Passer les morphs faciaux à l'orchestrateur
    faceSkinTone,  // Nouveau: Passer le skin tone facial à l'orchestrateur
    faceOnly, // Nouveau: Passer faceOnly à l'orchestrateur
    ...restProps
  });

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCameraControls: () => orchestrator.controls,
    updateMorphData: orchestrator.updateMorphData,
    resetCamera: orchestrator.resetCamera,
    setCameraView: orchestrator.setCameraView,
    toggleAutoRotate: orchestrator.toggleAutoRotate,
    forceMorphsUpdate: orchestrator.forceMorphsUpdate,
  }), [orchestrator]);

  // Log simplified component render
  logger.debug('AVATAR_3D_VIEWER', 'Simplified component render with orchestrator', {
    isReady: orchestrator.isReady,
    hasError: orchestrator.hasError,
    isLoading: orchestrator.viewerState.isLoading,
    serverScanId,
    faceOnly, // Nouveau: Log faceOnly
    philosophy: 'orchestrated_component_render'
  });

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={containerRef}
        className="w-full h-full min-h-[300px] sm:min-h-[400px] rounded-xl bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-400/20 relative overflow-hidden"
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'relative'
        }}
      />
      
      <LoadingOverlay isLoading={orchestrator.viewerState.isLoading} />
      
      <ErrorOverlay 
        error={orchestrator.hasError ? orchestrator.errorMessage : null} 
        onRetry={orchestrator.retryInitialization} 
      />
      
      <ViewerControls
        activeView={orchestrator.viewerState.activeView}
        isAutoRotating={orchestrator.viewerState.isAutoRotating}
        onCameraViewChange={orchestrator.setCameraView}
        onAutoRotateToggle={orchestrator.toggleAutoRotate}
        onCameraReset={orchestrator.resetCamera}
        showControls={showControls && !orchestrator.viewerState.isLoading && !orchestrator.hasError}
      />

    </div>
  );
});

Avatar3DViewer.displayName = 'Avatar3DViewer';

export default Avatar3DViewer;

