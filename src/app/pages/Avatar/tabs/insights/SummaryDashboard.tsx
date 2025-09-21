/**
 * Summary Dashboard Component
 * AI Summary dashboard for morphology insights
 */

import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';
import type { InsightsResponse } from './types';

interface SummaryDashboardProps {
  summary: InsightsResponse['summary'];
}

/**
 * AI Summary Dashboard Component
 */
export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ summary }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <GlassCard className="p-6 glass-card--summary">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <SpatialIcon Icon={ICONS.BarChart3} size={16} className="text-yellow-400" />
            Tableau de bord morphologique
          </h3>
          
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/30">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-yellow-300 text-xs font-medium">Analyse IA</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-blue-500/5 border border-blue-400/15">
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {Math.round(summary.morphology_score * 100)}%
            </div>
            <div className="text-blue-300 text-sm">Score Morphologique</div>
          </div>
          
          <div className="text-center p-4 rounded-xl bg-green-500/5 border border-green-400/15">
            <div className="text-2xl font-bold text-green-400 mb-2">
              {Math.round(summary.goal_alignment * 100)}%
            </div>
            <div className="text-green-300 text-sm">Alignement Objectifs</div>
          </div>
          
          <div className="text-center p-4 rounded-xl bg-purple-500/5 border border-purple-400/15">
            <div className="text-2xl font-bold text-purple-400 mb-2">
              {Math.round(summary.health_indicators * 100)}%
            </div>
            <div className="text-purple-300 text-sm">Indicateurs Santé</div>
          </div>
          
          <div className="text-center p-4 rounded-xl bg-orange-500/5 border border-orange-400/15">
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {summary.recommendations_count}
            </div>
            <div className="text-orange-300 text-sm">Recommandations</div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};