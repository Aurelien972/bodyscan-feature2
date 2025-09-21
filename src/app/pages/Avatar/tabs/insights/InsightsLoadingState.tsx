/**
 * Insights Loading State Component
 * Loading state for insights generation
 */

import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';

/**
 * Loading state component for insights
 */
export const InsightsLoadingState: React.FC = () => {
  return (
    <div className="space-y-6 profile-section-container">
      <GlassCard className="text-center p-8">
        <motion.div
          className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <SpatialIcon Icon={ICONS.Loader2} size={32} className="text-yellow-400 animate-spin" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-yellow-400/30"
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
        
        <h3 className="text-xl font-bold text-white mb-3">Génération d'insights IA...</h3>
        <p className="text-white/70 text-sm leading-relaxed">
          Notre intelligence artificielle analyse votre morphologie pour générer des recommandations personnalisées
        </p>
      </GlassCard>
    </div>
  );
};