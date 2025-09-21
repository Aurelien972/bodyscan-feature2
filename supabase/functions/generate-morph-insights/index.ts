interface ScanData {
  final_shape_params: Record<string, number>;
  final_limb_masses: Record<string, number>;
  skin_tone?: {
    rgb: { r: number; g: number; b: number };
    hex: string;
    confidence?: number;
    source?: string;
  };
  resolved_gender: 'male' | 'female';
  avatar_version?: string;
  scan_id?: string;
}

interface UserProfile {
  user_id: string;
  age?: number;
  sex: 'male' | 'female';
  height_cm: number;
  weight_kg: number;
  target_weight_kg?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  objective?: 'fat_loss' | 'recomp' | 'muscle_gain';
  bmi?: number;
  goals?: Record<string, any>;
  health?: Record<string, any>;
  emotions?: Record<string, any>;
  nutrition?: Record<string, any>;
}

interface MorphInsight {
  id: string;
  title: string;
  description: string;
  type: 'recommendation' | 'observation' | 'achievement' | 'goal_progress';
  category: 'morphology' | 'fitness' | 'nutrition' | 'health' | 'goals';
  priority: 'high' | 'medium' | 'low';
  value?: string;
  icon: string;
  color: string;
  confidence: number;
  actionable?: {
    action: string;
    description: string;
  };
}

interface InsightsResponse {
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, apikey",
};

/**
 * Analyze morphology and generate insights
 */
