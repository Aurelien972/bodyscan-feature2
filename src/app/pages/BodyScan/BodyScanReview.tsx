/**
 * Body Scan Review - Modularized Implementation
 * Uses specialized hooks and components for clean separation of concerns
 */

import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar3DViewer from '../../../components/3d/Avatar3DViewer';
import GlassCard from '../../../ui/cards/GlassCard';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useUserStore } from '../../../system/store/userStore';
import { useFeedback } from '../../../hooks/useFeedback';
import { useReviewState } from './BodyScanReview/hooks/useReviewState';
import DynamicProgressHeader from '../../shell/Header/DynamicProgressHeader';
import MeasurementsCard from './BodyScanReview/components/MeasurementsCard';
import MorphAdjustmentControls from './BodyScanReview/components/MorphAdjustmentControls';
import ActionButtons from './BodyScanReview/components/ActionButtons';
import { saveCurrentAvatar } from './BodyScanReview/utils/avatarActions';
import logger from '../../../lib/utils/logger';

/**
 * Body Scan Review Page - Modularized Implementation
 */
const BodyScanReview: React.FC = () => {
  const navigate = useNavigate();
  const { updateProfile } = useUserStore();
  const { success } = useFeedback();
  
  // Use modularized review state hook
  const {
    scanResults,
    currentMorphData,
    completeMorphData,
    morphCounters,
    setCurrentMorphData,
    activeView,
    setActiveView,
    autoRotate,
    setAutoRotate,
    avatar3DRef,
    resetMorphsToInitial,
    stableUserProfile,
    stableMorphBounds,
    stableSelectedArchetypes,
    stableLimbMasses,
    stableSkinTone,
    profile,
    isViewerReady,
    handleViewerReady,
    morphologyMapping,
    morphPolicy,
    showToast,
    resolvedGender,
    criticalError,
    setCriticalError
  } = useReviewState();
  
  // Build final shape params with limb_masses integration
  const finalShapeParams = useMemo(() => {
    const rawMorphData = completeMorphData || {};
    
    logger.debug('BODY_SCAN_REVIEW', 'Using AI-refined morphs directly (no filtering)', {
      originalKeys: Object.keys(rawMorphData).length,
      finalKeys: Object.keys(rawMorphData).length,
      gender: resolvedGender,
      philosophy: 'ai_driven_no_filtering'
    });
    
    return rawMorphData;
  }, [completeMorphData, resolvedGender]);

  // Ready for viewer check
  const readyForViewer = useMemo(() => {
    const ready = !!(
      scanResults && 
      stableUserProfile && 
      morphologyMapping && 
      finalShapeParams && 
      Object.keys(finalShapeParams).length > 0 &&
      resolvedGender
    );
    
    if (ready && !isViewerReady) {
      queueMicrotask(() => {
        logger.info('Gate resolved - viewer ready for initialization', {
          hasScanResults: !!scanResults,
          hasUserProfile: !!stableUserProfile,
          hasMorphologyMapping: !!morphologyMapping,
          finalShapeParamsCount: Object.keys(finalShapeParams).length,
          resolvedGender,
          readyForViewer: ready
        });
      });
    }
    
    return ready;
  }, [scanResults, stableUserProfile, morphologyMapping, finalShapeParams, resolvedGender, isViewerReady]);

  // PHASE 1: Display critical error state
  if (criticalError) {
    return (
      <div className="space-y-8">
        <GlassCard className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <SpatialIcon Icon={ICONS.AlertCircle} size={32} className="text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Erreur de données critiques</h3>
          <p className="text-red-300 text-sm mb-6 leading-relaxed max-w-md mx-auto">
            {criticalError}
          </p>
          <div className="space-y-4">
            <button
              onClick={() => navigate('/body-scan')}
              className="btn-glass--primary px-6 py-3"
            >
              <div className="flex items-center justify-center gap-2">
                <SpatialIcon Icon={ICONS.Scan} size={16} />
                <span>Nouveau scan</span>
              </div>
            </button>
            <button
              onClick={() => {
                setCriticalError(null);
                window.location.reload();
              }}
              className="btn-glass px-6 py-3"
            >
              <div className="flex items-center justify-center gap-2">
                <SpatialIcon Icon={ICONS.RotateCcw} size={16} />
                <span>Recharger</span>
              </div>
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Callback handlers
  const handleMorphDataChange = useCallback((morphData: Record<string, number>) => {
    setCurrentMorphData(morphData);
  }, [setCurrentMorphData]);

  const handleCameraViewChange = useCallback((view: 'front' | 'profile' | 'threequarter') => {
    setActiveView(view);
    const controls = avatar3DRef.current?.getCameraControls?.();
    if (controls?.setCameraView) {
      controls.setCameraView(view);
    }
  }, [setActiveView, avatar3DRef]);

  const handleAutoRotateToggle = useCallback(() => {
    const newAutoRotate = !autoRotate;
    setAutoRotate(newAutoRotate);
    const controls = avatar3DRef.current?.getCameraControls?.();
    if (controls?.toggleAutoRotate) {
      controls.toggleAutoRotate();
    }
  }, [autoRotate, setAutoRotate, avatar3DRef]);

  const handleSaveAvatar = useCallback(async () => {
    await saveCurrentAvatar(
      profile,
      updateProfile,
      completeMorphData,
      scanResults,
      stableMorphBounds,
      stableSelectedArchetypes,
      stableLimbMasses,
      stableSkinTone,
      resolvedGender,
      showToast,
      success,
      navigate
    );
  }, [profile, updateProfile, completeMorphData, scanResults, stableMorphBounds, stableSelectedArchetypes, stableLimbMasses, stableSkinTone, resolvedGender, showToast, success, navigate]);

  const handleNewScan = useCallback(() => {
    navigate('/body-scan');
  }, [navigate]);

  // Extract key metrics for display
  const baseConfidence = scanResults?.estimate?.extracted_data?.processing_confidence || 
                    scanResults?.match?.semantic_coherence_score || 
                    scanResults?.insights?.confidence || 
                    null;
  
  // Adjust confidence based on morph generation fallback
  const confidence = useMemo(() => {
    if (!baseConfidence) return null;
    
    // Check if morph generation used fallback
    const morphGenerationFallback = scanResults?.metadata?.morph_generation_fallback || 
                                   scanResults?.match?.metadata?.morph_generation_fallback ||
                                   false;
    
    // Reduce confidence if fallback was used
    const adjustedConfidence = morphGenerationFallback ? baseConfidence * 0.7 : baseConfidence;
    
    logger.debug('CONFIDENCE_CALCULATION', 'Adjusted confidence based on morph generation fallback', {
      baseConfidence: baseConfidence.toFixed(3),
      morphGenerationFallback,
      adjustedConfidence: adjustedConfidence.toFixed(3),
      philosophy: 'telemetry_coherent_confidence_calculation'
    });
    
    return adjustedConfidence;
  }, [baseConfidence, scanResults?.metadata?.morph_generation_fallback, scanResults?.match?.metadata?.morph_generation_fallback]);

  // Early return if no scan results - after all hooks are called
  if (!scanResults) {
    return (
      <GlassCard className="text-center p-8">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
          <SpatialIcon Icon={ICONS.Loader2} size={24} className="text-purple-400 animate-spin" />
        </div>
        <h3 className="text-white font-semibold mb-2">Chargement de votre avatar</h3>
        <p className="text-white/60 text-sm">Préparation de l'expérience 3D...</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-8 visionos-grid">
      {/* Dynamic Progress Header - Premier composant de la review */}
      <DynamicProgressHeader />
      
      {/* 3D Avatar Viewer */}
      <GlassCard className="p-8 -mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <SpatialIcon Icon={ICONS.Eye} size={16} className="text-purple-400" />
            Votre Avatar 3D
          </h3>
          
          {!isViewerReady && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 text-xs font-medium">Préparation...</span>
            </div>
          )}
          
          {isViewerReady && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30">
              <SpatialIcon Icon={ICONS.Check} size={12} className="text-green-400" />
              <span className="text-green-300 text-xs font-medium">Prêt</span>
            </div>
          )}
        </div>
        
        <div className="h-[400px] sm:h-[500px] md:h-[550px] lg:h-[600px] xl:h-[650px] rounded-2xl bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-400/20 relative overflow-hidden">
          <Avatar3DViewer
            ref={avatar3DRef}
            scanResult={scanResults}
            userProfile={stableUserProfile || { sex: resolvedGender, height_cm: 175, weight_kg: 70 }}
            morphData={finalShapeParams}
            limbMasses={stableLimbMasses}
            skinTone={stableSkinTone}
            minMaxBounds={stableMorphBounds}
            selectedArchetypes={stableSelectedArchetypes}
            serverScanId={scanResults?.serverScanId || scanResults?.commit?.scan_id}
            resolvedGender={resolvedGender}
            className="w-full h-full"
            autoRotate={autoRotate}
            onMorphDataChange={handleMorphDataChange}
            onViewerReady={handleViewerReady}
            showControls={true}
          />
        </div>
      </GlassCard>

      {/* Morph Adjustment Controls */}
      {morphologyMapping && morphPolicy && (
        <div className="mt-8">
        <MorphAdjustmentControls
          currentMorphData={currentMorphData}
          setCurrentMorphData={setCurrentMorphData}
          resetMorphsToInitial={resetMorphsToInitial}
          morphPolicy={morphPolicy}
          morphologyMapping={morphologyMapping}
          resolvedGender={resolvedGender}
          isViewerReady={isViewerReady}
          avatar3DRef={avatar3DRef}
        />
        </div>
      )}
      
      {/* Measurements Section */}
      <div className="mt-8">
      <MeasurementsCard
        extractedData={scanResults?.estimate?.extracted_data}
        userProfile={stableUserProfile}
      />
      </div>

      {/* Action Buttons */}
      <div className="mt-12">
      <ActionButtons
        isViewerReady={isViewerReady}
        onSaveAvatar={handleSaveAvatar}
        onNewScan={handleNewScan}
      />
      </div>
    </div>
  );
};

export default BodyScanReview;