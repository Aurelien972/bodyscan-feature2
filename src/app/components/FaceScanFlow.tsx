// src/app/components/FaceScanFlow.tsx
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import GlassCard from '../../ui/cards/GlassCard';
import SpatialIcon from '../../ui/icons/SpatialIcon';
import { ICONS } from '../../ui/icons/registry';
import { useUserStore } from '../../system/store/userStore';
import { useToast } from '../../ui/components/ToastProvider';
import { useFeedback } from '../../hooks/useFeedback';
import { useProgressStore } from '../../system/store/progressStore';
import DynamicProgressHeader from '../shell/Header/DynamicProgressHeader';
import ImmersivePhotoAnalysis from '../pages/BodyScan/BodyScanCapture/components/ImmersivePhotoAnalysis';
import BodyScanPhotoCaptureStep from '../pages/BodyScan/BodyScanCapture/BodyScanPhotoCaptureStep';
import { bodyScanRepo } from '../../system/data/repositories/bodyScanRepo';
import type { PhotoCaptureReport, CapturedPhotoEnhanced } from '../../domain/types';
import logger from '../../lib/utils/logger';

type FaceScanStep = 'capture' | 'processing' | 'results';

interface FaceScanFlowProps {
  onClose: () => void;
  onScanComplete: () => void;
}