function analyzeMorphology(scanData: ScanData, userProfile: UserProfile): MorphInsight[] {
  const insights: MorphInsight[] = [];
  const shapeParams = scanData.final_shape_params || {};
  const limbMasses = scanData.final_limb_masses || {};
  
  // 1. Body Composition Analysis
  const bodybuilderSize = shapeParams.bodybuilderSize || 0;
  const emaciated = shapeParams.emaciated || 0;
  const pearFigure = shapeParams.pearFigure || 0;
  
  if (bodybuilderSize > 0.3) {
    insights.push({
      id: 'muscle-development',
      title: 'Développement Musculaire Excellent',
      description: `Votre scan révèle un développement musculaire remarquable (score: ${(bodybuilderSize * 100).toFixed(0)}%). Votre morphologie indique un excellent potentiel athlétique.`,
      type: 'achievement',
      category: 'morphology',
      priority: 'high',
      value: 'Développé',
      icon: 'Zap',
      color: '#8B5CF6',
      confidence: 0.92,
      actionable: {
        action: 'Optimiser l\'entraînement',
        description: 'Programme adapté à votre morphologie musculaire'
      }
    });
  } else if (emaciated < -0.5) {
    insights.push({
      id: 'lean-physique',
      title: 'Physique Lean Défini',
      description: `Votre morphologie révèle une composition corporelle très définie. Excellent pour la définition musculaire et la performance athlétique.`,
      type: 'observation',
      category: 'morphology',
      priority: 'medium',
      value: 'Défini',
      icon: 'TrendingUp',
      color: '#10B981',
      confidence: 0.88
    });
  }
  
  // 2. Body Shape Analysis
  if (pearFigure > 0.3) {
    insights.push({
      id: 'pear-shape',
      title: 'Silhouette en Poire',
      description: `Votre morphologie présente une répartition des masses caractéristique. Cette forme naturelle offre des avantages pour certains types d'exercices.`,
      type: 'observation',
      category: 'morphology',
      priority: 'medium',
      value: 'Poire',
      icon: 'Circle',
      color: '#EC4899',
      confidence: 0.85,
      actionable: {
        action: 'Exercices ciblés',
        description: 'Programme adapté à votre répartition corporelle'
      }
    });
  }
  
  // 3. BMI and Health Analysis
  if (userProfile.bmi) {
    const bmi = userProfile.bmi;
    let bmiInsight: MorphInsight;
    
    if (bmi >= 18.5 && bmi < 25) {
      bmiInsight = {
        id: 'bmi-optimal',
        title: 'IMC dans la Zone Optimale',
        description: `Votre IMC de ${bmi.toFixed(1)} se situe dans la plage idéale. Votre morphologie actuelle est excellente pour maintenir une santé optimale.`,
        type: 'achievement',
        category: 'health',
        priority: 'high',
        value: bmi.toFixed(1),
        icon: 'Check',
        color: '#22C55E',
        confidence: 0.95
      };
    } else if (bmi < 18.5) {
      bmiInsight = {
        id: 'bmi-underweight',
        title: 'Potentiel de Prise de Masse',
        description: `Votre IMC de ${bmi.toFixed(1)} indique un potentiel pour une prise de masse saine. Votre morphologie lean est idéale pour développer du muscle de qualité.`,
        type: 'recommendation',
        category: 'health',
        priority: 'high',
        value: bmi.toFixed(1),
        icon: 'TrendingUp',
        color: '#06B6D4',
        confidence: 0.90,
        actionable: {
          action: 'Plan de prise de masse',
          description: 'Stratégie adaptée à votre morphologie'
        }
      };
    } else {
      bmiInsight = {
        id: 'bmi-optimization',
        title: 'Opportunité d\'Optimisation',
        description: `Votre IMC de ${bmi.toFixed(1)} offre une excellente base pour une transformation corporelle. Votre morphologie actuelle a un potentiel d'amélioration significatif.`,
        type: 'recommendation',
        category: 'health',
        priority: 'high',
        value: bmi.toFixed(1),
        icon: 'Target',
        color: '#F59E0B',
        confidence: 0.88,
        actionable: {
          action: 'Plan de transformation',
          description: 'Programme personnalisé basé sur votre scan'
        }
      };
    }
    
    insights.push(bmiInsight);
  }
  
  // 4. Goal Alignment Analysis
  if (userProfile.objective && userProfile.target_weight_kg) {
    const weightDiff = userProfile.target_weight_kg - userProfile.weight_kg;
    const objectiveText = userProfile.objective === 'fat_loss' ? 'perte de graisse' :
                         userProfile.objective === 'muscle_gain' ? 'prise de muscle' :
                         'recomposition corporelle';
    
    insights.push({
      id: 'goal-alignment',
      title: 'Alignement des Objectifs',
      description: `Votre objectif de ${objectiveText} ${weightDiff !== 0 ? `avec un objectif de ${Math.abs(weightDiff).toFixed(1)}kg ${weightDiff > 0 ? 'à gagner' : 'à perdre'}` : ''} est parfaitement réalisable avec votre morphologie actuelle.`,
      type: 'goal_progress',
      category: 'goals',
      priority: 'high',
      value: objectiveText,
      icon: 'Target',
      color: '#8B5CF6',
      confidence: 0.87,
      actionable: {
        action: 'Plan personnalisé',
        description: 'Stratégie basée sur votre scan 3D'
      }
    });
  }
  
  // 5. Activity Level Recommendations
  if (userProfile.activity_level) {
    const activityInsights = {
      'sedentary': {
        title: 'Potentiel d\'Activation',
        description: 'Votre morphologie révèle un excellent potentiel pour débuter une activité physique progressive. Commencez par des exercices adaptés à votre composition corporelle.',
        color: '#F59E0B',
        actionable: {
          action: 'Programme débutant',
          description: 'Exercices adaptés à votre niveau'
        }
      },
      'light': {
        title: 'Progression Naturelle',
        description: 'Votre niveau d\'activité léger combiné à votre morphologie offre une base solide pour intensifier progressivement votre entraînement.',
        color: '#10B981',
        actionable: {
          action: 'Intensifier l\'entraînement',
          description: 'Prochaines étapes pour votre progression'
        }
      },
      'moderate': {
        title: 'Équilibre Optimal',
        description: 'Votre activité modérée est parfaitement alignée avec votre morphologie. Continuez sur cette voie pour des résultats durables.',
        color: '#22C55E',
        actionable: {
          action: 'Maintenir le cap',
          description: 'Optimisations pour votre routine actuelle'
        }
      },
      'active': {
        title: 'Performance Athlétique',
        description: 'Votre niveau d\'activité élevé et votre morphologie indiquent un excellent potentiel de performance. Votre corps est optimisé pour l\'effort.',
        color: '#8B5CF6',
        actionable: {
          action: 'Optimisation performance',
          description: 'Techniques avancées pour votre niveau'
        }
      },
      'athlete': {
        title: 'Morphologie d\'Élite',
        description: 'Votre statut d\'athlète se reflète dans votre morphologie exceptionnelle. Votre composition corporelle est optimisée pour la haute performance.',
        color: '#EC4899',
        actionable: {
          action: 'Stratégies d\'élite',
          description: 'Techniques de pointe pour athlètes'
        }
      }
    };
    
    const activityInsight = activityInsights[userProfile.activity_level];
    if (activityInsight) {
      insights.push({
        id: 'activity-analysis',
        title: activityInsight.title,
        description: activityInsight.description,
        type: 'recommendation',
        category: 'fitness',
        priority: 'medium',
        value: userProfile.activity_level,
        icon: 'Activity',
        color: activityInsight.color,
        confidence: 0.85,
        actionable: activityInsight.actionable
      });
    }
  }
  
  // 6. Skin Tone Analysis
  if (scanData?.skinTone) {
    insights.push({
      id: 'skin-tone-analysis',
      title: 'Analyse de Teint Personnalisée',
      description: `Votre teint naturel a été capturé avec précision (${scanData.skinTone.hex}). Cette information permet un rendu 3D ultra-réaliste de votre avatar.`,
      type: 'observation',
      category: 'morphology',
      priority: 'low',
      value: scanData.skinTone.hex,
      icon: 'Palette',
      color: '#A855F7',
      confidence: scanData.skinTone.confidence || 0.80
    });
  }
  
  return insights;
};

