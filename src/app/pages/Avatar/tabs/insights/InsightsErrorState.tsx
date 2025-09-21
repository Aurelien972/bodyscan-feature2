/**
 * Insights Error State Component
 * Error state for insights generation
 */

import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';

interface InsightsErrorStateProps {
  error: Error;
}

/**
 * Error state component for insights
 */
export const InsightsErrorState: React.FC<InsightsErrorStateProps> = ({ error }) => {
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
        
        <h3 className="text-xl font-bold text-white mb-3">Erreur de génération d'insights</h3>
        <p className="text-red-300 text-sm mb-6 leading-relaxed max-w-md mx-auto">
          {error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération des insights IA.'}
        </p>
        
        <button 
          className="btn-glass px-6 py-3"
          onClick={() => window.location.reload()}
        >
          <div className="flex items-center justify-center gap-2">
            <SpatialIcon Icon={ICONS.RotateCcw} size={16} />
            <span>Réessayer</span>
          </div>
        </button>
      </GlassCard>
    </div>
  );
};