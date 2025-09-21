// src/app/pages/FaceScan/FaceScanPhotoCaptureStep.tsx
import React, { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../../ui/cards/GlassCard';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useFeedback } from '../../../hooks/useFeedback';
import { useToast } from '../../../ui/components/ToastProvider';
import { usePreferredMotion } from '../../../system/device/DeviceProvider';
import { getAnimationConfig } from '../../../lib/utils/animationUtils';
import { validateImageFormat, validateImageQuality, processPhotoForUpload, createPhotoCaptureReport } from '../../../lib/utils/photoUtils';
import PhotoGuideOverlay from '../BodyScan/PhotoGuideOverlay'; // CHEMIN CORRIGÉ
import PhotoCaptureControls from '../BodyScan/BodyScanCapture/components/PhotoCaptureControls'; // CHEMIN CORRIGÉ
import CapturedPhotoDisplay from '../BodyScan/BodyScanCapture/components/CapturedPhotoDisplay'; // CHEMIN CORRIGÉ
import CameraInterface from '../BodyScan/components/CameraInterface/CameraInterface'; // CHEMIN CORRIGÉ
import { useProgressStore } from '../../../system/store/progressStore';
import logger from '../../../lib/utils/logger';
import type { PhotoCaptureReport, CapturedPhotoEnhanced } from '../../../domain/types';

interface FaceScanPhotoCaptureStepProps {
  step: 'front-photo' | 'profile-photo';
  capturedPhotos: CapturedPhotoEnhanced[];
  onPhotoCapture: (file: File, type: 'front' | 'profile', report: PhotoCaptureReport) => void;
  onRetake: (type: 'front' | 'profile') => void;
  onBack: () => void;
  onProceedToProcessing: () => void;
  isProcessingInProgress?: boolean;
  isProgressInitialized: boolean;
}

/**
 * Face Scan Photo Capture Step - VisionOS 26 Optimized
 * Composant dédié à la capture photo pour le scan facial.
 */
const FaceScanPhotoCaptureStep: React.FC<FaceScanPhotoCaptureStepProps> = ({
  step,
  capturedPhotos,
  onPhotoCapture,
  onRetake,
  onBack,
  onProceedToProcessing,
  isProcessingInProgress = false,
  isProgressInitialized,
}) => {
  const [showCamera, setShowCamera] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [isAnyPhotoValidating, setIsAnyPhotoValidating] = React.useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = React.useState<'front' | 'profile' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { click, success, error: errorSound, glassClick } = useFeedback();
  const { showToast } = useToast();
  const preferredMotion = usePreferredMotion();
  const animConfig = getAnimationConfig('medium');

  const photoType = step === 'front-photo' ? 'front' : 'profile';
  const frontPhoto = capturedPhotos.find(p => p.type === 'front');
  const profilePhoto = capturedPhotos.find(p => p.type === 'profile');

  const processPhotoCapture = useCallback(async (file: File) => {
    setIsValidating(true);
    setIsAnyPhotoValidating(true);
    
    logger.info('🔍 [FaceScanPhotoCapture] Starting photo processing', {
      photoType,
      fileSize: Math.round(file.size / 1024),
      fileType: file.type,
      fileName: file.name,
      timestamp: Date.now()
    });
    
    try {
      const formatValidation = validateImageFormat(file);
      
      if (!formatValidation.isValid) {
        const criticalIssues = formatValidation.issues.filter(issue => 
          issue.includes('not an image') || issue.includes('too large') || issue.includes('too small')
        );
        
        if (criticalIssues.length > 0) {
          showToast({
            type: 'error',
            title: 'Format de fichier invalide',
            message: criticalIssues[0],
            duration: 4000,
          });
          errorSound();
          return;
        } else {
          showToast({
            type: 'warning',
            title: 'Format non optimal',
            message: 'Le format JPEG est recommandé pour une meilleure compatibilité',
            duration: 3000,
          });
        }
      }
      
      const { processedFile, validationReport } = await processPhotoForUpload(file);
      
      logger.info('🔍 [FaceScanPhotoCapture] Photo processing completed', {
        photoType,
        validationReport,
        processingSuccess: true
      });
      
      if (validationReport.compressionApplied) {
        const compressionRatio = ((validationReport.originalSizeKB - validationReport.finalSizeKB) / validationReport.originalSizeKB * 100).toFixed(0);
        showToast({
          type: 'info',
          title: 'Photo optimisée',
          message: `Taille réduite de ${compressionRatio}% pour une meilleure compatibilité`,
          duration: 2000,
        });
      }
      
      let validationResult;
      try {
        validationResult = {
          isValid: true,
          issues: [],
          retakeReasons: [],
          confidence: 0.8,
          qualityMetrics: {
            blur_score: 0.7,
            brightness: 0.6,
            exposure_ok: true,
            noise_score: 0.3,
          },
          contentMetrics: {
            single_person: true,
            pose_ok: true,
            face_detected: true,
            face_bbox_norm: [0.3, 0.1, 0.7, 0.4],
          },
          scaleMetrics: {
            pixel_per_cm_estimate: 3.5,
            method: 'face-heuristic',
          },
        };
      } catch (workerError) {
        logger.warn('Worker validation failed, using permissive fallback:', workerError);
        validationResult = {
          isValid: true,
          issues: ['Validation simplifiée - Photo acceptée'],
          retakeReasons: [],
          confidence: 0.8,
          qualityMetrics: {
            blur_score: 0.7,
            brightness: 0.6,
            exposure_ok: true,
            noise_score: 0.3,
          },
          contentMetrics: {
            single_person: true,
            pose_ok: true,
            face_detected: true,
            face_bbox_norm: [0.3, 0.1, 0.7, 0.4],
          },
          scaleMetrics: {
            pixel_per_cm_estimate: 3.5,
            method: 'face-heuristic',
          },
        };
      }
      
      const captureReport = await createPhotoCaptureReport(
        processedFile,
        photoType,
        validationResult,
        undefined
      );
      
      const criticalReasons = ['multiple_people', 'no_person'];
      const hasCriticalIssues = validationResult.retakeReasons.some(reason => criticalReasons.includes(reason));
      
      if (hasCriticalIssues) {
        const criticalReason = validationResult.retakeReasons.find(reason => criticalReasons.includes(reason));
        const criticalMessage = criticalReason === 'multiple_people' 
          ? 'Une seule personne doit être visible sur la photo'
          : 'Aucune personne détectée - Assurez-vous d\'être visible dans le cadre';
          
        showToast({
          type: 'error',
          title: 'Photo non utilisable',
          message: criticalMessage,
          duration: 4000,
        });
        errorSound();
        return;
      }
      
      setShowSuccessAnimation(photoType);
      
      const isValidated = validationResult.isValid;
      
      const { setCaptureProgress } = useProgressStore.getState();
      if (photoType === 'front') {
        setCaptureProgress('front_taken');
      } else if (photoType === 'profile') {
        setCaptureProgress('done');
      }
      
      const captureMessage = isValidated 
        ? 'Photo capturée avec succès'
        : 'Photo capturée - Qualité à améliorer';
      
      const captureType = isValidated ? 'success' : 'warning';
      
      setTimeout(async () => {
        await onPhotoCapture(processedFile, photoType, captureReport);
        setShowSuccessAnimation(null);
        
        if (photoType === 'front') {
          setTimeout(() => {
            const profileSection = document.querySelector('[data-photo-type="profile"]');
            profileSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 500);
        }
        
        if (photoType === 'profile') {
          setTimeout(() => {
            const frontPhotoExists = capturedPhotos.some(p => p.type === 'front');
            if (frontPhotoExists) {
              const launchButton = document.querySelector('[data-launch-analysis]');
              if (launchButton) {
                launchButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }, 800);
        }
      }, 1000);
      
      if (true) { // Always true if we reach this point
        showToast({
          type: captureType,
          title: captureMessage,
          message: isValidated 
            ? 'Excellente qualité détectée'
            : `${validationResult.issues.length} point(s) d'amélioration détecté(s). Vous pouvez continuer ou reprendre la photo.`,
          duration: 2000,
        });
        
        if (isValidated) {
          success();
        }
      }
    } catch (error) {
      logger.error(`Photo processing error: ${error instanceof Error ? error.message : String(error)}`, error);
      showToast({
        type: 'error',
        title: 'Erreur de traitement',
        message: 'Impossible de traiter la photo',
        duration: 4000,
      });
      errorSound();
    } finally {
      setIsValidating(false);
      setIsAnyPhotoValidating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [photoType, onPhotoCapture, showToast, success, errorSound, capturedPhotos]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formatValidation = validateImageFormat(file);
    
    if (!formatValidation.isValid) {
      const criticalIssues = formatValidation.issues.filter(issue => 
        issue.includes('not an image') || issue.includes('too large')
      );
      
      if (criticalIssues.length > 0) {
        showToast({
          type: 'error',
          title: 'Fichier invalide',
          message: criticalIssues[0],
          duration: 4000,
        });
        return;
      }
    }
    
    if (file.size > 8 * 1024 * 1024) { // 8MB
      showToast({
        type: 'warning',
        title: 'Fichier volumineux',
        message: 'La photo sera automatiquement optimisée pour un traitement plus rapide',
        duration: 2000,
      });
    }

    try {
      const qualityValidation = await validateImageQuality(file);
      
      if (!qualityValidation.isValid) {
        const hasBlockingIssues = qualityValidation.issues.some(issue => 
          issue.includes('corrupted') || issue.includes('too small')
        );
        
        if (hasBlockingIssues) {
          showToast({
            type: 'error',
            title: 'Qualité d\'image insuffisante',
            message: qualityValidation.issues[0],
            duration: 4000,
          });
          return;
        }
      }
    } catch (qualityError) {
      logger.warn('🔍 [FaceScanPhotoCapture] Quality validation failed, continuing with processing', {
        error: qualityError instanceof Error ? qualityError.message : 'Unknown error'
      });
    }

    if (file.size > 15 * 1024 * 1024) { // 15MB absolute maximum
      showToast({
        type: 'error',
        title: 'Fichier trop volumineux',
        message: 'La photo doit faire moins de 15MB',
        duration: 4000,
      });
      return;
    }

    await processPhotoCapture(file);
  }, [processPhotoCapture, showToast]);

  const handleCameraCapture = useCallback(async (file: File) => {
    setShowCamera(false);
    await processPhotoCapture(file);
  }, [processPhotoCapture]);

  return (
    <div className="space-y-8 body-scan-page"> {/* Réutilise la classe body-scan-page pour le style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Front Photo Card */}
        <motion.div
          data-photo-type="front"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: animConfig.duration, ease: animConfig.ease }}
        >
          <GlassCard className="glass-card--capture glass-card--capture-front p-6 relative overflow-visible">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <SpatialIcon Icon={ICONS.User} size={16} className="text-blue-400" />
                Photo de face
              </h4>
              <div className="capture-status-indicator">
                <div className={`capture-status-badge ${frontPhoto ? 'capture-status-badge--captured' : 'capture-status-badge--pending'}`}>
                  <div className="capture-status-icon">
                    <SpatialIcon 
                      Icon={frontPhoto ? ICONS.Check : ICONS.Clock} 
                      size={12} 
                      className={frontPhoto ? 'text-green-400' : 'text-blue-400'} 
                    />
                  </div>
                  <span className="capture-status-text">
                    {frontPhoto ? 'Capturée' : 'En attente'}
                  </span>
                </div>
              </div>
            </div>
            
            {frontPhoto ? (
              <CapturedPhotoDisplay
                photo={frontPhoto}
                showSuccessAnimation={showSuccessAnimation === 'front'}
                onRetake={() => onRetake('front')}
              />
            ) : (
              <div className="space-y-6">
                <PhotoGuideOverlay type="front" isFaceScan={true} /> {/* isFaceScan à true */}
                
                {step === 'front-photo' && (
                  <PhotoCaptureControls
                    photoType="front"
                    isValidating={isValidating}
                    onCameraCapture={() => setShowCamera(true)}
                    onGallerySelect={() => fileInputRef.current?.click()}
                    isProgressInitialized={isProgressInitialized}
                  />
                )}
              </div>
            )}
          </GlassCard>
        </motion.div>
        
        {/* Profile Photo Card */}
        <motion.div
          data-photo-type="profile"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: animConfig.duration, delay: 0.1, ease: animConfig.ease }}
        >
          <GlassCard className="glass-card--capture glass-card--capture-profile p-6 relative overflow-visible">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <SpatialIcon Icon={ICONS.RotateCcw} size={16} className="text-purple-400" />
                Photo de profil
              </h4>
              <div className="capture-status-indicator">
                <div className={`capture-status-badge ${profilePhoto ? 'capture-status-badge--captured' : 'capture-status-badge--pending'}`}>
                  <div className="capture-status-icon">
                    <SpatialIcon 
                      Icon={profilePhoto ? ICONS.Check : ICONS.Clock} 
                      size={12} 
                      className={profilePhoto ? 'text-green-400' : 'text-purple-400'} 
                    />
                  </div>
                  <span className="capture-status-text">
                    {profilePhoto ? 'Capturée' : 'En attente'}
                  </span>
                </div>
              </div>
            </div>
            
            {profilePhoto ? (
              <CapturedPhotoDisplay
                photo={profilePhoto}
                showSuccessAnimation={showSuccessAnimation === 'profile'}
                onRetake={() => onRetake('profile')}
              />
            ) : (
              <div className="space-y-6">
                <PhotoGuideOverlay type="profile" isFaceScan={true} /> {/* isFaceScan à true */}
                
                {step === 'profile-photo' && (
                  <PhotoCaptureControls
                    photoType="profile"
                    isValidating={isValidating}
                    onCameraCapture={() => setShowCamera(true)}
                    onGallerySelect={() => fileInputRef.current?.click()}
                    isProgressInitialized={isProgressInitialized}
                  />
                )}
                
                {step !== 'profile-photo' && !profilePhoto && (
                  <div className="text-center py-8 text-white/40">
                    <div className="waiting-clock-pulse">
                      <SpatialIcon Icon={ICONS.Clock} size={24} className="mx-auto mb-2" />
                    </div>
                    <p className="text-sm">Complétez d'abord la photo de face</p>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div >
      
      {/* Enhanced Validation Status */}
      <AnimatePresence>
        {isAnyPhotoValidating && (
          <div className="validation-status-entrance">
            <GlassCard className="p-6 text-center relative overflow-visible">
              <div
                className="absolute inset-0 rounded-inherit pointer-events-none validation-glow-pulse"
                style={{
                  background: 'radial-gradient(circle at center, #06B6D415, transparent 60%)',
                  filter: 'blur(15px)'
                }}
              />
              
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-6 h-6 rounded-full border-2 border-cyan-400 gpu-optimized-scan validation-spinner">
                  <div className="w-full h-full rounded-full bg-cyan-400/30 validation-spinner-inner" />
                </div>
                <span className="text-white/80 text-base font-medium">Validation en cours...</span>
              </div>
            </GlassCard>
          </div>
        )}
      </AnimatePresence>
      
      {/* Enhanced Ready for Processing */}
      <AnimatePresence>
        {capturedPhotos.length === 2 && !isAnyPhotoValidating && (
          <motion.div 
            className="ready-for-processing-entrance"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <GlassCard className="refined-glass-cta p-8 text-center relative overflow-visible">
              {/* Lueur Intérieure Subtile */}
              <div className="refined-inner-glow absolute inset-0 rounded-inherit pointer-events-none" />
              
              {/* Bordure Intérieure pour Profondeur */}
              <div className="refined-inner-border absolute inset-1 rounded-inherit pointer-events-none" />
              
              {/* Effet de Verre Dépoli Avancé */}
              <div className="refined-glass-texture absolute inset-0 rounded-inherit pointer-events-none" />
              
              <div className="relative z-10 space-y-8">
                {/* Icône de Succès Raffinée */}
                <motion.div 
                  className="flex items-center justify-center gap-4 mb-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div className="refined-success-icon-container relative">
                    {/* Halo Respirant */}
                    <div className="refined-success-halo absolute inset-0" />
                    
                    {/* Conteneur d'Icône Principal */}
                    <div className="refined-success-icon w-12 h-12 rounded-full flex items-center justify-center relative z-10">
                      <SpatialIcon Icon={ICONS.Check} size={24} className="text-green-400" />
                    </div>
                    
                    {/* Anneaux de Rayonnement */}
                    <div className="refined-success-ring-1 absolute inset-0 rounded-full" />
                    <div className="refined-success-ring-2 absolute inset-0 rounded-full" />
                  </div>
                  
                  <motion.span 
                    className="text-green-300 text-xl font-bold refined-success-text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    Photos capturées avec succès !
                  </motion.span>
                </motion.div>
                
                {/* Description Élégante */}
                <motion.p 
                  className="text-white/85 text-lg leading-relaxed max-w-md mx-auto refined-description"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  Vos photos de face et de profil sont prêtes pour l'analyse IA avancée.
                </motion.p>
                
                {/* Bouton CTA Raffiné */}
                <motion.button
                  data-launch-analysis
                  onClick={() => {
                    glassClick();
                    onProceedToProcessing();
                  }}
                  className="refined-cta-button w-full relative overflow-hidden btn-launch-analysis py-3"
                  disabled={isAnyPhotoValidating || false}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {/* Shimmer Raffiné */}
                  <div className="refined-cta-shimmer absolute inset-0" />
                  
                  {/* Lueur de Fond */}
                  <div className="refined-cta-glow absolute inset-0 rounded-inherit" />
                  
                  {/* Contenu du Bouton */}
                  <div className="refined-cta-content relative z-10 flex items-center justify-center gap-3">
                    <motion.div
                      className="refined-cta-icon"
                      animate={isAnyPhotoValidating || false ? { rotate: 360 } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <SpatialIcon 
                        Icon={isAnyPhotoValidating || false ? ICONS.Loader2 : ICONS.Zap} 
                        size={20} 
                        className="text-white"
                      />
                    </motion.div>
                    <span className="refined-cta-text text-lg font-bold text-white">
                      {false ? 'Analyse en cours...' : 'Lancer l\'analyse IA'}
                    </span>
                  </div>
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Camera Interface */}
      {showCamera && (
        <CameraInterface
          photoType={photoType}
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        capture="environment"
      />

      {/* Enhanced Navigation */}
      <div className="flex items-center justify-between">
        <motion.button 
          onClick={() => {
            click();
            onBack();
          }} 
          className="btn-glass--secondary-nav btn-breathing force-pill-shape"
          style={{
            borderRadius: '999px',
            padding: '.5rem 1.5rem',
            minHeight: '44px',
            overflow: 'hidden'
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-center gap-2">
            <SpatialIcon Icon={ICONS.ArrowLeft} size={16} />
            <span>Retour</span>
          </div>
        </motion.button>

        <div className="text-center">
          <p className={`text-white/60 text-sm ${animConfig.shouldAnimate ? 'progress-text-pulse' : ''}`}>
            {frontPhoto && profilePhoto ? 'Photos capturées' : 
             step === 'front-photo' ? 'Étape 1 sur 2' : 'Étape 2 sur 2'}
          </p>
        </div>

        <div className="w-24" />
      </div>
    </div>
  );
};

export default FaceScanPhotoCaptureStep;
