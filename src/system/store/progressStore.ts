// src/system/store/progressStore.ts
import { create } from 'zustand';
import { ICONS } from '../../ui/icons/registry';
import logger from '../../lib/utils/logger';
import { playSoundLegacy } from '../../hooks/useFeedback';

// Detailed scan status steps for dynamic progression (Body Scan)
const SCAN_STATUS_STEPS: { title: string; subtitle: string }[] = [
  { title: "Initialisation du scan", subtitle: "On prépare la magie ✨" },
  { title: "Sécurisation des photos", subtitle: "Chiffrement & transfert en cours" },
  { title: "Nettoyage intelligent", subtitle: "Cadrage, netteté et bruit optimisés" },
  { title: "Détection silhouette", subtitle: "Repères corporels en haute précision" },
  { title: "Estimation des mesures", subtitle: "Calcul des volumes & proportions" },
  { title: "Analyse de la peau", subtitle: "Teint détecté pour un rendu fidèle" },
  { title: "Profil morphologique", subtitle: "Compréhension fine de votre silhouette" },
  { title: "Sélection d'archétypes", subtitle: "Comparaison à +300 profils de référence" },
  { title: "Affinage IA", subtitle: "Ajustements subtils des formes et détails" },
  { title: "Contrôles de cohérence", subtitle: "On verrouille la qualité des données" },
  { title: "Préparation du modèle 3D", subtitle: "Chargement du basemesh optimisé" },
  { title: "Application des morphs", subtitle: "Sculpture numérique en temps réel" },
  { title: "Répartition des masses", subtitle: "Bras, jambes et torse harmonisés" },
  { title: "Peau & matériaux", subtitle: "Lumière, SSS et textures peau réglés" },
  { title: "Mise en scène", "subtitle": "Caméra, cadrage et éclairage peaufinés" },
  { title: "Validation finale", subtitle: "Derniers checks visuels automatiques" },
  { title: "Avatar prêt", subtitle: "Place au rendu interactif 🎉" },
];

// Detailed scan status steps for dynamic progression (Face Scan)
const FACE_SCAN_DETAILED_STEPS: { title: string; subtitle: string }[] = [
  { title: "Initialisation du scan facial", subtitle: "Préparation de l'analyse du visage ✨" },
  { title: "Sécurisation des photos faciales", subtitle: "Chiffrement & transfert en cours" },
  { title: "Nettoyage intelligent du visage", subtitle: "Cadrage, netteté et bruit optimisés" },
  { title: "Détection des traits faciaux", subtitle: "Points clés du visage en haute précision" },
  { title: "Analyse sémantique faciale", subtitle: "Forme du visage, yeux, nez, lèvres" },
  { title: "Sélection d'archétypes faciaux", subtitle: "Comparaison à +100 profils de référence" },
  { title: "Affinage IA du visage", subtitle: "Ajustements subtils des traits et expressions" },
  { title: "Contrôles de cohérence faciale", subtitle: "On verrouille la qualité des données" },
  { title: "Préparation du modèle 3D facial", subtitle: "Chargement du basemesh optimisé" },
  { title: "Application des morphs faciaux", subtitle: "Sculpture numérique du visage en temps réel" },
  { title: "Peau & matériaux faciaux", subtitle: "Lumière, SSS et textures peau réglés" },
  { title: "Mise en scène faciale", "subtitle": "Caméra, cadrage et éclairage peaufinés" },
  { title: "Validation finale du visage", subtitle: "Derniers checks visuels automatiques" },
  { title: "Avatar facial prêt", subtitle: "Votre reflet numérique est prêt 🎉" },
];


interface ProgressStep {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof ICONS;
  color: string;
}

// 4-step pipeline type
type Step = 'capture' | 'processing' | 'celebration' | 'avatar';
type FlowType = 'body' | 'face'; // Nouveau type pour distinguer les flux

interface ProgressState {
  isActive: boolean;
  clientScanId: string | null;
  serverScanId: string | null;
  currentStep: Step;
  overallProgress: number;
  phaseProgress: number;
  message: string;
  subMessage: string;
  steps: ProgressStep[];
  totalSteps: number;
  lastUpdateTime: number;
  flowType: FlowType | null; // Ajout du type de flux
  progressHistory: Array<{ step: string; progress: number; timestamp: number }>;
  
  // Dynamic progression state
  dynamicProgressIntervalId: number | null;
  dynamicProgressStepIndex: number;
  lastSoundThreshold: number;
  
