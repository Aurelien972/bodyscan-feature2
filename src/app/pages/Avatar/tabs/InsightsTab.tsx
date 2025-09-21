import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import GlassCard from '../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../ui/icons/registry';
import { useProfileAvatarData } from '../../Profile/hooks/useProfileAvatarData';
import { useUserStore } from '../../../../system/store/userStore';
import { generateMorphologyInsights } from './insights/insightsService';
import { InsightCard } from './insights/InsightCard';
import { MockInsightsDisplay } from './insights/MockInsightsDisplay';
import { InsightsLoadingState } from './insights/InsightsLoadingState';
import { InsightsErrorState } from './insights/InsightsErrorState';
import { NoScanState } from './insights/NoScanState';
import { SummaryDashboard } from './insights/SummaryDashboard';
import logger from '../../../../lib/utils/logger';

/**
 * Insights Tab - AI-Powered Morphology Analysis
 * Provides personalized insights, recommendations, and goal tracking
 */
const InsightsTab: React.FC = () => {
  const { latestScanData, isLoading: scanLoading } = useProfileAvatarData();
  const { profile } = useUserStore();

  // Generate AI insights based on scan data and user profile
  const { 
    data: insightsData, 
    isLoading: insightsLoading, 
    error: insightsError 
  } = useQuery({
    queryKey: ['morph-insights', profile?.userId, latestScanData?.scanId],
    queryFn: () => generateMorphologyInsights(latestScanData, profile),
    enabled: !!(latestScanData?.hasSavedMorph && profile?.userId),
    staleTime: Infinity, // Cache indefinitely until scanId changes
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnMount: false, // Disable refetch on component mount
    refetchOnReconnect: false, // Disable refetch on network reconnect
    retry: 1, // Reduce retry attempts
  });

  // Loading state
  if (scanLoading || insightsLoading) {
    return <InsightsLoadingState />;
  }

  // Error state
  if (insightsError) {
    return <InsightsErrorState error={insightsError} />;
  }

  // No saved avatar state
  if (!latestScanData?.hasSavedMorph) {
    return <NoScanState />;
  }

  // Main insights display
  const insights = insightsData?.insights || [];
  const summary = insightsData?.summary;

  return (
    <div className="space-y-8 profile-section-container">
      {/* AI Summary Dashboard */}
      {summary && <SummaryDashboard summary={summary} />}

      {/* Insights Categories */}
      {insights.length > 0 && (
        <div className="space-y-6">
          {/* High Priority Insights */}
          {insights.filter(insight => insight.priority === 'high').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <GlassCard className="p-6 glass-card--priority">
                <h4 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <SpatialIcon Icon={ICONS.Zap} size={16} className="text-red-400" />
                  Insights prioritaires
                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                    Haute priorité
                  </span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights
                    .filter(insight => insight.priority === 'high')
                    .map((insight, index) => (
                      <InsightCard key={insight.id} insight={insight} index={index} />
                    ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Morphology Insights */}
          {insights.filter(insight => insight.category === 'morphology').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <GlassCard className="p-6">
                <h4 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <SpatialIcon Icon={ICONS.Eye} size={16} className="text-purple-400" />
                  Analyse morphologique
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights
                    .filter(insight => insight.category === 'morphology')
                    .map((insight, index) => (
                      <InsightCard key={insight.id} insight={insight} index={index} />
                    ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Fitness & Goals Insights */}
          {insights.filter(insight => ['fitness', 'goals'].includes(insight.category)).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <GlassCard className="p-6">
                <h4 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <SpatialIcon Icon={ICONS.Target} size={16} className="text-green-400" />
                  Objectifs & Fitness
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights
                    .filter(insight => ['fitness', 'goals'].includes(insight.category))
                    .map((insight, index) => (
                      <InsightCard key={insight.id} insight={insight} index={index} />
                    ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Health & Nutrition Insights */}
          {insights.filter(insight => ['health', 'nutrition'].includes(insight.category)).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <GlassCard className="p-6">
                <h4 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <SpatialIcon Icon={ICONS.Heart} size={16} className="text-pink-400" />
                  Santé & Nutrition
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights
                    .filter(insight => ['health', 'nutrition'].includes(insight.category))
                    .map((insight, index) => (
                      <InsightCard key={insight.id} insight={insight} index={index} />
                    ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      )}

      {/* Fallback: Mock insights for development */}
      {!insightsData && !insightsLoading && !insightsError && (
        <MockInsightsDisplay 
          userProfile={profile} 
          scanData={latestScanData} 
        />
      )}
      
      {/* Nouveau Scan Button */}
      <div className="mt-8 text-center">
        <button 
          className="btn-glass--primary px-8 py-4 text-lg font-semibold"
          onClick={() => window.location.href = '/body-scan'}
        >
          <div className="flex items-center justify-center gap-3">
            <SpatialIcon Icon={ICONS.Scan} size={20} />
            <span>Nouveau scan corporel</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default InsightsTab;