const FaceScanFlow: React.FC<FaceScanFlowProps> = ({ onClose, onScanComplete }) => {
  const { profile, sessionInfo, updateProfile } = useUserStore();
  const { showToast } = useToast();
  const { success, error: errorSound } = useFeedback();
  const { startProgress, setOverallProgress, setComplete, resetProgress, setHideHeader, incrementProgress, setServerScanId } = useProgressStore();

  // State for the face scan flow
  const [currentStep, setCurrentStep] = useState<FaceScanStep>('capture');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoEnhanced[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingGuardRef = useRef(false); // To prevent duplicate processing calls
  const clientScanIdRef = useRef<string | null>(null); // Unique ID for this scan session

  // Ensure clientScanId is initialized once
  useEffect(() => {
    if (!clientScanIdRef.current) {
      clientScanIdRef.current = nanoid();
      resetProgress(); // Reset any previous progress state
      startProgress(faceScanSteps, clientScanIdRef.current);
      setHideHeader(true); // Hide main header during scan flow
    }
    return () => {
      setHideHeader(false); // Ensure header is visible when flow closes
      resetProgress(); // Reset progress on unmount
    };
  }, []);

  const userId = useMemo(() => sessionInfo?.userId || profile?.userId || null, [sessionInfo, profile]);
  const userGender = useMemo(() => profile?.sex || 'male', [profile?.sex]); // Default to male if not set

  // Define Face Scan steps for progress tracking
  const faceScanSteps = [
    { id: 'capture', title: 'Capture Photo Faciale', subtitle: 'Photos de face et de profil', icon: 'Camera' as const, color: '#18E3FF' },
    { id: 'processing', title: 'Analyse IA Faciale', subtitle: 'Traitement avancé de votre visage', icon: 'Scan' as const, color: '#18E3FF' },
    { id: 'results', title: 'Avatar Facial Prêt', subtitle: 'Votre reflet numérique est complet', icon: 'Check' as const, color: '#18E3FF' },
  ];

  // Handle photo capture (reusing BodyScanPhotoCaptureStep's logic)
  const handlePhotoCapture = useCallback(async (
    file: File,
    type: 'front' | 'profile', // Assuming only front and profile for face
    captureReport: PhotoCaptureReport
  ) => {
    const photo: CapturedPhotoEnhanced = {
      file,
      url: URL.createObjectURL(file),
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
      logger.info('FACE_SCAN_FLOW', 'Photo captured', { type, count: newPhotos.length });
      return newPhotos;
    });

    // Update progress store for capture step
    if (type === 'front') {
      setOverallProgress(33, 'Capture Photo Faciale', 'Photo de face capturée');
    } else if (type === 'profile') {
      setOverallProgress(66, 'Capture Photo Faciale', 'Photo de profil capturée');
    }
  }, [setOverallProgress]);

  const handleRetake = useCallback((type: 'front' | 'profile') => {
    setCapturedPhotos(prev => prev.filter(p => p.type !== type));
    logger.info('FACE_SCAN_FLOW', 'Photo retake', { type });
  }, []);

  const onProceedToProcessing = useCallback(async () => {
    if (processingGuardRef.current) {
      logger.warn('FACE_SCAN_FLOW', 'Processing already in progress, ignoring duplicate call.');
      return;
    }

    if (capturedPhotos.length < 2) {
      showToast({ type: 'error', title: 'Photos manquantes', message: 'Veuillez capturer les deux photos (face et profil).' });
      return;
    }
    if (!userId) {
      showToast({ type: 'error', title: 'Erreur', message: 'Utilisateur non identifié.' });
      return;
    }

    processingGuardRef.current = true;
    setIsProcessing(true);
    setCurrentStep('processing');
    setOverallProgress(70, 'Analyse IA Faciale', 'Démarrage du traitement...');

    const clientScanId = clientScanIdRef.current!; // Guaranteed to be set

    try {
      // 1. Appel face-semantic
      setOverallProgress(75, 'Analyse IA Faciale', 'Analyse sémantique du visage...');
      const semanticResult = await bodyScanRepo.semantic({
        user_id: userId,
        photos: capturedPhotos.map(p => ({ url: p.url, view: p.type, report: p.captureReport })),
        extracted_data: {}, // Face semantic doesn't use body extracted_data directly
        user_declared_gender: userGender === 'male' ? 'masculine' : 'feminine',
        clientScanId,
      });
      logger.info('FACE_SCAN_FLOW', 'face-semantic completed', { semanticResult });

      // 2. Appel face-match
      setOverallProgress(80, 'Analyse IA Faciale', 'Recherche d\'archétypes faciaux...');
      const matchResult = await bodyScanRepo.match({
        user_id: userId,
        extracted_data: {}, // Face match doesn't use body extracted_data directly
        semantic_profile: semanticResult.semantic_profile, // Use semantic result for matching
        user_semantic_indices: {}, // Not directly used for face match
        matching_config: {
          gender: userGender === 'male' ? 'masculine' : 'feminine',
          limit: 5,
        },
        clientScanId,
      });
      logger.info('FACE_SCAN_FLOW', 'face-match completed', { matchResult });

      // 3. Appel face-refine-morphs
      setOverallProgress(85, 'Analyse IA Faciale', 'Raffinement IA des paramètres faciaux...');
      const refineResult = await bodyScanRepo.refine({
        scan_id: clientScanId,
        user_id: userId,
        resolvedGender: userGender === 'male' ? 'masculine' : 'feminine',
        photos: capturedPhotos.map(p => ({ url: p.url, view: p.type, report: p.captureReport })),
        blend_shape_params: matchResult.selected_archetypes?.[0]?.morph_values || {}, // Assuming first archetype's morphs
        blend_limb_masses: {}, // Not used for face refinement
        mapping_version: 'v1.0', // Or actual mapping version
        k5_envelope: matchResult.k5_envelope,
        vision_classification: semanticResult.semantic_profile, // Reusing semantic profile
        user_measurements: {}, // Not used for face refinement
      });
      logger.info('FACE_SCAN_FLOW', 'face-refine-morphs completed', { refineResult });

      // 4. Appel face-commit
      setOverallProgress(95, 'Sauvegarde des Données', 'Finalisation de votre avatar facial...');
      const commitResult = await bodyScanRepo.commit({
        user_id: userId,
        resolvedGender: userGender,
        estimate_result: {}, // Not directly used for face commit, but required by type
        match_result: matchResult,
        morph_bounds: matchResult.k5_envelope,
        semantic_result: semanticResult,
        validation_metadata: {},
        temporal_analysis: {},
        smoothing_metadata: {},
        visionfit_result: {},
        visionfit_version: '1.0',
        visionfit_status: 'complete',
        photos_metadata: capturedPhotos.map(p => ({ type: p.type, url: p.url, captureReport: p.captureReport })),
        clientScanId,
        // Specific face data for persistence
        final_face_params: refineResult.final_face_params,
        skin_tone: capturedPhotos[0]?.captureReport?.skin_tone || {}, // Use skin tone from photo capture
        resolved_gender: userGender,
        mapping_version: 'v1.0',
        gltf_model_id: `${userGender}-face-model`, // Placeholder for face model ID
        material_config_version: 'face-v1',
        avatar_version: 'face-v1.0',
      });
      logger.info('FACE_SCAN_FLOW', 'face-commit completed', { commitResult });

      setServerScanId(commitResult.scan_id); // Store server scan ID

      // Mise à jour du profil utilisateur avec les données faciales
      await updateProfile({
        preferences: {
          ...profile?.preferences,
          face: {
            final_face_params: refineResult.final_face_params,
            skin_tone: capturedPhotos[0]?.captureReport?.skin_tone || {},
            resolved_gender: userGender,
            last_face_scan_id: commitResult.scan_id,
            updated_at: new Date().toISOString(),
          },
        },
      });
      logger.info('FACE_SCAN_FLOW', 'User profile updated with face data.', { userId });

      setComplete(); // Mark overall progress as complete
      success(); // Play success sound
      setCurrentStep('results'); // Transition to results/success state
      onScanComplete(); // Notify parent component

      showToast({ type: 'success', title: 'Scan facial terminé !', message: 'Votre avatar facial a été mis à jour.' });

    } catch (err) {
      logger.error('FACE_SCAN_FLOW', 'Face scan pipeline failed', { error: err });
      errorSound();
      showToast({ type: 'error', title: 'Erreur de scan facial', message: err instanceof Error ? err.message : 'Une erreur inattendue est survenue.' });
      setCurrentStep('capture'); // Go back to capture step on error
      resetProgress(); // Reset progress on error
    } finally {
      setIsProcessing(false);
      processingGuardRef.current = false;
    }
  }, [capturedPhotos, userId, userGender, showToast, success, errorSound, setOverallProgress, setComplete, setServerScanId, resetProgress, profile, updateProfile, onScanComplete]);

  // Render logic based on current step
  const renderContent = () => {
    if (currentStep === 'capture') {
      return (
        <BodyScanPhotoCaptureStep
          step={capturedPhotos.length === 0 ? 'front-photo' : 'profile-photo'} // Adapt step based on captured photos
          capturedPhotos={capturedPhotos}
          onPhotoCapture={handlePhotoCapture}
          onRetake={handleRetake}
          onBack={onClose} // Close flow on back from first step
          onProceedToProcessing={onProceedToProcessing}
          isProcessingInProgress={isProcessing}
        />
      );
    } else if (currentStep === 'processing') {
      return (
        <ImmersivePhotoAnalysis
          capturedPhotos={capturedPhotos}
          currentProgress={useProgressStore.getState().overallProgress}
          currentMessage={useProgressStore.getState().message}
          currentSubMessage={useProgressStore.getState().subMessage}
        />
      );
    } else if (currentStep === 'results') {
      return (
        <GlassCard className="text-center p-8">
          <SpatialIcon Icon={ICONS.Check} size={48} className="text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-3">Scan facial terminé !</h3>
          <p className="text-white/70 text-sm mb-6">
            Votre avatar facial a été mis à jour avec succès.
          </p>
          <button
            onClick={() => {
              success();
              onClose(); // Close flow
            }}
            className="btn-glass--primary px-6 py-3"
          >
            <div className="flex items-center justify-center gap-2">
              <SpatialIcon Icon={ICONS.Eye} size={16} />
              <span>Voir mon avatar</span>
            </div>
          </button>
        </GlassCard>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl h-full max-h-[90vh] rounded-xl overflow-hidden">
        <DynamicProgressHeader /> {/* Progress header for the flow */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full overflow-y-auto" // Ensure content is scrollable if needed
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FaceScanFlow;