  // Actions
  startProgress: (steps: ProgressStep[], clientScanId: string, flowType: FlowType) => void; // Mise à jour de la signature
  setCaptureProgress: (step: 'front_taken' | 'profile_taken' | 'done') => void;
  setProcessingStep: (step: 'upload' | 'estimate' | 'semantic' | 'match' | 'commit') => void;
  setComplete: () => void;
  setRendering: () => void;
  setRenderReady: () => void;
  setServerScanId: (serverScanId: string) => void;
  completeProgress: () => void;
  resetProgress: () => void;
  setProgressMessage: (message: string, subMessage?: string) => void;
  setProgressActive: (active: boolean) => void;
  maintainProgressForReview: () => void;
  startDynamicProcessing: (startPercentage: number, endPercentage: number) => void;
  stopDynamicProcessing: () => void;
  setOverallProgress: (percentage: number, message: string, subMessage?: string) => void;
  incrementProgress: (increment: number, message?: string, subMessage?: string) => void;
}

// PROFESSIONAL: Progress update throttling to prevent chaos
const PROGRESS_THROTTLE_MS = 100;
const MAX_PROGRESS_HISTORY = 20;

// Centralized progress mapping - single source of truth
const CAPTURE_PROGRESS_MAPPING: Record<string, number> = {
  'front_taken': 25,
  'profile_taken': 50,
  'done': 50,
};

const PROCESSING_PROGRESS_MAPPING: Record<string, { progress: number; message: string; subMessage: string }> = {
  'upload': { progress: 55, message: 'Analyse IA Avancée', subMessage: 'Téléchargement des photos...' },
  'estimate': { progress: 65, message: 'Analyse IA Avancée', subMessage: 'Extraction des mesures corporelles...' },
  'semantic': { progress: 75, message: 'Analyse IA Avancée', subMessage: 'Classification morphologique...' },
  'match': { progress: 85, message: 'Analyse IA Avancée', subMessage: 'Sélection des archétypes...' },
  'commit': { progress: 90, message: 'Analyse IA Avancée', subMessage: 'Sauvegarde des données...' },
  // PHASE 2: New 3D loading progress steps
  'model_loading': { progress: 92, message: 'Chargement de votre avatar', subMessage: 'Téléchargement du modèle 3D...' },
  'model_loaded': { progress: 94, message: 'Chargement de votre avatar', subMessage: 'Modèle 3D chargé avec succès...' },
  'morphs_applied': { progress: 97, message: 'Chargement de votre avatar', subMessage: 'Application des paramètres morphologiques...' },
  'first_frame_rendered': { progress: 100, message: 'Avatar 3D Prêt', subMessage: 'Votre reflet numérique est maintenant visible' },
};

/**
 * Progress Store - 4-step pipeline with stable IDs
 */
