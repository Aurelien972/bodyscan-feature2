// src/app/pages/FaceScan/FaceScanCelebrationStep.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import GlassCard from '../../../ui/cards/GlassCard';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useFeedback } from '../../../hooks/useFeedback';
import { useProgressStore } from '../../../system/store/progressStore';
import logger from '../../../lib/utils/logger';

/**
 * Face Scan Celebration Step - VisionOS 26 Premium
 * Affiche une célébration avec confettis après le traitement réussi du scan facial
 */
const FaceScanCelebrationStep: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { avatarReveal, success } = useFeedback();
  const { completeProgress } = useProgressStore();
  
  // Prevent infinite loops by tracking initialization
  const hasInitialized = React.useRef(false);
  
  // Get scan results from navigation state
  const scanResults = location.state?.scanResults;

  // Redirect if no scan results
  React.useEffect(() => {
    // Prevent multiple executions
    if (hasInitialized.current) return;
    
    if (!scanResults) {
      navigate('/face-scan', { replace: true });
      return;
    }
    
    // Trigger celebration effects only once
    avatarReveal();
    completeProgress();
    hasInitialized.current = true;
    
    logger.info('FACE_CELEBRATION', 'Celebration step mounted with face scan results', {
      hasResults: !!scanResults,
      confidence: getConfidenceFromScanResults(scanResults),
    });
  }, [scanResults, navigate, avatarReveal, completeProgress]);

  if (!scanResults) {
    return null;
  }

  // FIXED: Extract confidence from multiple possible sources
  const confidence = getConfidenceFromScanResults(scanResults);
  const score = confidence;

  const getCelebrationContent = () => {
    if (score >= 0.9) {
      return {
        title: '🌟 Visage Capturé Parfaitement !',
        subtitle: 'Votre visage a été scanné avec une précision exceptionnelle',
        celebrationMessage: 'Fidélité Faciale Atteinte',
        motivationalQuote: 'Votre reflet numérique facial est d\'une fidélité saisissante',
        color: '#18E3FF', // Plasma Cyan
        icon: ICONS.Zap,
        particleCount: 12,
        celebrationLevel: 'legendary'
      };
    } else if (score >= 0.7) {
      return {
        title: '✨ Scan Facial Exceptionnel !',
        subtitle: 'Votre avatar facial sera d\'une qualité remarquable',
        celebrationMessage: 'Excellence Faciale Détectée',
        motivationalQuote: 'Préparez-vous à découvrir votre double numérique facial parfait',
        color: '#06B6D4', // Cyan
        icon: ICONS.Check,
        particleCount: 10,
        celebrationLevel: 'exceptional'
      };
    } else if (score >= 0.5) {
      return {
        title: '🎯 Scan Facial de Haute Qualité !',
        subtitle: 'Votre visage a été analysé avec précision',
        celebrationMessage: 'Analyse Faciale Premium Réussie',
        motivationalQuote: 'Votre avatar 3D facial sera fidèle à vos traits uniques',
        color: '#10B981', // Vert
        icon: ICONS.Target,
        particleCount: 8,
        celebrationLevel: 'high'
      };
    } else if (score > 0) {
      return {
        title: '🚀 Scan Facial Réussi avec Brio !',
        subtitle: 'Votre avatar facial est prêt avec des optimisations intelligentes',
        celebrationMessage: 'IA d\'Optimisation Faciale Activée',
        motivationalQuote: 'Notre intelligence artificielle a perfectionné votre scan facial',
        color: '#F59E0B', // Orange
        icon: ICONS.Zap,
        particleCount: 6,
        celebrationLevel: 'optimized'
      };
    } else {
      // No confidence data available
      return {
        title: '🎉 Avatar Facial Créé !',
        subtitle: 'Votre reflet numérique facial est prêt à être découvert',
        celebrationMessage: 'Scan Facial Terminé avec Succès',
        motivationalQuote: 'Explorez votre avatar 3D facial personnalisé',
        color: '#8B5CF6', // Violet
        icon: ICONS.Eye,
        particleCount: 6,
        celebrationLevel: 'complete'
      };
    }
  };

  const celebration = getCelebrationContent();

  const handleDiscoverAvatar = () => {
    success();
    // MODIFIED: Redirection directe vers la page avatar principale
    navigate('/avatar#avatar', { 
      replace: false
    });
  };

  return (
    <div className="relative overflow-visible pt-4 pb-12 md:pb-16">
      {/* Celebration Background Effects */}
      <div className="celebration-background-effects absolute inset-0 pointer-events-none overflow-visible">
        {/* Ambient Glow Background */}
        <div
          className="celebration-ambient-glow absolute inset-0 rounded-3xl"
          style={{
            background: `radial-gradient(circle at center, ${celebration.color}15, transparent 70%)`,
            '--celebration-color': celebration.color
          }}
        />

        {/* Floating Celebration Particles */}
        {[...Array(celebration.particleCount)].map((_, i) => (
          <div
            key={i}
            className={`celebration-particle celebration-particle--${i + 1} absolute w-3 h-3 rounded-full`}
            style={{
              background: `radial-gradient(circle, ${celebration.color}, ${celebration.color}80)`,
              left: `${15 + i * 8}%`,
              top: `${20 + (i % 4) * 15}%`,
              boxShadow: `0 0 12px ${celebration.color}80, 0 0 24px ${celebration.color}40`,
              '--celebration-color': celebration.color,
              '--particle-index': i
            }}
          />
        ))}

        {/* Celebration Rays */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`ray-${i}`}
            className={`celebration-ray celebration-ray--${i + 1} absolute w-1 h-20 rounded-full`}
            style={{
              background: `linear-gradient(180deg, ${celebration.color}60, transparent)`,
              left: `${30 + i * 12}%`,
              top: '10%',
              transformOrigin: 'bottom center',
              '--celebration-color': celebration.color
            }}
          />
        ))}
      </div>

      {/* Main Celebration Content */}
      <div className="celebration-main-content relative text-center py-8 md:py-12 z-10">
        {/* Central Celebration Icon with Multi-Layer Effects */}
        <motion.div
          className="relative w-32 h-32 mx-auto mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 200, 
            damping: 15,
            duration: 1.2
          }}
        >
          {/* Outer Glow Ring */}
          <div
            className="celebration-icon-outer-glow absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${celebration.color}40, transparent 70%)`,
              filter: `blur(8px)`,
              '--celebration-color': celebration.color
            }}
          />

          {/* Inner Icon Container */}
          <div
            className="celebration-icon-inner-container absolute inset-8 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${celebration.color}30, ${celebration.color}60)`,
              border: `2px solid ${celebration.color}`,
              boxShadow: `0 0 60px ${celebration.color}90, inset 0 4px 0 rgba(255,255,255,0.3)`,
              '--celebration-color': celebration.color
            }}
          >
            <SpatialIcon Icon={celebration.icon} size={48} color={celebration.color} />
          </div>

          {/* Pulse Rings */}
          {[...Array(3)].map((_, i) => (
            <div
              key={`pulse-${i}`}
              className={`celebration-icon-pulse-ring celebration-icon-pulse-ring--${i + 1} absolute inset-0 rounded-full border-2`}
              style={{ 
                borderColor: `${celebration.color}40`,
                '--celebration-color': celebration.color
              }}
            />
          ))}
        </motion.div>
        
        {/* Celebration Text - Optimized for Above the Fold */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <motion.h3
            className="celebration-title-glow text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ color: celebration.color }}
          >
            {celebration.title}
          </motion.h3>
          
          <motion.p
            className="text-xl text-white/90 mb-6 leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {celebration.subtitle}
          </motion.p>
        </motion.div>
      </div>

      {/* Call to Action */}
      <motion.div
        className="flex justify-center relative z-10 mt-4"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.8 }}
      >
        <motion.button
          onClick={handleDiscoverAvatar}
          className="btn-glass--primary px-12 py-6 text-xl font-bold relative overflow-hidden"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: `linear-gradient(135deg, ${celebration.color}80, ${celebration.color}60)`,
            boxShadow: `0 12px 40px ${celebration.color}40, 0 0 60px ${celebration.color}30`,
            border: `2px solid ${celebration.color}`,
            color: '#0B0F1A'
          }}
        >
          {/* Shimmer Effect */}
          <div
            className="celebration-cta-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
          
          {/* Celebration Sparkles */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`celebration-cta-sparkle celebration-cta-sparkle--${i + 1} absolute w-2 h-2 rounded-full bg-white`}
              style={{
                left: `${20 + i * 20}%`,
                top: `${30 + (i % 2) * 40}%`
              }}
            />
          ))}
          
          <div className="relative flex items-center justify-center gap-4">
            <SpatialIcon Icon={ICONS.Eye} size={28} color="#0B0F1A" />
            <span>Mon Avatar 3D</span>
          </div>
        </motion.button>
      </motion.div>

      {/* Celebration Confetti Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {[...Array(8)].map((_, i) => (
          <div
            key={`confetti-${i}`}
            className={`celebration-confetti celebration-confetti--${i + 1} absolute w-2 h-6 rounded-full`}
            style={{
              background: `linear-gradient(180deg, ${celebration.color}, ${celebration.color}60)`,
              left: `${10 + i * 10}%`,
              top: '-10%',
              '--celebration-color': celebration.color
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Extract confidence from scan results with fallback strategy
 */
function getConfidenceFromScanResults(scanResults: any): number {
  // PRIORITY 1: AI refinement confidence (most accurate after complete processing)
  const aiRefinementConfidence = scanResults?.match?.ai_refinement?.ai_confidence;
  if (typeof aiRefinementConfidence === 'number' && Number.isFinite(aiRefinementConfidence) && aiRefinementConfidence > 0 && aiRefinementConfidence <= 1) {
    logger.debug('FACE_CELEBRATION', 'Using AI refinement confidence (highest priority)', {
      confidence: aiRefinementConfidence,
      source: 'ai_refinement.ai_confidence',
      clientScanId: scanResults?.clientScanId,
      serverScanId: scanResults?.serverScanId,
      philosophy: 'ai_refinement_confidence_priority'
    });
    return aiRefinementConfidence;
  }
  
  // Try other sources for confidence with proper validation (fallback hierarchy)
  const sources = [
    scanResults?.match?.semantic_coherence_score,
    scanResults?.estimate?.extracted_data?.processing_confidence,
    scanResults?.insights?.confidence,
    scanResults?.estimate?.confidence?.vision,
    scanResults?.semantic?.semantic_confidence,
    scanResults?.commit?.confidence,
    scanResults?.blending?.confidence
  ];
  
  for (const source of sources) {
    if (typeof source === 'number' && Number.isFinite(source) && source > 0 && source <= 1) {
      logger.debug('FACE_CELEBRATION', 'Found valid confidence from fallback source', {
        confidence: source,
        source: 'fallback_hierarchy',
        clientScanId: scanResults?.clientScanId,
        serverScanId: scanResults?.serverScanId,
        philosophy: 'fallback_confidence_used'
      });
      return source;
    }
  }
  
  logger.warn('FACE_CELEBRATION', 'No valid confidence found in scan results (including AI refinement)', {
    clientScanId: scanResults?.clientScanId,
    serverScanId: scanResults?.serverScanId,
    sourcesChecked: [
      { source: 'ai_refinement.ai_confidence', value: aiRefinementConfidence, type: typeof aiRefinementConfidence, isValid: typeof aiRefinementConfidence === 'number' && Number.isFinite(aiRefinementConfidence) && aiRefinementConfidence > 0 && aiRefinementConfidence <= 1 },
      ...sources.map((s, i) => ({ index: i, value: s, type: typeof s, isValid: typeof s === 'number' && Number.isFinite(s) && s > 0 && s <= 1 }))
    ],
    philosophy: 'no_confidence_found_comprehensive_check'
  });
  
  // Return 0 if no valid confidence found (will hide score display in UI)
  return 0;
}

export default FaceScanCelebrationStep;

