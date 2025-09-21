import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import GlassCard from '../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../ui/icons/registry';
import { useBodyScanCaptureFlow } from './hooks/useBodyScanCaptureFlow';
import BodyScanPhotoCaptureStep from './BodyScanPhotoCaptureStep';
import { ErrorBoundary } from '../../../providers/ErrorBoundary';
import LoadingFallback from '../../../components/LoadingFallback';
import ImmersivePhotoAnalysis from './components/ImmersivePhotoAnalysis';
import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '../../../../system/store/progressStore';
import logger from '../../../../lib/utils/logger';
import type { PhotoCaptureReport } from '../../../../domain/types';
import PageHeader from '../../../../ui/page/PageHeader';

const BodyScanCapture: React.FC = () => {
  const navigate = useNavigate();
  const { startProgress, setCaptureProgress, progress, message, subMessage, isActive } = useProgressStore();
  
  // CRITICAL: Generate scanId once and store it
  const scanIdRef = useRef<string | null>(null);
  const hasInitialized = useRef(false);
  
  const {
    // State
    currentStep,
    capturedPhotos,
    setCapturedPhotos,
    scanResults,
    showValidationResults,
    validationSummary,
    userId,
    isProfileComplete,
    stableScanParams,
    processingGuardRef,
    
    // Setters
    setCurrentStep,
    setScanResults,
    setShowValidationResults,
    setValidationSummary,
    
    // Handlers
    handleStartCapture,
    onProceedToProcessing: proceedToProcessing,
    isProcessing,
  } = useBodyScanCaptureFlow({
    scanId: scanIdRef.current, // Pass the stable scanId
  });

  // Smooth scroll to top on step changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Define Body Scan steps for progress tracking (3 steps only)
  const bodyScanSteps = [
    {
      id: 'capture',
      title: 'Capture Photographique',
      subtitle: 'Photos de face et profil',
      icon: 'Camera' as const,
      color: '#8B5CF6'
    },
    {
      id: 'processing',
      title: 'Analyse IA Avancée',
      subtitle: 'Intelligence artificielle en action sur votre morphologie',
      icon: 'Scan' as const,
      color: '#8B5CF6'
    },
    {
      id: 'celebration',
      title: 'Données Traitées',
      subtitle: 'Préparation du rendu 3D',
      icon: 'Check' as const,
      color: '#8B5CF6'
    },
    {
      id: 'avatar',
      title: 'Avatar 3D',
      subtitle: 'Votre reflet numérique',
      icon: 'Eye' as const,
      color: '#8B5CF6'
    }
  ];

  // Initialize progress tracking ONCE with stable scanId
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    // Generate scanId once
    if (!scanIdRef.current) {
      scanIdRef.current = nanoid();
    }
    
    const clientScanId = scanIdRef.current;
    
    // Reset any previous progress state before starting new one
    const { resetProgress } = useProgressStore.getState();
    resetProgress();
    
    startProgress(bodyScanSteps, clientScanId);
    
    logger.info('BODY_SCAN_CAPTURE', 'Component initialized with scanId', {
      clientScanId,
      isDevelopment: import.meta.env.DEV,
      timestamp: new Date().toISOString()
    });
    
    // Don't reset progress on unmount - let it persist for navigation
  }, []); // Empty dependency array - run only once

  // Update capture progress based on photos
  // Note: Photo capture progress is now handled directly in handlePhotoCapture for better precision

  // Handle photo capture with proper logging
  const handlePhotoCapture = React.useCallback(async (
    file: File, 
    type: 'front' | 'profile',
    captureReport: PhotoCaptureReport
  ) => {
    try {
      const url = URL.createObjectURL(file);
      
      const photo = {
        file,
        url,
        type,
        validationResult: {
          isValid: captureReport.validation?.isValid ?? false,
          issues: captureReport.validation?.issues ?? [],
          retakeReasons: captureReport.validation?.retakeReasons ?? [],
          confidence: captureReport.validation?.confidence ?? 0,
        },
        captureReport,
      };

      setCapturedPhotos(prev => {
        const filtered = prev.filter(p => p.type !== type);
        const newPhotos = [...filtered, photo];
        
        logger.info('BODY_SCAN_CAPTURE', 'Photo captured successfully', {
          clientScanId: scanIdRef.current,
          photoType: type,
          totalPhotos: newPhotos.length,
          isValid: photo.validationResult.isValid,
          confidence: photo.validationResult.confidence
        });
        
        return newPhotos;
      });

      if (type === 'front') {
        setCurrentStep('profile-photo');
      }
    } catch (error) {
      logger.error('BODY_SCAN_CAPTURE', 'Photo capture error', { 
        error,
        clientScanId: scanIdRef.current,
        photoType: type 
      });
    }
  }, [setCapturedPhotos, setCurrentStep]);

  const handleRetake = (type: 'front' | 'profile') => {
    setCapturedPhotos(prev => prev.filter(p => p.type !== type));
    setCurrentStep(type === 'front' ? 'front-photo' : 'profile-photo');
    
    logger.info('BODY_SCAN_CAPTURE', 'Photo retake requested', {
      clientScanId: scanIdRef.current,
      photoType: type
    });
  };

  const handleRestart = () => {
    setCapturedPhotos([]);
    setCurrentStep('front-photo');
    setShowValidationResults(false);
    setValidationSummary(null);
    setScanResults(null);
    
    // CRITICAL FIX: Reset processing guard when restarting
    if (processingGuardRef.current) {
      processingGuardRef.current = false;
    }
    
    logger.info('BODY_SCAN_CAPTURE', 'Scan restarted', {
      clientScanId: scanIdRef.current
    });
  };

  // Skip authentication check if dev mode is enabled
  if (userId === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon="Shield"
          title="Authentification requise"
          subtitle="Connectez-vous pour accéder au scanner corporel"
          circuit="body-scan"
        />
        
        <GlassCard className="text-center p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
            <SpatialIcon Icon={ICONS.Shield} size={24} className="text-red-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Authentification requise</h3>
          <p className="text-white/60 text-sm">
            Vous devez être connecté avec un compte valide pour utiliser le scanner corporel
          </p>
        </GlassCard>
      </div>
    );
  }

  // Skip profile completion check if dev mode is enabled
  if (!isProfileComplete) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon="User"
          title="Profil incomplet"
          subtitle="Complétez votre profil pour accéder au scanner corporel"
          circuit="body-scan"
        />
        
        <GlassCard className="text-center p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <SpatialIcon Icon={ICONS.User} size={24} className="text-yellow-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Profil incomplet</h3>
          <p className="text-white/60 text-sm mb-4">
            Veuillez renseigner votre sexe, taille et poids dans votre profil
          </p>
          <button
            onClick={() => navigate('/profile#identity')}
            className="btn-glass--primary px-6 py-3"
          >
            <div className="flex items-center justify-center gap-2">
              <SpatialIcon Icon={ICONS.User} size={16} />
              <span>Compléter mon profil</span>
            </div>
          </button>
        </GlassCard>
      </div>
    );
  }

  // Fonction pour déterminer la clé unique pour AnimatePresence
  const getStepKey = () => {
    if (showValidationResults && validationSummary) {
      return 'validation';
    }
    if (currentStep === 'processing') {
      return 'processing-stable';
    }
    return currentStep;
  };

  // Fonction pour rendre le contenu de l'étape actuelle
  const renderCurrentStep = (currentProgress: number, currentMessage: string, currentSubMessage: string) => {
    if (showValidationResults && validationSummary) {
      return (
        <ErrorBoundary fallback={<LoadingFallback />}>
          <div className="text-center p-8">
            <h3 className="text-white font-semibold mb-4">Validation en cours...</h3>
            <p className="text-white/60">Les résultats de validation seront bientôt disponibles.</p>
          </div>
        </ErrorBoundary>
      );
    }

    switch (currentStep) {
      case 'front-photo':
      case 'profile-photo':
        return (
          <BodyScanPhotoCaptureStep
            step={currentStep}
            capturedPhotos={capturedPhotos}
            onPhotoCapture={handlePhotoCapture}
            onRetake={handleRetake}
            onBack={() => {
              if (currentStep === 'profile-photo') {
                setCurrentStep('front-photo');
                setCapturedPhotos(prev => prev.filter(p => p.type === 'front')); // Remove profile photo on back
              } else {
                navigate('/');
              }
            }}
            onProceedToProcessing={proceedToProcessing}
            isProcessingInProgress={isProcessing}
            isProgressInitialized={isActive} // Pass the isActive state as isProgressInitialized
          />
        );

      case 'processing':
        return (
          <ErrorBoundary fallback={<LoadingFallback />}>
            <ImmersivePhotoAnalysis 
              capturedPhotos={capturedPhotos}
              currentProgress={currentProgress}
              currentMessage={currentMessage}
              currentSubMessage={currentSubMessage}
            />
          </ErrorBoundary>
        );

      case 'results':
        return (
          <ErrorBoundary fallback={<LoadingFallback />}>
            <GlassCard className="text-center p-8">
              <SpatialIcon Icon={ICONS.Check} size={48} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Scan terminé !</h3>
              <p className="text-white/70 text-sm mb-6">
                Votre avatar 3D a été généré avec succès
              </p>
              <button
                onClick={() => navigate('/body-scan/review', { state: { scanResults } })}
                className="btn-glass--primary px-6 py-3"
              >
                <div className="flex items-center justify-center gap-2">
                  <SpatialIcon Icon={ICONS.Eye} size={16} />
                  <span>Voir mon avatar</span>
                </div>
              </button>
            </GlassCard>
          </ErrorBoundary>
        );

      default:
        return (
          <GlassCard className="text-center p-8">
            <SpatialIcon Icon={ICONS.AlertCircle} size={48} className="text-red-400 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">Étape inconnue</h3>
            <p className="text-white/60 text-sm">Une erreur est survenue dans le flux de scan</p>
          </GlassCard>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={getStepKey()}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {renderCurrentStep(progress, message, subMessage)}
      </motion.div>
    </AnimatePresence>
  );
};

export default BodyScanCapture;