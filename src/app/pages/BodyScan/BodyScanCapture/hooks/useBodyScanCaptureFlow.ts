// src/app/pages/BodyScan/BodyScanCapture/hooks/useBodyScanCaptureFlow.ts
/**
 * Body Scan Capture Flow Hook - Modularized
 * Main orchestrator for body scan capture flow using specialized services
 */

import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../../../../system/store/userStore';
import { useToast } from '../../../../../ui/components/ToastProvider';
import { useFeedback } from '../../../../../hooks/useFeedback';
import { scanAnalytics } from '../../../../../lib/utils/analytics';
import { processBodyScanPipeline } from '../services/scanProcessingService';
import { generateInsightsFromScanResults } from '../utils/insightGenerator';
import { extractUserProfileFromSources, resolveGenderFromSources } from '../utils/dataExtractors';
import type { CapturedPhotoEnhanced } from '../../../../../domain/types';
import logger from '../../../../../lib/utils/logger';

type CaptureStep = 'front-photo' | 'profile-photo' | 'processing' | 'results';

interface BodyScanCaptureFlowConfig {
  scanId?: string | null;
}

interface BodyScanCaptureFlowState {
  // State
  currentStep: CaptureStep;
  capturedPhotos: CapturedPhotoEnhanced[];
  scanResults: any;
  showValidationResults: boolean;
  validationSummary: any;
  userId: string | null;
  isProfileComplete: boolean;
  stableScanParams: {
    sex: 'male' | 'female';
    height_cm: number;
    weight_kg: number;
  } | undefined;
  processingGuardRef: React.MutableRefObject<boolean>;
  
  // Setters
  setCapturedPhotos: React.Dispatch<React.SetStateAction<CapturedPhotoEnhanced[]>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<CaptureStep>>;
  setScanResults: React.Dispatch<React.SetStateAction<any>>;
  setShowValidationResults: React.Dispatch<React.SetStateAction<boolean>>;
  setValidationSummary: React.Dispatch<React.SetStateAction<any>>;
  
  // Handlers
  handleStartCapture: () => void;
  onProceedToProcessing: () => void;
  isProcessing: boolean;
}

/**
 * Main hook for body scan capture flow - modularized
 */
export function useBodyScanCaptureFlow(config: BodyScanCaptureFlowConfig = {}): BodyScanCaptureFlowState {
  const { profile, sessionInfo } = useUserStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { success } = useFeedback();
  
  // State management
  const [currentStep, setCurrentStep] = useState<CaptureStep>('front-photo');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoEnhanced[]>([]);
  const [scanResults, setScanResults] = useState<any>(null);
  const [showValidationResults, setShowValidationResults] = useState(false);
  const [validationSummary, setValidationSummary] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingGuardRef = useRef(false);

  // User identification with dev mode support
  const userId = useMemo(() => {
    return sessionInfo?.userId || profile?.userId || null;
  }, [sessionInfo?.userId, profile?.userId]);

  // Extract stable scan parameters
  const stableScanParams = useMemo(() => {
    // Corrected call to extractUserProfileFromSources
    const extracted = extractUserProfileFromSources(profile, null); 
    
    logger.info('BODY_SCAN_CAPTURE_FLOW', 'Extracting scan parameters from profile', {
      hasProfile: !!profile,
      profileKeys: profile ? Object.keys(profile) : [],
      profileIdentityFields: profile ? {
        displayName: profile.displayName,
        sex: profile.sex,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        target_weight_kg: profile.target_weight_kg,
        activity_level: profile.activity_level,
        objective: profile.objective,
        birthdate: profile.birthdate
      } : null,
      extractedParams: extracted,
      extractedKeys: extracted ? Object.keys(extracted) : [],
      philosophy: 'scan_params_extraction'
    });
    
    return extracted;
  }, [
    profile?.sex,
    profile?.height_cm, 
    profile?.weight_kg
  ]);

  // Profile completeness check
  const isProfileComplete = useMemo(() => {
    return !!stableScanParams;
  }, [stableScanParams]);

  const handleStartCapture = () => {
    setCurrentStep('front-photo');
    setCapturedPhotos([]);
    setScanResults(null);
    setShowValidationResults(false);
    setValidationSummary(null);
  };

  const onProceedToProcessing = async () => {
    // Resolve gender for entire pipeline
    // Corrected call to resolveGenderFromSources
    const resolvedGender = resolveGenderFromSources( 
      stableScanParams,
      null, // scanResults parameter
      false, // debug parameter
      config.scanId // clientScanId parameter
    );

    // CRITICAL: Deduplication guard
    if (processingGuardRef.current) {
      logger.warn('BODY_SCAN_CAPTURE_FLOW', 'Processing already in progress, ignoring duplicate request', {
        clientScanId: config.scanId
      });
      return;
    }
    
    if (capturedPhotos.length !== 2) {
      showToast({
        type: 'error',
        title: 'Photos manquantes',
        message: 'Veuillez capturer les deux photos avant de continuer',
        duration: 4000,
      });
      return;
    }

    if (!stableScanParams || !userId) {
      showToast({
        type: 'error',
        title: 'Paramètres manquants',
        message: 'Profil utilisateur incomplet',
        duration: 4000,
      });
      return;
    }

    if (!config.scanId) {
      logger.error('BODY_SCAN_CAPTURE_FLOW', 'No scanId provided to processing flow');
      showToast({
        type: 'error',
        title: 'Erreur système',
        message: 'Identifiant de scan manquant',
        duration: 4000,
      });
      return;
    }

    processingGuardRef.current = true;
    setIsProcessing(true);
    setCurrentStep('processing');

    const clientScanId = config.scanId;

    try {
      scanAnalytics.processingStarted({ 
        photos_count: capturedPhotos.length,
        scan_id: clientScanId 
      });

      // Process complete pipeline using service
      const { completeResults } = await processBodyScanPipeline({
        userId,
        clientScanId,
        capturedPhotos,
        stableScanParams,
        resolvedGender
      });

      setScanResults(completeResults);
      setCurrentStep('results');
      success();

      // Navigate to celebration page after successful processing
      setTimeout(() => {
        logger.info('BODY_SCAN_CAPTURE_FLOW', 'Navigating to celebration with complete scan data', {
          clientScanId,
          serverScanId: completeResults.serverScanId,
          hasResults: !!completeResults,
          resultsKeys: completeResults ? Object.keys(completeResults) : [],
          navigationDelay: '500ms',
          timestamp: new Date().toISOString()
        });
        
        navigate('/body-scan/celebration', { 
          state: { scanResults: completeResults },
          replace: false
        });
      }, 500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      logger.error('BODY_SCAN_CAPTURE_FLOW', 'Processing pipeline failed', { 
        clientScanId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        step: 'pipeline_processing',
        timestamp: new Date().toISOString()
      });
      
      showToast({
        type: 'error',
        title: 'Erreur de traitement',
        message: errorMessage,
        duration: 4000,
      });
      
      setCurrentStep('profile-photo');
    } finally {
      processingGuardRef.current = false;
      setIsProcessing(false);
    }
  };
  
  return {
    currentStep,
    capturedPhotos,
    scanResults,
    showValidationResults,
    validationSummary,
    userId,
    isProfileComplete,
    stableScanParams,
    processingGuardRef,
    isProcessing,
    
    // Setters
    setCapturedPhotos,
    setCurrentStep,
    setScanResults,
    setShowValidationResults,
    setValidationSummary,
    
    // Handlers
    handleStartCapture,
    onProceedToProcessing,
  };
}
