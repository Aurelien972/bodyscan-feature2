/**
 * No Scan State Component
 * State when no avatar scan is available
 */

import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';

/**
 * No scan state component
 */
export const NoScanState: React.FC = () => {
  return (
    <div className="space-y-6 profile-section-container">
      <GlassCard className="text-center p-8">
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
          Aucun scan disponible
        </h3>
        <p className="text-white/70 text-sm mb-6 leading-relaxed max-w-md mx-auto">
          Effectuez un scan corporel pour débloquer vos insights morphologiques personnalisés 
          générés par notre intelligence artificielle.
        </p>
        
        <button 
          className="btn-glass--primary px-8 py-4 text-lg font-semibold"
          onClick={() => window.location.href = '/body-scan'}
        >
          <div className="flex items-center justify-center gap-3">
            <SpatialIcon Icon={ICONS.Camera} size={20} />
            <span>Commencer le scan corporel</span>
          </div>
        </button>
      </GlassCard>
    </div>
  );
};