/**
 * Loading Overlay Component
 * Loading state display for 3D viewer
 */

import React from 'react';
import { motion } from 'framer-motion';
import SpatialIcon from '../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../ui/icons/registry';

interface LoadingOverlayProps {
  isLoading: boolean;
}

/**
 * Loading overlay component for 3D viewer
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
      <div className="text-center space-y-4">
        <motion.div
          className="w-12 h-12 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <SpatialIcon Icon={ICONS.Loader2} size={24} className="text-purple-400" />
        </motion.div>
        <div>
          <h4 className="text-white font-semibold mb-1">Chargement de votre avatar</h4>
          <p className="text-white/60 text-sm">Initialisation du moteur 3D...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;