export const useProgressStore = create<ProgressState>((set, get) => ({
  isActive: false,
  clientScanId: null,
  serverScanId: null,
  currentStep: 'capture',
  overallProgress: 0,
  phaseProgress: 0,
  message: '',
  subMessage: '',
  steps: [],
  totalSteps: 0,
  flowType: null, // Initialisation du type de flux
  progressHistory: [],
  
  // Dynamic progression state
  dynamicProgressIntervalId: null,
  dynamicProgressStepIndex: 0,
  lastSoundThreshold: -1,

  startProgress: (steps: ProgressStep[], clientScanId: string, flowType: FlowType) => {
    if (!clientScanId || typeof clientScanId !== 'string') {
      logger.error('startProgress called without valid clientScanId', { clientScanId });
      return;
    }

    const state = get();
    
    logger.info('PROGRESS_AUDIT', 'startProgress called - BEFORE state update', {
      clientScanId,
      currentOverallProgress: state.overallProgress,
      currentPhaseProgress: state.phaseProgress,
      isCurrentlyActive: state.isActive,
      currentClientScanId: state.clientScanId,
      philosophy: 'start_progress_before_state_update'
    });
    
    // IDEMPOTENCE: Don't restart if same clientScanId is already active
    if (state.isActive && state.clientScanId === clientScanId) {
      logger.debug('Progress already started for clientScanId, ignoring duplicate start', { 
        clientScanId,
        currentProgress: state.overallProgress 
      });
      return;
    }

    // ERROR: If different scanId is active, log error but allow override
    if (state.isActive && state.clientScanId && state.clientScanId !== clientScanId) {
      logger.error('Starting new progress while another is active', {
        activeScanId: state.clientScanId,
        newScanId: clientScanId,
        action: 'overriding_previous_progress'
      });
    }
    
    const now = Date.now();
    set({
      isActive: true,
      clientScanId,
      serverScanId: null, // Will be set later by commit
      steps,
      totalSteps: steps.length,
      currentStep: 'capture',
      overallProgress: 0,
      phaseProgress: 0,
      message: steps[0]?.subtitle || '',
      subMessage: '',
      lastUpdateTime: now,
      flowType, // Définition du type de flux
      progressHistory: [{ step: steps[0]?.id || '', progress: 0, timestamp: now }],
      lastSoundThreshold: -1,
    });
    
    const newState = get();
    logger.info('PROGRESS_AUDIT', 'startProgress called - AFTER state update', {
      clientScanId,
      newOverallProgress: newState.overallProgress,
      newPhaseProgress: newState.phaseProgress,
      newIsActive: newState.isActive,
      newCurrentStep: newState.currentStep,
      newMessage: newState.message,
      newFlowType: newState.flowType,
      philosophy: 'start_progress_after_state_update'
    });
    
    logger.info('Progress started successfully', {
      clientScanId,
      stepsCount: steps.length,
      firstStep: steps[0]?.id,
      timestamp: new Date().toISOString()
    });
  },

  setCaptureProgress: (step: 'front_taken' | 'profile_taken' | 'done') => {
    const state = get();
    // Removed isActive check here, as it's now handled by the caller
    // if (!state.isActive) {
    //   logger.warn('setCaptureProgress called but progress not active', { step });
    //   return;
    // }

    const targetProgress = CAPTURE_PROGRESS_MAPPING[step];
    if (targetProgress === undefined) {
      logger.error('Invalid capture step', { step, validSteps: Object.keys(CAPTURE_PROGRESS_MAPPING) });
      return;
    }

    // Monotonic guard
    if (targetProgress < state.overallProgress) {
      logger.debug('Rejected non-monotonic capture progress', {
        currentProgress: state.overallProgress,
        targetProgress,
        step,
        reason: 'progress_would_decrease'
      });
      return;
    }

    const now = Date.now();
    const progressEntry = { step: 'capture', progress: targetProgress, timestamp: now };
    const newHistory = [...state.progressHistory, progressEntry].slice(-MAX_PROGRESS_HISTORY);

    set({
      currentStep: 'capture',
      overallProgress: targetProgress,
      phaseProgress: targetProgress,
      message: 'Capture Photographique',
      subMessage: step === 'front_taken' ? 'Capturez votre photo de profil - tournez-vous à 90°' :
                  step === 'profile_taken' ? 'Photos capturées avec succès - Prêt pour l\'analyse IA' :
                  'Photos capturées avec succès - Prêt pour l\'analyse IA',
      lastUpdateTime: now,
      progressHistory: newHistory,
    });

    logger.info(`Capture progress: ${targetProgress}%`, {
      clientScanId: state.clientScanId,
      step,
      progress: targetProgress,
      timestamp: new Date().toISOString()
    });
  },

  setProcessingStep: (step: 'upload' | 'estimate' | 'semantic' | 'match' | 'commit') => {
    const state = get();
    
    logger.info('PROGRESS_AUDIT', 'setProcessingStep called - BEFORE validation', {
      step,
      currentOverallProgress: state.overallProgress,
      currentPhaseProgress: state.phaseProgress,
      isActive: state.isActive,
      hasDynamicInterval: state.dynamicProgressIntervalId !== null,
      dynamicIntervalId: state.dynamicProgressIntervalId,
      clientScanId: state.clientScanId,
      philosophy: 'set_processing_step_before_validation'
    });
    
    // Removed isActive check here, as it's now handled by the caller
    // if (!state.isActive) {
    //   logger.warn('setProcessingStep called but progress not active', { step });
    //   return;
    // }
    
    // Don't update if dynamic processing is active
    if (state.dynamicProgressIntervalId !== null) {
      logger.warn('PROGRESS_AUDIT', 'setProcessingStep BLOCKED by dynamic processing', { 
        step,
        dynamicIntervalId: state.dynamicProgressIntervalId,
        currentProgress: state.overallProgress,
        philosophy: 'set_processing_step_blocked_by_dynamic'
      });
      return;
    }

    const stepConfig = PROCESSING_PROGRESS_MAPPING[step];
    if (!stepConfig) {
      logger.error('Invalid processing step', { step, validSteps: Object.keys(PROCESSING_PROGRESS_MAPPING) });
      return;
    }

    logger.info('PROGRESS_AUDIT', 'setProcessingStep - step config found', {
      step,
      stepConfigProgress: stepConfig.progress,
      stepConfigMessage: stepConfig.message,
      stepConfigSubMessage: stepConfig.subMessage,
      currentOverallProgress: state.overallProgress,
      philosophy: 'set_processing_step_config_validation'
    });

    // Monotonic guard
    if (stepConfig.progress < state.overallProgress) {
      logger.debug('REJECTED non-monotonic processing progress', {
        currentProgress: state.overallProgress,
        targetProgress: stepConfig.progress,
        step,
        reason: 'progress_would_decrease'
      });
      return;
    }

    const now = Date.now();
    const progressEntry = { step, progress: stepConfig.progress, timestamp: now };
    const newHistory = [...state.progressHistory, progressEntry].slice(-MAX_PROGRESS_HISTORY);

    set({
      currentStep: 'processing',
      overallProgress: stepConfig.progress,
      phaseProgress: stepConfig.progress,
      message: stepConfig.message,
      subMessage: stepConfig.subMessage,
      lastUpdateTime: now,
      progressHistory: newHistory,
    });
    
    const stateAfterUpdate = get();
    logger.info('PROGRESS_AUDIT', 'setProcessingStep - AFTER state update', {
      step,
      requestedProgress: stepConfig.progress,
      actualOverallProgress: stateAfterUpdate.overallProgress,
      actualPhaseProgress: stateAfterUpdate.phaseProgress,
      actualMessage: stateAfterUpdate.message,
      actualSubMessage: stateAfterUpdate.subMessage,
      actualCurrentStep: stateAfterUpdate.currentStep,
      updateSuccessful: stateAfterUpdate.overallProgress === stepConfig.progress,
      clientScanId: state.clientScanId,
      philosophy: 'set_processing_step_after_state_update'
    });

    logger.info(`Processing step: ${step} (${stepConfig.progress}%)`, {
      clientScanId: state.clientScanId,
      serverScanId: state.serverScanId,
      step,
      progress: stepConfig.progress,
      message: stepConfig.message,
      timestamp: new Date().toISOString()
    });
  },

  setComplete: () => {
    const state = get();
    // Removed isActive check here, as it's now handled by the caller
    // if (!state.isActive) {
    //   logger.warn('setComplete called but progress not active');
    //   return;
    // }
    
    // Stop dynamic processing if active
    get().stopDynamicProcessing();

    const now = Date.now();
    set({
      currentStep: 'celebration',
      overallProgress: 95,
      phaseProgress: 95,
      message: 'Données Traitées',
      subMessage: 'Préparation du rendu 3D...',
      lastUpdateTime: now,
    });
    
    logger.info('Processing completed - celebration step', { 
      clientScanId: state.clientScanId,
      serverScanId: state.serverScanId,
      step: 'celebration',
      progress: 95,
      timestamp: new Date().toISOString()
    });
  },

  setRendering: () => {
    const state = get();
    // Removed isActive check here, as it's now handled by the caller
    // if (!state.isActive) {
    //   logger.warn('setRendering called but progress not active');
    //   return;
    // }

    const now = Date.now();
    set({
      currentStep: 'avatar',
      overallProgress: 98,
      phaseProgress: 98,
      message: 'Chargement de votre avatar',
      subMessage: 'Préparation du conteneur 3D...',
      lastUpdateTime: now,
    });
    
    logger.info('Avatar rendering started', { 
      clientScanId: state.clientScanId,
      serverScanId: state.serverScanId,
      step: 'avatar',
      progress: 98,
      timestamp: new Date().toISOString()
    });
  },

  setRenderReady: () => {
    const state = get();
    // Removed isActive check here, as it's now handled by the caller
    // if (!state.isActive) {
    //   logger.warn('setRenderReady called but progress not active');
    //   return;
    // }
    
    // Stop dynamic processing if active
    get().stopDynamicProcessing();

    const now = Date.now();
    set({
      currentStep: 'avatar',
      overallProgress: 100,
      phaseProgress: 100,
      message: 'Avatar 3D Prêt',
      subMessage: 'Votre reflet numérique est maintenant visible',
      lastUpdateTime: now,
    });
    
    logger.info('Avatar render ready - 100% complete', { 
      clientScanId: state.clientScanId,
      serverScanId: state.serverScanId,
      step: 'avatar',
      progress: 100,
      timestamp: new Date().toISOString()
    });
  },

  setServerScanId: (serverScanId: string) => {
    const state = get();
    set({ serverScanId });
    
    logger.info('Server scan ID set', {
      clientScanId: state.clientScanId,
      serverScanId,
      timestamp: new Date().toISOString()
    });
  },

  setProgressMessage: (message: string, subMessage?: string) => {
    set({
      message,
      subMessage: subMessage || '',
      lastUpdateTime: Date.now(),
    });
  },

  completeProgress: () => {
    const state = get();
    
    // Use setComplete instead of direct manipulation
    get().setComplete();
    
    logger.info('Progress completed successfully', { 
      clientScanId: state.clientScanId,
      serverScanId: state.serverScanId,
      finalStep: 'celebration',
      timestamp: new Date().toISOString()
    });
  },

  maintainProgressForReview: () => {
    const state = get();
    const now = Date.now();
    
    logger.info('Maintaining progress for review', { 
      clientScanId: state.clientScanId,
      serverScanId: state.serverScanId,
      currentProgress: state.overallProgress, 
      currentStep: state.currentStep,
      timestamp: new Date().toISOString()
    });
    
    const reviewSteps = state.steps.length > 0 ? state.steps : [
      {
        id: 'capture',
        title: 'Capture Photographique',
        subtitle: 'Photos de face et de profil capturées',
        icon: 'Camera' as const,
        color: '#8B5CF6'
      },
      {
        id: 'processing',
        title: 'Analyse IA Avancée',
        subtitle: 'Intelligence artificielle appliquée',
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
    
    set({
      isActive: true,
      overallProgress: 95,
      phaseProgress: 95,
      currentStep: 'celebration',
      message: 'Données Traitées',
      subMessage: 'Préparation du rendu 3D...',
      lastUpdateTime: now,
      steps: reviewSteps,
      totalSteps: reviewSteps.length,
    });
  },

  resetProgress: () => {
    const state = get();
    
    logger.info('PROGRESS_AUDIT', 'resetProgress called - BEFORE reset', {
      currentOverallProgress: state.overallProgress,
      currentPhaseProgress: state.phaseProgress,
      currentIsActive: state.isActive,
      currentClientScanId: state.clientScanId,
      currentServerScanId: state.serverScanId,
      currentDynamicIntervalId: state.dynamicProgressIntervalId,
      philosophy: 'reset_progress_before_reset'
    });
    
    // Stop dynamic processing if active
    get().stopDynamicProcessing();
    
    logger.info('Resetting progress', {
      clientScanId: state.clientScanId,
      serverScanId: state.serverScanId,
      timestamp: new Date().toISOString()
    });
    
    set({
      isActive: false,
      clientScanId: null,
      serverScanId: null,
      currentStep: 'capture',
      overallProgress: 0,
      phaseProgress: 0,
      message: '',
      subMessage: '',
      steps: [],
      totalSteps: 0,
      flowType: null, // Réinitialisation du type de flux
      progressHistory: [],
      dynamicProgressIntervalId: null,
      dynamicProgressStepIndex: 0,
      lastSoundThreshold: -1,
    });
    
    const stateAfterReset = get();
    logger.info('PROGRESS_AUDIT', 'resetProgress - AFTER reset', {
      actualOverallProgress: stateAfterReset.overallProgress,
      actualPhaseProgress: stateAfterReset.phaseProgress,
      actualIsActive: stateAfterReset.isActive,
      actualClientScanId: stateAfterReset.clientScanId,
      actualServerScanId: stateAfterReset.serverScanId,
      actualDynamicIntervalId: stateAfterReset.dynamicProgressIntervalId,
      resetSuccessful: stateAfterReset.overallProgress === 0 && !stateAfterReset.isActive,
      philosophy: 'reset_progress_after_reset'
    });
  },

  setProgressActive: (active: boolean) => {
    const state = get();
    logger.info('Setting progress active', { 
      active,
      clientScanId: state.clientScanId,
      serverScanId: state.serverScanId,
      timestamp: new Date().toISOString()
    });
    
    set({ isActive: active });
  },

  startDynamicProcessing: (startPercentage: number, endPercentage: number) => {
    const state = get();
    
    logger.info('PROGRESS_AUDIT', 'startDynamicProcessing called - BEFORE setup', {
      startPercentage,
      endPercentage,
      currentOverallProgress: state.overallProgress,
      currentPhaseProgress: state.phaseProgress,
      currentDynamicIntervalId: state.dynamicProgressIntervalId,
      isActive: state.isActive,
      clientScanId: state.clientScanId,
      flowType: state.flowType, // Log du type de flux
      philosophy: 'start_dynamic_processing_before_setup'
    });
    
    // Stop any existing dynamic processing
    get().stopDynamicProcessing();
    
    // Sélectionne le tableau d'étapes détaillé en fonction du flowType
    const detailedSteps = state.flowType === 'face' ? FACE_SCAN_DETAILED_STEPS : SCAN_STATUS_STEPS;

    logger.info('Starting dynamic processing progression', {
      startPercentage,
      endPercentage,
      totalSteps: detailedSteps.length,
      clientScanId: state.clientScanId,
      flowType: state.flowType,
      philosophy: 'dynamic_scan_progression'
    });
    
    // Calculate progression increment per step
    const totalRange = endPercentage - startPercentage;
    const progressPerStep = totalRange / detailedSteps.length;
    
    // Initialize with first step
    const firstStep = detailedSteps[0];
    set({
      currentStep: 'processing',
      overallProgress: startPercentage,
      phaseProgress: startPercentage,
      message: firstStep.title,
      subMessage: firstStep.subtitle,
      dynamicProgressStepIndex: 0,
      lastUpdateTime: Date.now(),
    });
    
    const stateAfterInit = get();
    logger.info('PROGRESS_AUDIT', 'startDynamicProcessing - AFTER initial state update', {
      setOverallProgress: startPercentage,
      actualOverallProgress: stateAfterInit.overallProgress,
      actualPhaseProgress: stateAfterInit.phaseProgress,
      actualMessage: stateAfterInit.message,
      actualSubMessage: stateAfterInit.subMessage,
      actualCurrentStep: stateAfterInit.currentStep,
      updateSuccessful: stateAfterInit.overallProgress === startPercentage,
      philosophy: 'start_dynamic_processing_after_init_state_update'
    });
    
    // Start interval for dynamic progression
    const intervalId = window.setInterval(() => {
      const currentState = get();
      
      logger.info('PROGRESS_AUDIT', 'Dynamic processing interval tick - BEFORE step update', {
        currentStepIndex: currentState.dynamicProgressStepIndex,
        currentOverallProgress: currentState.overallProgress,
        currentPhaseProgress: currentState.phaseProgress,
        nextStepIndex: currentState.dynamicProgressStepIndex + 1,
        totalSteps: detailedSteps.length,
        clientScanId: currentState.clientScanId,
        philosophy: 'dynamic_interval_tick_before_update'
      });
      
      const nextStepIndex = currentState.dynamicProgressStepIndex + 1;
      
      // Check if we've reached the end
      if (nextStepIndex >= detailedSteps.length) {
        get().stopDynamicProcessing();
        
        // Set final state
        set({
          overallProgress: endPercentage,
          phaseProgress: endPercentage,
          message: 'Analyse IA Terminée',
          subMessage: 'Finalisation des données...',
          lastUpdateTime: Date.now(),
        });
        
        const finalState = get();
        logger.info('PROGRESS_AUDIT', 'Dynamic processing completed - FINAL state', {
          endPercentage,
          actualOverallProgress: finalState.overallProgress,
          actualPhaseProgress: finalState.phaseProgress,
          actualMessage: finalState.message,
          totalStepsCompleted: detailedSteps.length,
          clientScanId: currentState.clientScanId,
          philosophy: 'dynamic_processing_final_state'
        });
        
        logger.info('Dynamic processing completed', {
          finalProgress: endPercentage,
          totalStepsCompleted: detailedSteps.length,
          clientScanId: currentState.clientScanId,
          philosophy: 'dynamic_scan_progression_complete'
        });
        
        return;
      }
      
      // Update to next step
      const nextStep = detailedSteps[nextStepIndex];
      const nextProgress = Math.min(endPercentage, startPercentage + (progressPerStep * (nextStepIndex + 1)));
      
      set({
        overallProgress: nextProgress,
        phaseProgress: nextProgress,
        message: nextStep.title,
        subMessage: nextStep.subtitle,
        dynamicProgressStepIndex: nextStepIndex,
        lastUpdateTime: Date.now(),
      });
      
      const stateAfterUpdate = get();
      logger.info('PROGRESS_AUDIT', 'Dynamic processing step update - AFTER set', {
        requestedProgress: nextProgress,
        actualOverallProgress: stateAfterUpdate.overallProgress,
        actualPhaseProgress: stateAfterUpdate.phaseProgress,
        actualMessage: stateAfterUpdate.message,
        actualSubMessage: stateAfterUpdate.subMessage,
        actualStepIndex: stateAfterUpdate.dynamicProgressStepIndex,
        updateSuccessful: stateAfterUpdate.overallProgress === nextProgress,
        clientScanId: currentState.clientScanId,
        philosophy: 'dynamic_step_update_after_set'
      });
      
      logger.info('Dynamic processing step update', {
        stepIndex: nextStepIndex,
        stepTitle: nextStep.title,
        progress: nextProgress,
        clientScanId: currentState.clientScanId,
        philosophy: 'dynamic_scan_step_progression'
      });
      
    }, 3000); // Update every 3 seconds
    
    set({ dynamicProgressIntervalId: intervalId });
    
    const finalState = get();
    logger.info('PROGRESS_AUDIT', 'startDynamicProcessing - FINAL setup complete', {
      intervalId,
      actualDynamicIntervalId: finalState.dynamicProgressIntervalId,
      actualOverallProgress: finalState.overallProgress,
      actualPhaseProgress: finalState.phaseProgress,
      setupSuccessful: finalState.dynamicProgressIntervalId === intervalId,
      clientScanId: state.clientScanId,
      philosophy: 'start_dynamic_processing_final_setup'
    });
  },
  
  stopDynamicProcessing: () => {
    const state = get();
    
    logger.info('PROGRESS_AUDIT', 'stopDynamicProcessing called - BEFORE cleanup', {
      currentDynamicIntervalId: state.dynamicProgressIntervalId,
      currentOverallProgress: state.overallProgress,
      currentPhaseProgress: state.phaseProgress,
      currentStepIndex: state.dynamicProgressStepIndex,
      clientScanId: state.clientScanId,
      philosophy: 'stop_dynamic_processing_before_cleanup'
    });
    
    if (state.dynamicProgressIntervalId !== null) {
      window.clearInterval(state.dynamicProgressIntervalId);
      
      logger.info('Dynamic processing stopped', {
        intervalId: state.dynamicProgressIntervalId,
        lastStepIndex: state.dynamicProgressStepIndex,
        clientScanId: state.clientScanId,
        philosophy: 'dynamic_scan_progression_stopped'
      });
      
      set({
        dynamicProgressIntervalId: null,
        dynamicProgressStepIndex: 0,
      });
      
      const stateAfterCleanup = get();
      logger.info('PROGRESS_AUDIT', 'stopDynamicProcessing - AFTER cleanup', {
        actualDynamicIntervalId: stateAfterCleanup.dynamicProgressIntervalId,
        actualStepIndex: stateAfterCleanup.dynamicProgressStepIndex,
        actualOverallProgress: stateAfterCleanup.overallProgress,
        actualPhaseProgress: stateAfterCleanup.phaseProgress,
        cleanupSuccessful: stateAfterCleanup.dynamicProgressIntervalId === null,
        clientScanId: state.clientScanId,
        philosophy: 'stop_dynamic_processing_after_cleanup'
      });
    } else {
      logger.info('PROGRESS_AUDIT', 'stopDynamicProcessing called but no interval was active', {
        currentOverallProgress: state.overallProgress,
        currentPhaseProgress: state.overallProgress, // Corrected to use overallProgress for consistency
        clientScanId: state.clientScanId,
        philosophy: 'stop_dynamic_processing_no_interval'
      });
    }
  },

  setOverallProgress: (percentage: number, message: string, subMessage?: string) => {
    const state = get();
    
    logger.info('PROGRESS_AUDIT', 'setOverallProgress called - BEFORE validation and update', {
      inputPercentage: percentage,
      inputPercentageType: typeof percentage,
      inputMessage: message,
      inputSubMessage: subMessage,
      currentOverallProgress: state.overallProgress,
      currentPhaseProgress: state.phaseProgress,
      isActive: state.isActive,
      hasDynamicInterval: state.dynamicProgressIntervalId !== null,
      dynamicIntervalId: state.dynamicProgressIntervalId,
      clientScanId: state.clientScanId,
      philosophy: 'set_overall_progress_before_validation'
    });
    
    // Removed isActive check here, as it's now handled by the caller
    // if (!state.isActive) {
    //   logger.warn('setOverallProgress called but progress not active', { percentage, message });
    //   return;
    // }
    
    // Don't update if dynamic processing is active
    if (state.dynamicProgressIntervalId !== null) {
      logger.warn('PROGRESS_AUDIT', 'setOverallProgress BLOCKED by dynamic processing', { 
        percentage, 
        message,
        dynamicIntervalId: state.dynamicProgressIntervalId,
        currentProgress: state.overallProgress,
        philosophy: 'blocked_by_dynamic_processing'
      });
      return;
    }

    // Validate percentage and default to 0 if invalid (NaN, null, undefined)
    const safePercentage = Number.isFinite(percentage) && !Number.isNaN(percentage) ? 
      Math.max(0, Math.min(100, percentage)) : 0;
    
    logger.info('PROGRESS_AUDIT', 'setOverallProgress - percentage validation', {
      originalPercentage: percentage,
      safePercentage: safePercentage,
      wasValid: Number.isFinite(percentage) && !Number.isNaN(percentage),
      currentOverallProgress: state.overallProgress,
      philosophy: 'percentage_validation_audit'
    });
    
    // Log warning if invalid percentage was passed
    if (!Number.isFinite(percentage) || Number.isNaN(percentage)) {
      logger.warn('Invalid percentage passed to setOverallProgress, defaulting to 0', {
        originalPercentage: percentage,
        percentageType: typeof percentage,
        safePercentage,
        message
      });
    }
    
    // Monotonic guard - only allow progress to increase
    if (safePercentage < state.overallProgress) {
      logger.debug('REJECTED non-monotonic progress update', {
        currentProgress: state.overallProgress,
        requestedProgress: safePercentage,
        message,
        reason: 'progress_would_decrease',
        philosophy: 'monotonic_guard_rejection'
      });
      return;
    }

    // VisionOS26 audio feedback every 3%
    const currentThreshold = Math.floor(safePercentage / 4); // Changed to 4% intervals
    if (currentThreshold > state.lastSoundThreshold && safePercentage > 0) {
      try {
        playSoundLegacy(500, 50); // VisionOS26 subtle progression sound - every 4%
        logger.debug('Progress audio feedback played', {
          percentage: safePercentage,
          threshold: currentThreshold,
          lastThreshold: state.lastSoundThreshold,
          clientScanId: state.clientScanId
        });
      } catch (audioError) {
        logger.warn('Progress audio feedback failed', {
          error: audioError instanceof Error ? audioError.message : 'Unknown error',
          percentage: safePercentage
        });
      }
    }

    const now = Date.now();
    const progressEntry = { step: 'custom', progress: safePercentage, timestamp: now };
    const newHistory = [...state.progressHistory, progressEntry].slice(-MAX_PROGRESS_HISTORY);

    set({
      overallProgress: safePercentage,
      phaseProgress: safePercentage,
      message: message || state.message,
      subMessage: subMessage || state.subMessage,
      lastUpdateTime: now,
      progressHistory: newHistory,
      lastSoundThreshold: currentThreshold > state.lastSoundThreshold && safePercentage > 0 ? currentThreshold : state.lastSoundThreshold,
    });
    
    const newState = get();
    logger.info('PROGRESS_AUDIT', 'setOverallProgress - AFTER state update', {
      requestedPercentage: safePercentage,
      actualOverallProgress: newState.overallProgress,
      actualPhaseProgress: newState.phaseProgress,
      actualMessage: newState.message,
      actualSubMessage: newState.subMessage,
      updateSuccessful: newState.overallProgress === safePercentage,
      clientScanId: state.clientScanId,
      philosophy: 'set_overall_progress_after_state_update'
    });

    logger.info(`Overall progress: ${safePercentage}%`, {
      clientScanId: state.clientScanId,
      message,
      subMessage,
      timestamp: new Date().toISOString()
    });
  },

  incrementProgress: (increment: number, message?: string, subMessage?: string) => {
    const state = get();
    
    logger.info('PROGRESS_AUDIT', 'incrementProgress called - BEFORE calculation', {
      increment,
      currentOverallProgress: state.overallProgress,
      currentPhaseProgress: state.phaseProgress,
      isActive: state.isActive,
      clientScanId: state.clientScanId,
      philosophy: 'increment_progress_before_calculation'
    });
    
    // Removed isActive check here, as it's now handled by the caller
    // if (!state.isActive) {
    //   logger.warn('incrementProgress called but progress not active', { increment, message });
    //   return;
    // }

    const newProgress = Math.min(100, state.overallProgress + increment);
    
    logger.info('PROGRESS_AUDIT', 'incrementProgress - calculated new progress', {
      increment,
      currentProgress: state.overallProgress,
      calculatedNewProgress: newProgress,
      willCallSetOverallProgress: true,
      clientScanId: state.clientScanId,
      philosophy: 'increment_progress_calculation'
    });
    
    get().setOverallProgress(newProgress, message || state.message, subMessage || state.subMessage);
  },
}));
