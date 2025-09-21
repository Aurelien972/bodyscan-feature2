import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Avatar3DViewer from '../../../../components/3d/Avatar3DViewer';
import GlassCard from '../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../ui/icons/registry';
import { useProfileAvatarData } from '../../Profile/hooks/useProfileAvatarData';
import { isSkinToneV2, type SkinToneV2 } from '../../../../lib/scan/normalizeSkinTone';
import MorphologyInsightsCard from './components/MorphologyInsightsCard';
import logger from '../../../../lib/utils/logger';

/**
 * Avatar Tab - Viewer 3D avec ajustements fins
 * Permet la visualisation et l'ajustement subtil de l'avatar corporel
 */
const AvatarTab: React.FC = () => {
  const navigate = useNavigate();
  
  // Use existing avatar data hook
  const { latestScanData, isLoading, error, profile } = useProfileAvatarData(); // Ajout de 'profile'
  // MODIFIED: showFaceScanFlow n'est plus nécessaire ici car nous naviguons vers une page dédiée
  // const [showFaceScanFlow, setShowFaceScanFlow] = useState(false); 

  // Déterminer si un scan facial existe déjà
  const hasFaceScan = !!profile?.preferences?.face?.final_face_params;

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6 profile-section-container">
        <GlassCard className="text-center p-8">
          <motion.div
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <SpatialIcon Icon={ICONS.Loader2} size={32} className="text-purple-400 animate-spin" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-purple-400/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          
          <h3 className="text-xl font-bold text-white mb-3">Chargement de votre avatar...</h3>
          <p className="text-white/70 text-sm leading-relaxed">
            Préparation de l'expérience 3D...
          </p>
        </GlassCard>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6 profile-section-container">
        <GlassCard className="text-center p-8">
          <motion.div
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <SpatialIcon Icon={ICONS.AlertCircle} size={32} color="#EF4444" />
          </motion.div>
          
          <h3 className="text-xl font-bold text-white mb-3">Erreur de chargement</h3>
          <p className="text-red-300 text-sm mb-6 leading-relaxed max-w-md mx-auto">
            {error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement de votre avatar.'}
          </p>
          
          <button 
            className="btn-glass px-6 py-3"
            onClick={() => window.location.reload()}
          >
            <div className="flex items-center justify-center gap-2">
              <SpatialIcon Icon={ICONS.RotateCcw} size={16} />
              <span>Actualiser</span>
            </div>
          </button>
        </GlassCard>
      </div>
    );
  }

  // Handle no saved avatar (onboarding)
  if (!latestScanData || !latestScanData.hasSavedMorph) {
    return (
      <div className="space-y-6 profile-section-container">
        <GlassCard className="text-center p-8" interactive>
          <motion.div
            className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-6 relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <SpatialIcon Icon={ICONS.Scan} size={40} className="text-blue-400" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-400/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          
          <h3 className="text-2xl font-bold text-white mb-3">
            Aucun avatar corporel
          </h3>
          <p className="text-white/70 text-sm mb-6 leading-relaxed max-w-md mx-auto">
            Effectuez un scan corporel pour créer votre avatar 3D personnalisé.
            Une fois satisfait du résultat, sauvegardez-le pour qu'il apparaisse ici.
          </p>
          
          <button 
            className="btn-glass--primary px-8 py-4 text-lg font-semibold"
            onClick={() => navigate('/body-scan')}
          >
            <div className="flex items-center justify-center gap-3">
              <SpatialIcon Icon={ICONS.Camera} size={20} />
              <span>Commencer le scan corporel</span>
            </div>
          </button>
        </GlassCard>
      </div>
    );
  }

  // Main avatar display with adjustments
  const {
    finalShapeParams,
    finalLimbMasses,
    skinTone,
    resolvedGender,
    userProfile,
    avatarVersion,
  } = latestScanData;

  // Use new structure if available, fallback to legacy
  const displayMorphData = finalShapeParams || latestScanData.morphData || {};
  const displaySkinTone = skinTone;
  const displayGender = resolvedGender || userProfile.sex;

  // Récupérer les morphs faciaux depuis le profil utilisateur
  const faceMorphData = profile?.preferences?.face?.final_face_params || {};
  const faceSkinTone = profile?.preferences?.face?.skin_tone || null;

  return (
    <div className="space-y-8 profile-section-container">
      {/* Masquer le composant de scan facial pour le MVP */}
      {/* {!hasFaceScan ? (
        <GlassCard 
          className="p-6 text-center glass-card--new-user-avatar"
          interactive
          onClick={() => navigate('/face-scan')} // MODIFIED: Naviguer vers la page dédiée
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <SpatialIcon Icon={ICONS.Scan} size={32} className="text-blue-400" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-400/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          <h3 className="text-xl font-bold text-white mb-2">
            Créez votre visage 3D !
          </h3>
          <p className="text-white/70 text-sm">
            Scannez votre visage pour un avatar encore plus réaliste.
          </p>
        </GlassCard>
      ) : (
        <div className="flex justify-end">
          <button 
            onClick={() => navigate('/face-scan')} // MODIFIED: Naviguer vers la page dédiée
            className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
          >
            <SpatialIcon Icon={ICONS.Scan} size={16} />
            <span>Mettre à jour le visage</span>
          </button>
        </div>
      )} */}
      {null /* Composant de scan facial masqué pour le MVP */}

      {/* 3D Avatar Viewer */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <SpatialIcon Icon={ICONS.Eye} size={16} className="text-purple-400" />
            Votre Avatar 3D
          </h3>
          
          {avatarVersion && (
            <div className="text-right">
              <div className="text-white/40 text-xs">
                Version {avatarVersion}
              </div>
            </div>
          )}
        </div>
        
        <div className="h-[400px] sm:h-[500px] lg:h-[600px] rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-400/20 relative overflow-hidden">
          <Avatar3DViewer
            userProfile={userProfile}
            morphData={displayMorphData}
            limbMasses={latestScanData.finalLimbMasses || latestScanData.morphData}
            skinTone={displaySkinTone}
            resolvedGender={displayGender}
            faceMorphData={faceMorphData} // Nouveau: Passer les morphs faciaux
            faceSkinTone={faceSkinTone} // Nouveau: Passer le skin tone facial
            className="w-full h-full"
            autoRotate={true}
            showControls={true}
          />
        </div>
      </GlassCard>
      
      {/* Morphology Insights */}
      {latestScanData.finalShapeParams && (
        <MorphologyInsightsCard
          finalShapeParams={latestScanData.finalShapeParams}
          resolvedGender={displayGender}
          userProfile={userProfile}
        />
      )}
      
      {/* Nouveau Scan Button */}
      <div className="mt-8 text-center">
        <button 
          className="btn-glass--primary px-8 py-4 text-lg font-semibold"
          onClick={() => navigate('/body-scan')}
        >
          <div className="flex items-center justify-center gap-3">
            <SpatialIcon Icon={ICONS.Scan} size={20} />
            <span>Nouveau scan corporel</span>
          </div>
        </button>
      </div>

      {/* MODIFIED: La modale FaceScanFlow n'est plus rendue ici */}
      {/* {showFaceScanFlow && (
        <FaceScanFlow 
          onClose={() => setShowFaceScanFlow(false)} 
          onScanComplete={() => {
            setShowFaceScanFlow(false);
          }} 
        />
      )} */}
    </div>
  );
};

export default AvatarTab;
