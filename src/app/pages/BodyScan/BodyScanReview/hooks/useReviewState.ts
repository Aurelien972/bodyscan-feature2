/**
 * Review State Hook
 * Manages all state for the BodyScanReview component
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../../../../../system/store/userStore';
import { useFeedback } from '../../../../../hooks/useFeedback';
import { useMorphologyMapping } from '../../../../../hooks/useMorphologyMapping';
import { useToast } from '../../../../../ui/components/ToastProvider';
import { useProgressStore } from '../../../../../system/store/progressStore';
import { prepareMorphologicalPayload } from '../../../../../lib/morph/preparePayload';
import { buildMorphPolicy } from '../../../../../lib/morph/constraints';
import { normalizeLimbMasses } from '../../../../../lib/scan/normalizeLimbMasses';
import { resolveSkinTone } from '../../../../../lib/scan/normalizeSkinTone';
import logger, { logOnce } from '../../../../../lib/utils/logger';

/**
 * Custom hook for review state management
 */
export function useReviewState() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { avatarReveal } = useFeedback();
  const { data: morphologyMapping } = useMorphologyMapping();
  const { showToast } = useToast();
  
  // ALL STATE HOOKS DECLARED FIRST
  const [scanResults, setScanResults] = useState<any>(location.state?.scanResults || null);
  const [currentMorphData, setCurrentMorphData] = useState<Record<string, number>>({});
  const [activeView, setActiveView] = useState<'front' | 'profile' | 'threequarter'>('front');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showMorphControls, setShowMorphControls] = useState(false);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  
  // Store initial morph data for reset functionality
  const initialMorphDataRef = useRef<Record<string, number> | null>(null);
  
  // ALL REF HOOKS DECLARED SECOND
  const hasInitialized = useRef(false);
  const hasLoggedNavigation = useRef(false);
  const avatar3DRef = useRef<any>(null);
  const stableFallbackRef = useRef<Record<string, number> | null>(null);
  const stableMorphDataRef = useRef<Record<string, number>>({});
  
  // ALL MEMO HOOKS DECLARED THIRD
  const stableUserProfile = useMemo(() => {
    if (!scanResults?.userProfile) return { sex: 'male', height_cm: 175, weight_kg: 70 };
    return {
      sex: scanResults.userProfile.sex,
      height_cm: scanResults.userProfile.height_cm,
      weight_kg: scanResults.userProfile.weight_kg,
    };
  }, [scanResults?.userProfile?.sex, scanResults?.userProfile?.height_cm, scanResults?.userProfile?.weight_kg]);
  
  const stableMorphBounds = useMemo(() => {
    return scanResults?.match?.morph_bounds || scanResults?.morph_bounds || {};
  }, [scanResults?.match?.morph_bounds, scanResults?.morph_bounds]);
  
  const stableSelectedArchetypes = useMemo(() => {
    return scanResults?.match?.selected_archetypes || [];
  }, [scanResults?.match?.selected_archetypes]);

  // Determine resolved gender for model loading
  const resolvedGender = useMemo(() => {
    if (!scanResults) return 'male';
    
    if (!scanResults.userProfile && !scanResults.match?.selected_archetypes?.length) {
      return 'male';
    }
    
    // Priority 1: Explicit resolved gender from scan results
    if (scanResults?.resolvedGender) {
      logger.info('RESOLVED_GENDER_REVIEW', 'Using explicit resolved gender from scan results', {
        resolvedGender: scanResults.resolvedGender,
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId
      });
      return scanResults.resolvedGender;
    }
    
    // Priority 2: User profile sex
    if (stableUserProfile?.sex) {
      logger.info('RESOLVED_GENDER_REVIEW', 'Using user profile gender', {
        profileGender: stableUserProfile.sex,
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId
      });
      return stableUserProfile.sex;
    }
    
    // Priority 3: Primary archetype gender (fallback)
    if (stableSelectedArchetypes?.length > 0) {
      const primaryArchetype = stableSelectedArchetypes[0];
      const archetypeGender = primaryArchetype.gender === 'feminine' ? 'female' : 'male';
      logger.warn('RESOLVED_GENDER_REVIEW', 'Using archetype gender as fallback', {
        archetypeGender,
        archetypeId: primaryArchetype.id,
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId,
        reason: 'no_explicit_gender_in_scan_results_or_profile'
      });
      return archetypeGender;
    }
    
    // Priority 4: Ultimate fallback
    const fallbackGender = 'male';
    logger.warn('RESOLVED_GENDER_REVIEW', 'Using ultimate fallback gender', {
      fallbackGender,
      clientScanId: scanResults?.clientScanId,
      serverScanId: scanResults?.serverScanId,
      reason: 'no_gender_information_available_anywhere'
    });
    return fallbackGender;
  }, [scanResults, stableUserProfile?.sex, stableSelectedArchetypes]);

  // Extract limb masses from scan results
  const stableLimbMasses = useMemo(() => {
    if (!scanResults) return {};
    
    logger.info('LIMB_MASSES_EXTRACTION_REVIEW', 'Starting limb masses extraction from scan results', {
      clientScanId: scanResults?.clientScanId,
      serverScanId: scanResults?.serverScanId,
      scanResultsKeys: scanResults ? Object.keys(scanResults) : []
    });
    
    try {
      const { masses, count, missing } = normalizeLimbMasses(scanResults);
      
      logger.info('LIMB_MASSES_NORMALIZED', {
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId,
        count, 
        missing,
        masses: Object.entries(masses).map(([k, v]) => ({ key: k, value: v }))
      });
      
      if (count === 0) {
        logger.warn('LIMB_MASSES_EXTRACTION_REVIEW', 'No limb masses available, using empty object', {
          clientScanId: scanResults?.clientScanId,
          serverScanId: scanResults?.serverScanId
        });
        return {};
      }
      
      return masses;
    } catch (error) {
      logger.error('LIMB_MASSES_EXTRACTION_REVIEW', 'Failed to normalize limb masses', {
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {};
    }
  }, [scanResults]);

  // Extract skin tone from scan results
  const stableSkinTone = useMemo(() => {
    if (!scanResults) return null;
    
    const resolvedSkinTone = resolveSkinTone(scanResults);
    
    if (resolvedSkinTone) {
      logger.info('SKIN_TONE_EXTRACTION_REVIEW', 'Skin tone resolved successfully', {
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId,
        skinTone: `rgb(${resolvedSkinTone.r}, ${resolvedSkinTone.g}, ${resolvedSkinTone.b})`,
        source: resolvedSkinTone.source,
        confidence: resolvedSkinTone.confidence ? resolvedSkinTone.confidence.toFixed(3) : 'N/A'
      });
    } else {
      logger.debug('SKIN_TONE_EXTRACTION_REVIEW', 'Skin tone not yet available - pending state', {
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId,
        reason: 'skin_tone_pending_not_error'
      });
    }
    
    return resolvedSkinTone;
  }, [scanResults]);

  // Memoized morph policy
  const morphPolicy = useMemo(() => {
    if (!morphologyMapping || !stableUserProfile || !resolvedGender) return null;
    
    try {
      const policy = buildMorphPolicy(morphologyMapping, resolvedGender);
      logger.info('MORPH_CONSTRAINTS Policy built from DB', {
        gender: resolvedGender,
        requiredKeys: policy.requiredKeys.length,
        optionalKeys: policy.optionalKeys.length,
        totalRanges: Object.keys(policy.ranges).length,
      });
      return policy;
    } catch (error) {
      logger.error('Failed to build morph policy', {
        error: error instanceof Error ? error.message : 'Unknown error',
        gender: resolvedGender,
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId
      });
      return null;
    }
  }, [morphologyMapping, stableUserProfile, resolvedGender, scanResults?.clientScanId, scanResults?.serverScanId]);

  // Stable fallback morph data generator
  const stableFallbackMorphData = useMemo(() => {
    const sex = stableUserProfile?.sex || 'male';
    
    // Only regenerate if sex changes
    if (!stableFallbackRef.current || 
        (stableFallbackRef.current as any)._generatedForSex !== sex) {
      
      const fallbackData = generateCompleteMorphFallback(sex);
      (fallbackData as any)._generatedForSex = sex; // Mark with generation context
      stableFallbackRef.current = fallbackData;
      
      logger.debug('MORPH_FALLBACK', 'Generated new stable fallback morph data', {
        sex,
        morphCount: Object.keys(fallbackData).length
      });
    }
    
    return stableFallbackRef.current;
  }, [stableUserProfile?.sex]);

  // Complete morph data with DB constraints
  const completeMorphData = useMemo(() => {
    // CRITICAL FIX: Use currentMorphData as primary source after initialization, but not during reset
    if (currentMorphData && Object.keys(currentMorphData).length > 0 && resetTrigger === 0) {
      logger.debug('BODY_SCAN_REVIEW', 'Using currentMorphData as primary source', {
        clientScanId: scanResults?.clientScanId,
        morphDataKeys: Object.keys(currentMorphData),
        resetTrigger,
        philosophy: 'current_morph_data_priority'
      });
      return currentMorphData;
    }
    
    let targetMorphData: Record<string, number> = {};
    let dataSource = 'unknown';
    
    // Priority 1: Use AI-refined results if available
    if (scanResults?.match?.ai_refinement?.ai_refine && scanResults.match.final_shape_params) {
      logger.aiRefinement('Using AI-refined morphological data', {
        scanId: scanResults?.serverScanId,
        resolvedGender,
        finalShapeParamsCount: Object.keys(scanResults.match.final_shape_params).length,
        aiConfidence: scanResults.match.ai_refinement.ai_confidence,
        philosophy: 'ai_refined_direct_use'
      });
      targetMorphData = scanResults.match.final_shape_params;
      dataSource = 'ai_refined';
    }
    
    // Priority 2: Use blended data from match result
    else if (scanResults?.match?.blended_shape_params && Object.keys(scanResults.match.blended_shape_params).length > 0) {
      logger.info('BODY_SCAN_REVIEW', 'Using blended shape params from match result', {
        clientScanId: scanResults?.clientScanId,
        morphDataKeys: Object.keys(scanResults.match.blended_shape_params),
        philosophy: 'blend_fallback'
      });
      targetMorphData = scanResults.match.blended_shape_params;
      dataSource = 'blended';
    }
    
    // Priority 3: Use stable fallback
    else {
      logger.info('BODY_SCAN_REVIEW', 'Using stable fallback morph data', {
        clientScanId: scanResults?.clientScanId,
        philosophy: 'stable_fallback'
      });
      targetMorphData = stableFallbackMorphData;
      dataSource = 'fallback';
    }
    
    // PHASE 2: Enhanced stable reference management with deep comparison
    const targetDataString = JSON.stringify(Object.keys(targetMorphData).sort().map(k => [k, targetMorphData[k]]));
    const currentDataString = JSON.stringify(Object.keys(stableMorphDataRef.current).sort().map(k => [k, stableMorphDataRef.current[k]]));
    
    if (targetDataString !== currentDataString) {
      stableMorphDataRef.current = targetMorphData;
      logger.debug('BODY_SCAN_REVIEW', 'Morph data content changed, updating stable reference', {
        clientScanId: scanResults?.clientScanId,
        dataSource,
        morphDataKeys: Object.keys(targetMorphData),
        reason: 'content_changed'
      });
    } else {
      logger.debug('BODY_SCAN_REVIEW', 'Morph data content unchanged, using stable reference', {
        clientScanId: scanResults?.clientScanId,
        dataSource,
        reason: 'content_identical'
      });
    }
    
    // Initialiser initialMorphDataRef.current si ce n'est pas déjà fait
    if (!initialMorphDataRef.current || Object.keys(initialMorphDataRef.current).length === 0) {
      initialMorphDataRef.current = JSON.parse(JSON.stringify(stableMorphDataRef.current));
      logger.info('REVIEW_STATE', 'Initial morph data stored for reset functionality', {
        morphKeysCount: Object.keys(initialMorphDataRef.current).length,
        philosophy: 'initial_morph_data_storage_from_completeMorphData'
      });
    }
    
    return stableMorphDataRef.current;
  }, [
    currentMorphData,
    resetTrigger, // Include reset trigger to force recalculation
    scanResults,
    morphologyMapping,
    stableUserProfile,
    resolvedGender,
    stableFallbackMorphData,
    resolvedGender,
    scanResults?.clientScanId, // Include for logging context
    scanResults?.serverScanId  // Include for logging context
  ]);

  // Store initial morph data when completeMorphData is first available
  React.useEffect(() => {
    if (completeMorphData && Object.keys(completeMorphData).length > 0 && !initialMorphDataRef.current) {
      initialMorphDataRef.current = { ...completeMorphData };
      
      logger.debug('REVIEW_STATE', 'Initial morph data stored for reset functionality', {
        morphKeysCount: Object.keys(completeMorphData).length,
        sampleMorphs: Object.entries(completeMorphData).slice(0, 3).map(([k, v]) => ({ key: k, value: v.toFixed(3) })),
        philosophy: 'initial_morph_data_storage'
      });
    }
  }, [completeMorphData]);

  // Consistent counters for debugging and UI
  const morphCounters = useMemo(() => {
    const shapeParamCount = Object.keys(completeMorphData || {}).length;
    const limbMassCount = Object.keys(stableLimbMasses || {}).filter(k => 
      ['armMass', 'forearmMass', 'thighMass', 'calfMass', 'torsoMass', 'neckMass', 'hipMass'].includes(k)
    ).length;
    const totalMorphKeys = shapeParamCount + limbMassCount;
    
    return { shapeParamCount, limbMassCount, totalMorphKeys };
  }, [completeMorphData, stableLimbMasses]);
  
  // ALL CALLBACK HOOKS DECLARED FOURTH
  const handleViewerReady = useCallback(() => {
    if (!isViewerReady) {
      setIsViewerReady(true);
      
      const currentProgress = useProgressStore.getState().progress;
      if (currentProgress < 100) {
        useProgressStore.getState().setRenderReady();
      }
      
      logger.info('BODY_SCAN_REVIEW Avatar 3D viewer ready', {
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId,
        currentProgress
      });
    }
  }, [isViewerReady, scanResults?.clientScanId, scanResults?.serverScanId]);

  // Extract scan data from navigation state
  useEffect(() => {
    const initializeScanData = async () => {
    if (hasLoggedNavigation.current) return;
    
    const scanData = location.state?.scanResults;
    
    logger.logOnce('navigation-state-received', 'info', 'BODY_SCAN_REVIEW Navigation state received', {
      hasLocationState: !!location.state,
      hasScanData: !!scanData,
      scanDataKeys: scanData ? Object.keys(scanData) : [],
      clientScanId: scanData?.clientScanId,
      serverScanId: scanData?.serverScanId,
      timestamp: new Date().toISOString()
    });
    
    hasLoggedNavigation.current = true;
    
    if (!scanData) {
      logger.warn('BODY_SCAN_REVIEW No scan data available, redirecting to body-scan');
      navigate('/body-scan', { replace: true });
      return;
    }

    // CRITICAL FIX: Use deep comparison to prevent unnecessary re-renders
    const scanDataString = JSON.stringify(scanData);
    const currentScanResultsString = scanResults ? JSON.stringify(scanResults) : null;
    
    if (scanDataString !== currentScanResultsString) {
      setScanResults(scanData);
      
      logger.debug('BODY_SCAN_REVIEW', 'Scan results updated due to content change', {
        clientScanId: scanData.clientScanId,
        contentChanged: true,
        reason: 'deep_comparison_detected_change'
      });
    } else {
      logger.debug('BODY_SCAN_REVIEW', 'Scan results content unchanged, skipping update', {
        clientScanId: scanData.clientScanId,
        contentChanged: false,
        reason: 'deep_comparison_no_change'
      });
    }
    
    if (currentMorphData && Object.keys(currentMorphData).length > 0) {
      logger.debug('BODY_SCAN_REVIEW', 'Morph data already set, skipping re-extraction', {
        clientScanId: scanData.clientScanId,
        existingMorphDataKeys: Object.keys(currentMorphData)
      });
      return;
    }
    
    // Extract initial morph data
    let initialMorphData = {};
    let strategy = 'unknown';
    
    if (morphologyMapping && stableUserProfile) {
      try {
        // PHASE 1: Enhanced error handling for payload preparation
        const payload = await prepareMorphologicalPayload(scanData, morphologyMapping, stableUserProfile.sex, resolvedGender);
        initialMorphData = payload.shape_params;
        strategy = `prepared_payload_${payload.metadata.strategy}`;
        
        logger.info('BODY_SCAN_REVIEW Used prepared morphological payload', {
          clientScanId: scanData.clientScanId,
          morphDataKeys: Object.keys(initialMorphData),
          strategy: payload.metadata.strategy,
          confidence: payload.metadata.confidence.toFixed(3),
          qualityScore: payload.metadata.quality_score.toFixed(3),
          morphGenerationFallback: payload.metadata.morph_generation_fallback,
          validationPassed: true
        });
      } catch (error) {
        // PHASE 1: Enhanced error handling with user-friendly state management
        logger.error('BODY_SCAN_REVIEW', 'PHASE 1: Critical error during payload preparation', {
          clientScanId: scanData.clientScanId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          scanDataKeys: Object.keys(scanData),
          hasMorphologyMapping: !!morphologyMapping,
          hasStableUserProfile: !!stableUserProfile,
          philosophy: 'phase_1_critical_payload_preparation_error'
        });
        
        // PHASE 1: Check if this is a critical data validation error
        const isCriticalError = error instanceof Error && (
          error.message.includes('validation failed') ||
          error.message.includes('missing or empty') ||
          error.message.includes('null or undefined') ||
          error.message.includes('Critical error')
        );
        
        if (isCriticalError) {
          // PHASE 1: Set critical error state to prevent 3D viewer from attempting to render
          const errorMessage = `Erreur de préparation des données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
          setCriticalError(errorMessage);
          
          logger.error('BODY_SCAN_REVIEW', 'PHASE 1: Critical error state set due to payload preparation failure', {
            clientScanId: scanData.clientScanId,
            errorMessage,
            criticalErrorSet: true,
            philosophy: 'phase_1_critical_error_state_management'
          });
          
          return; // Exit early, don't set morph data
        } else {
          // Non-critical errors: use fallback but log the issue
          logger.warn('BODY_SCAN_REVIEW', 'PHASE 1: Non-critical payload preparation error, using fallback', {
            clientScanId: scanData.clientScanId,
            error: error instanceof Error ? error.message : 'Unknown error',
            philosophy: 'phase_1_non_critical_error_fallback'
          });
          
          initialMorphData = generateCompleteMorphFallback(stableUserProfile?.sex || 'male');
          strategy = 'payload_preparation_failed_fallback_validated';
        }
      }
    } else {
      initialMorphData = generateCompleteMorphFallback(stableUserProfile?.sex || 'male');
      strategy = 'comprehensive_fallback_no_mapping_or_profile';
    }
    
    // PHASE 1: Skip morph data setting if critical error occurred
    if (criticalError) {
      logger.debug('BODY_SCAN_REVIEW', 'PHASE 1: Skipping morph data setting due to critical error', {
        clientScanId: scanData.clientScanId,
        criticalError
      });
      return;
    }
    
    logger.info('BODY_SCAN_REVIEW Final morph data extracted for 3D viewer', {
      clientScanId: scanData.clientScanId,
      serverScanId: scanData.serverScanId,
      morphDataKeys: Object.keys(initialMorphData),
      morphDataCount: Object.keys(initialMorphData).length,
      strategy,
      timestamp: new Date().toISOString()
    });
    
    // CRITICAL FIX: Store the initial morph data for reset functionality
    if (!initialMorphDataRef.current || JSON.stringify(initialMorphDataRef.current) !== JSON.stringify(initialMorphData)) {
      initialMorphDataRef.current = { ...initialMorphData };
      logger.info('REVIEW_STATE', 'Initial morph data set/updated for reset', {
        morphKeysCount: Object.keys(initialMorphData).length,
        sampleMorphs: Object.entries(initialMorphData).slice(0, 3).map(([k, v]) => ({ key: k, value: v.toFixed(3) })),
        philosophy: 'initial_morph_data_storage_fix'
      });
    }
    
    setCurrentMorphData(initialMorphData);
    };
    
    initializeScanData();
  }, [location.state?.scanResults, navigate, currentMorphData, morphologyMapping, stableUserProfile]);

  // ENHANCED: Reset morphs to initial values with better error handling and 3D update
  const resetMorphsToInitial = useCallback(() => {
    logger.info('REVIEW_STATE', 'Reset morphs requested - BEFORE reset', {
      hasInitialData: !!initialMorphDataRef.current,
      initialDataKeys: initialMorphDataRef.current ? Object.keys(initialMorphDataRef.current) : [],
      initialDataCount: initialMorphDataRef.current ? Object.keys(initialMorphDataRef.current).length : 0,
      currentMorphDataKeys: Object.keys(currentMorphData),
      currentMorphDataCount: Object.keys(currentMorphData).length,
      resetTrigger,
      philosophy: 'reset_morphs_before_audit'
    });
    
    if (!initialMorphDataRef.current || Object.keys(initialMorphDataRef.current).length === 0) {
      logger.error('REVIEW_STATE', 'Cannot reset morphs - no initial data available', {
        hasInitialDataRef: !!initialMorphDataRef.current,
        initialDataKeys: initialMorphDataRef.current ? Object.keys(initialMorphDataRef.current) : [],
        philosophy: 'reset_morphs_no_initial_data_error'
      });
      return;
    }
    
    // Créer une nouvelle référence d'objet pour forcer la mise à jour de React
    const resetData = JSON.parse(JSON.stringify(initialMorphDataRef.current));
    
    // Mettre à jour l'état React des sliders
    setCurrentMorphData(resetData);
    
    // Forcer la mise à jour du modèle 3D via l'orchestrateur
    if (avatar3DRef.current?.forceMorphsUpdate) {
      avatar3DRef.current.forceMorphsUpdate(resetData);
      logger.info('REVIEW_STATE', 'Forced morph cache reset with immediate reapplication', {
        resetDataKeys: Object.keys(resetData),
        philosophy: 'force_3d_viewer_cache_reset_with_data'
      });
    }
    
    // Incrémenter le resetTrigger pour forcer la re-évaluation de completeMorphData
    setResetTrigger(prev => prev + 1);
    
    logger.info('REVIEW_STATE', 'Reset morphs completed - AFTER reset', {
      resetDataKeys: Object.keys(resetData),
      resetDataCount: Object.keys(resetData).length,
      sampleResetMorphs: Object.entries(resetData).slice(0, 3).map(([k, v]) => ({ key: k, value: v.toFixed(3) })),
      newResetTrigger: resetTrigger + 1,
      philosophy: 'reset_morphs_after_audit'
    });
  }, [setCurrentMorphData, currentMorphData, resetTrigger, avatar3DRef]);

  // Hide progress header and trigger avatar reveal sound when component mounts
  useEffect(() => {
    const currentProgress = useProgressStore.getState().progress;
    if (currentProgress < 100) {
      const { setRenderReady } = useProgressStore.getState();
      setRenderReady();
    }
    
    avatarReveal();
    
    logger.info('BODY_SCAN_REVIEW — page mounted, avatar ready for initialization', {
      clientScanId: scanResults?.clientScanId,
      serverScanId: scanResults?.serverScanId,
      currentProgress,
      timestamp: new Date().toISOString()
    });
    
    hasInitialized.current = true;
  }, [avatarReveal, completeMorphData, scanResults?.clientScanId, scanResults?.serverScanId]);
  
  return {
    scanResults,
    setScanResults,
    currentMorphData,
    completeMorphData,
    morphCounters,
    setCurrentMorphData,
    activeView,
    setActiveView,
    autoRotate,
    setAutoRotate,
    showMorphControls,
    setShowMorphControls,
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
    setCriticalError,
    initialMorphDataRef
  };
}

/**
 * Generate comprehensive morph fallback with all expected keys
 */
function generateCompleteMorphFallback(sex: 'male' | 'female'): Record<string, number> {
  const baseMorphs = {
    // Core body morphs
    pearFigure: 0.1,
    bodybuilderSize: 0.1,
    emaciated: 0.0,
    narrowWaist: 0.1,
    bigHips: sex === 'female' ? 0.2 : 0.1,
    assLarge: sex === 'female' ? 0.2 : 0.1,
    
    // Gender-specific morphs
    superBreast: sex === 'female' ? 0.1 : 0.0,
    breastsSmall: sex === 'female' ? 0.1 : 0.0,
    breastsSag: 0.0,
    pregnant: 0.0,
    
    // Additional morphs
    bodybuilderDetails: 0.0,
    animeWaist: 0.0,
    dollBody: 0.0,
    animeProportion: 0.0,
    animeNeck: 0.0,
    nipples: 0.0,
    
    // Face morphs (optional)
    FaceLowerEyelashLength: 0.0,
    eyesClosedL: 0.0,
    eyesClosedR: 0.0,
    eyelashLength: 0.0,
    eyelashesSpecial: 0.0,
    eyesShape: 0.0,
    eyesSpacing: 0.0,
    eyesDown: 0.0,
    eyesUp: 0.0,
    eyesSpacingWide: 0.0,
  };
  
  logger.debug('MORPH_FALLBACK', 'Generated comprehensive morph fallback', {
    sex,
    morphCount: Object.keys(baseMorphs).length,
    sampleMorphs: Object.entries(baseMorphs).slice(0, 5).map(([k, v]) => ({ key: k, value: v }))
  });
  
  return baseMorphs;
}