/**
 * Calculate summary metrics
 */
function calculateSummary(insights: MorphInsight[], userProfile: UserProfile): InsightsResponse['summary'] {
  const morphologyInsights = insights.filter(i => i.category === 'morphology');
  const healthInsights = insights.filter(i => i.category === 'health');
  const recommendationsCount = insights.filter(i => i.type === 'recommendation').length;
  
  // Calculate morphology score based on insights
  const morphologyScore = morphologyInsights.length > 0 ? 
    morphologyInsights.reduce((sum, insight) => sum + insight.confidence, 0) / morphologyInsights.length : 0.8;
  
  // Calculate goal alignment
  const hasGoals = !!(userProfile.target_weight_kg || userProfile.objective);
  const goalAlignment = hasGoals ? 0.85 : 0.5;
  
  // Calculate health indicators
  const healthIndicators = healthInsights.length > 0 ?
    healthInsights.reduce((sum, insight) => sum + insight.confidence, 0) / healthInsights.length : 0.75;
  
  return {
    morphology_score: morphologyScore,
    goal_alignment: goalAlignment,
    health_indicators: healthIndicators,
    recommendations_count: recommendationsCount
  };
}

/**
 * Generate comprehensive AI-powered morphology insights
 */
async function generateAIInsights(scanData: ScanData, userProfile: UserProfile): Promise<InsightsResponse> {
  try {
    // For now, use the analytical approach
    // TODO: Integrate with OpenAI GPT-4o for more sophisticated insights
    const insights = analyzeMorphology(scanData, userProfile);
    const summary = calculateSummary(insights, userProfile);
    
    return {
      insights,
      summary,
      metadata: {
        generated_at: new Date().toISOString(),
        ai_model: 'analytical_v1.0',
        confidence: 0.85
      }
    };
  } catch (error) {
    console.error('Error generating AI insights:', error);
    throw error;
  }
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req: Request) => {
  console.log('🚀 Generate Morph Insights - Function started', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  if (req.method === "OPTIONS") {
    console.log('✅ CORS preflight request handled');
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('📥 Parsing request body...');
    const { scan_data, user_profile, analysis_config } = await req.json();
    
    console.log('✅ Generate Morph Insights - Request received:', {
      hasScanData: !!scan_data,
      hasUserProfile: !!user_profile,
      userId: user_profile?.user_id,
      scanId: scan_data?.scan_id,
      analysisConfig: analysis_config
    });

    // Validate input data
    if (!scan_data || !user_profile) {
      console.log('❌ Validation failed: Missing required data');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required data: scan_data and user_profile are required' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!user_profile.user_id) {
      console.log('❌ Validation failed: Missing user_id');
      return new Response(
        JSON.stringify({ 
          error: 'Missing user_id in user_profile' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate insights
    console.log('🧠 Generating AI insights...');
    const insights = await generateAIInsights(scan_data, user_profile);
    
    console.log('✅ Generate Morph Insights - Insights generated:', {
      userId: user_profile.user_id,
      insightsCount: insights.insights.length,
      morphologyScore: insights.summary.morphology_score,
      recommendationsCount: insights.summary.recommendations_count
    });

    console.log('📤 Sending response with insights');
    return new Response(
      JSON.stringify(insights),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Generate Morph Insights - Error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during insights generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});