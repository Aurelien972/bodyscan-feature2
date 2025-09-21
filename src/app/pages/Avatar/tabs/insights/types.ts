/**
 * Insights Types
 * Type definitions for morphology insights
 */

import type { ICONS } from '../../../../../ui/icons/registry';

export interface MorphInsight {
  id: string;
  title: string;
  description: string;
  type: 'recommendation' | 'observation' | 'achievement' | 'goal_progress';
  category: 'morphology' | 'fitness' | 'nutrition' | 'health' | 'goals';
  priority: 'high' | 'medium' | 'low';
  value?: string;
  icon: keyof typeof ICONS;
  color: string;
  confidence: number;
  actionable?: {
    action: string;
    description: string;
  };
}

export interface InsightsResponse {
  insights: MorphInsight[];
  summary: {
    morphology_score: number;
    goal_alignment: number;
    health_indicators: number;
    recommendations_count: number;
  };
  metadata: {
    generated_at: string;
    ai_model: string;
    confidence: number;
  };
}