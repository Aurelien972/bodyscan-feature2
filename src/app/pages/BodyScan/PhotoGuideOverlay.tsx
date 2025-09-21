import React from 'react';
import { motion } from 'framer-motion';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';

interface PhotoGuideOverlayProps {
  type: 'front' | 'profile';
  isFaceScan?: boolean; // NOUVEAU: Prop pour indiquer si c'est un scan facial
}

const PhotoGuideOverlay: React.FC<PhotoGuideOverlayProps> = ({ type, isFaceScan = false }) => {
  const renderFrontGuide = () => (
    <div className="text-center space-y-4">
      {/* Simplified modern guide */}
      <div className="relative w-32 h-40 mx-auto">
        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-blue-400/30 bg-blue-500/5">
          {/* Simple body outline */}
          {/* MODIFIED: Guides spécifiques au visage ou au corps */}
          {isFaceScan ? (
            <>
              {/* Face outline */}
              <div className="absolute top-1/4 left-1/2 w-1/2 h-1/2 -translate-x-1/2 rounded-full border-2 border-blue-400/50" />
              <div className="absolute top-1/2 left-1/2 w-1/4 h-1/4 -translate-x-1/2 rounded-full border-2 border-blue-400/50" />
            </>
          ) : (
            <>
              {/* Body outline */}
              <div className="absolute top-3 left-1/2 w-4 h-4 -translate-x-1/2 rounded-full border-2 border-blue-400/50" />
              <div className="absolute top-8 left-1/2 w-8 h-12 -translate-x-1/2 rounded-lg border-2 border-blue-400/50" />
              <div className="absolute top-20 left-1/2 w-6 h-16 -translate-x-1/2 rounded-lg border-2 border-blue-400/50" />
            </>
          )}
          
          {/* Breathing animation */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-blue-400/20"
            animate={{ scale: [1, 1.02, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-white/80 text-sm font-medium">Position face</p>
        <div className="space-y-1 text-xs text-white/60">
          {/* MODIFIED: Instructions spécifiques au visage ou au corps */}
          {isFaceScan ? (
            <>
              <p>• Regardez l'objectif</p>
              <p>• Visage au centre du cadre</p>
              <p>• Expression neutre</p>
            </>
          ) : (
            <>
              <p>• Regardez l'objectif</p>
              <p>• Bras légèrement décollés</p>
              <p>• Posture droite</p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfileGuide = () => (
    <div className="text-center space-y-4">
      {/* Simplified modern guide */}
      <div className="relative w-32 h-40 mx-auto">
        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-purple-400/30 bg-purple-500/5">
          {/* Simple profile outline */}
          {/* MODIFIED: Guides spécifiques au visage ou au corps */}
          {isFaceScan ? (
            <>
              {/* Face profile outline */}
              <div className="absolute top-1/4 right-1/4 w-1/2 h-1/2 rounded-full border-2 border-purple-400/50" />
              <div className="absolute top-1/2 right-1/4 w-1/4 h-1/4 rounded-full border-2 border-purple-400/50" />
            </>
          ) : (
            <>
              {/* Body profile outline */}
              <div className="absolute top-3 right-6 w-4 h-4 rounded-full border-2 border-purple-400/50" />
              <div className="absolute top-8 right-4 w-6 h-12 rounded-lg border-2 border-purple-400/50" />
              <div className="absolute top-20 right-5 w-4 h-16 rounded-lg border-2 border-purple-400/50" />
            </>
          )}
          
          {/* 90° indicator */}
          <div className="absolute top-2 left-2 text-purple-400 text-xs font-bold bg-purple-500/20 px-2 py-1 rounded">
            90°
          </div>
          
          {/* Breathing animation */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-purple-400/20"
            animate={{ scale: [1, 1.02, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-white/80 text-sm font-medium">Position profil</p>
        <div className="space-y-1 text-xs text-white/60">
          {/* MODIFIED: Instructions spécifiques au visage ou au corps */}
          {isFaceScan ? (
            <>
              <p>• Tournez-vous de 90°</p>
              <p>• Regardez droit devant</p>
              <p>• Visage au centre du cadre</p>
            </>
          ) : (
            <>
              <p>• Tournez-vous à 90°</p>
              <p>• Même distance que face</p>
              <p>• Bras visible</p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {type === 'front' ? renderFrontGuide() : renderProfileGuide()}
    </div>
  );
};

export default PhotoGuideOverlay;

