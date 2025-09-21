/**
 * Insight Card Component
 * Individual insight display card
 */

import React from 'react';
import { motion } from 'framer-motion';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';
import type { MorphInsight } from './types';

interface InsightCardProps {
  insight: MorphInsight;
  index: number;
}

/**
 * Get type icon for insight
 */
function getTypeIcon(type: string) {
  switch (type) {
    case 'recommendation': return ICONS.Target;
    case 'observation': return ICONS.Eye;
    case 'achievement': return ICONS.Check;
    case 'goal_progress': return ICONS.TrendingUp;
    default: return ICONS.Info;
  }
}

/**
 * Get type color for insight
 */
function getTypeColor(type: string) {
  switch (type) {
    case 'recommendation': return '#10B981';
    case 'observation': return '#06B6D4';
    case 'achievement': return '#22C55E';
    case 'goal_progress': return '#8B5CF6';
    default: return '#6B7280';
  }
}

/**
 * Individual Insight Card Component
 */
export const InsightCard: React.FC<InsightCardProps> = ({ insight, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="p-4 rounded-xl border transition-all hover:scale-105 cursor-pointer"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }}
      whileHover={{ 
        y: -2,
        boxShadow: `0 8px 32px color-mix(in srgb, ${insight.color} 20%, transparent)`
      }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `color-mix(in srgb, ${insight.color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${insight.color} 20%, transparent)`,
          }}
        >
          <SpatialIcon Icon={ICONS[insight.icon]} size={18} color={insight.color} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h5 className="font-semibold text-sm" style={{ color: insight.color }}>
              {insight.title}
            </h5>
            {insight.value && (
              <span 
                className="text-xs font-bold px-2 py-1 rounded-full"
                style={{ 
                  color: insight.color,
                  background: `color-mix(in srgb, ${insight.color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${insight.color} 20%, transparent)`
                }}
              >
                {insight.value}
              </span>
            )}
          </div>
          
          <p className="text-white/80 text-xs leading-relaxed mb-3">
            {insight.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SpatialIcon 
                Icon={getTypeIcon(insight.type)} 
                size={12} 
                color={getTypeColor(insight.type)} 
              />
              <span className="text-xs font-medium" style={{ color: getTypeColor(insight.type) }}>
                {insight.type === 'recommendation' ? 'Recommandation' :
                 insight.type === 'observation' ? 'Observation' :
                 insight.type === 'achievement' ? 'Réussite' :
                 insight.type === 'goal_progress' ? 'Progression' : 'Info'}
              </span>
            </div>
            
            {insight.confidence && (
              <div className="text-xs text-white/50">
                {Math.round(insight.confidence * 100)}% confiance
              </div>
            )}
          </div>
          
          {insight.actionable && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button 
                className="text-xs font-medium hover:underline transition-colors"
                style={{ color: insight.color }}
              >
                {insight.actionable.action}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};