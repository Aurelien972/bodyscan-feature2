/**
 * Insight Generator
 * Generates insights from scan results for user feedback
 */

import logger from '../../../../../lib/utils/logger';

interface Insight {
  id: string;
  type: 'recommendation' | 'observation' | 'achievement' | 'tip';
  title: string;
  description: string;
  category: 'morphology' | 'composition' | 'fitness' | 'health';
  priority: 'high' | 'medium' | 'low';
  icon?: string;
  color?: string;
  confidence: number;
  source: 'archetype' | 'semantic' | 'measurement' | 'ai_analysis';
}

interface InsightsResult {
  items: Insight[];
  source: 'archetypes' | 'semantic' | 'indices' | 'fallback';
  confidence: number;
  metadata: {
    archetypes_count?: number;
    semantic_confidence?: number;
    fallback_reason?: string;
    generation_timestamp: string;
  };
}

/**
 * Generate insights from scan results
 */
export function generateInsightsFromScanResults(
  estimateResult: any,
  semanticResult: any,
  matchResult: any,
  clientScanId: string
): InsightsResult {
  logger.info('INSIGHT_GENERATOR', 'Starting insights generation', {
    clientScanId,
    hasEstimateResult: !!estimateResult,
    hasSemanticResult: !!semanticResult,
    hasMatchResult: !!matchResult
  });

  const insights: Insight[] = [];

  // Add confidence insight
  const confidence = estimateResult?.extracted_data?.processing_confidence || 0;
  if (confidence > 0.8) {
    insights.push({
      id: 'high-confidence',
      type: 'achievement',
      title: 'Analyse de Haute Qualité',
      description: `Votre scan a été analysé avec ${Math.round(confidence * 100)}% de confiance.`,
      category: 'morphology',
      priority: 'high',
      confidence: confidence,
      source: 'ai_analysis',
      color: '#22C55E'
    });
  }

  // Add archetype insight
  if (matchResult?.selected_archetypes?.length > 0) {
    const primaryArchetype = matchResult.selected_archetypes[0];
    insights.push({
      id: 'archetype-match',
      type: 'observation',
      title: 'Profil Morphologique',
      description: `Votre morphologie correspond au profil "${primaryArchetype.name}".`,
      category: 'morphology',
      priority: 'medium',
      confidence: 0.8,
      source: 'archetype',
      color: '#8B5CF6'
    });
  }

  // Add semantic insights
  if (semanticResult?.semantic_profile) {
    const semantic = semanticResult.semantic_profile;
    insights.push({
      id: 'semantic-classification',
      type: 'observation',
      title: 'Classification Morphologique',
      description: `Profil: ${semantic.obesity} • ${semantic.muscularity} • ${semantic.morphotype}`,
      category: 'morphology',
      priority: 'medium',
      confidence: semanticResult.semantic_confidence || 0.6,
      source: 'semantic',
      color: '#06B6D4'
    });
  }

  // Add BMI insight if available
  const estimatedBMI = estimateResult?.extracted_data?.estimated_bmi;
  if (estimatedBMI) {
    const bmiCategory = getBMICategory(estimatedBMI);
    const bmiInsight = getBMIInsight(estimatedBMI, bmiCategory);
    if (bmiInsight) {
      insights.push(bmiInsight);
    }
  }

  const result: InsightsResult = {
    items: insights,
    source: matchResult?.selected_archetypes?.length > 0 ? 'archetypes' : 'semantic',
    confidence: confidence || 0.8,
    metadata: {
      archetypes_count: matchResult?.selected_archetypes?.length || 0,
      semantic_confidence: semanticResult?.semantic_confidence,
      generation_timestamp: new Date().toISOString()
    }
  };

  logger.info('INSIGHT_GENERATOR', 'Insights generation completed', {
    clientScanId,
    insightsCount: insights.length,
    source: result.source,
    confidence: result.confidence
  });

  return result;
}

/**
 * Get BMI category
 */
function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

/**
 * Get BMI insight
 */
function getBMIInsight(bmi: number, category: string): Insight | null {
  const bmiInsights = {
    'underweight': {
      title: 'IMC Bas',
      description: `Votre IMC (${bmi.toFixed(1)}) indique un poids insuffisant. Consultez un professionnel de santé pour un suivi adapté.`,
      type: 'recommendation' as const,
      color: '#06B6D4'
    },
    'normal': {
      title: 'IMC Optimal',
      description: `Votre IMC (${bmi.toFixed(1)}) se situe dans la plage normale. Excellente base pour maintenir votre forme physique.`,
      type: 'achievement' as const,
      color: '#22C55E'
    },
    'overweight': {
      title: 'IMC Élevé',
      description: `Votre IMC (${bmi.toFixed(1)}) indique un surpoids. Votre avatar reflète votre morphologie actuelle avec précision.`,
      type: 'observation' as const,
      color: '#F59E0B'
    },
    'obese': {
      title: 'IMC Très Élevé',
      description: `Votre IMC (${bmi.toFixed(1)}) indique une obésité. Votre avatar capture fidèlement votre composition corporelle actuelle.`,
      type: 'observation' as const,
      color: '#EF4444'
    }
  };

  const insight = bmiInsights[category as keyof typeof bmiInsights];
  if (!insight) return null;

  return {
    id: `bmi-${category}`,
    type: insight.type,
    title: insight.title,
    description: insight.description,
    category: 'health',
    priority: 'high',
    confidence: 0.8,
    source: 'measurement',
    color: insight.color
  };
}