/**
 * Insights Service
 * Handles AI-powered morphology insights generation
 */

import { supabase } from '../../../../../system/supabase/client';
import logger from '../../../../../lib/utils/logger';
import type { MorphInsight, InsightsResponse } from './types';

/**
 * Calculate age from birthdate
 */
function calculateAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  
  try {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch {
    return null;
  }
}

/**
 * Calculate BMI from height and weight
 */
function calculateBMI(height_cm: number, weight_kg: number): number {
  const heightInMeters = height_cm / 100;
  return weight_kg / (heightInMeters * heightInMeters);
}

/**
 * Generate AI-powered morphology insights
 */
export async function generateMorphologyInsights(
  scanData: any,
  userProfile: any
): Promise<InsightsResponse> {
  logger.info('INSIGHTS_GENERATION', '🚀 Calling generate-morph-insights Edge Function', {
    userId: userProfile?.userId,
    hasScanData: !!scanData,
    hasUserProfile: !!userProfile,
    philosophy: 'ai_powered_morphology_insights',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    timestamp: new Date().toISOString()
  });

  try {
    logger.info('INSIGHTS_GENERATION', '📡 Invoking Supabase function...');
    
    const { data, error } = await supabase.functions.invoke('generate-morph-insights', {
      body: {
        scan_data: {
          final_shape_params: scanData?.finalShapeParams || {},
          final_limb_masses: scanData?.finalLimbMasses || {},
          skin_tone: scanData?.skinTone,
          resolved_gender: scanData?.resolvedGender,
          avatar_version: scanData?.avatarVersion,
          scan_id: scanData?.scanId
        },
        user_profile: {
          user_id: userProfile?.userId,
          age: calculateAge(userProfile?.birthdate),
          sex: userProfile?.sex,
          height_cm: userProfile?.height_cm,
          weight_kg: userProfile?.weight_kg,
          target_weight_kg: userProfile?.target_weight_kg,
          activity_level: userProfile?.activity_level,
          objective: userProfile?.objective,
          bmi: userProfile?.height_cm && userProfile?.weight_kg ? 
            calculateBMI(userProfile.height_cm, userProfile.weight_kg) : null,
          goals: userProfile?.goals || {},
          health: userProfile?.health || {},
          emotions: userProfile?.emotions || {},
          nutrition: userProfile?.nutrition || {}
        },
        analysis_config: {
          include_recommendations: true,
          include_comparisons: true,
          include_goal_tracking: true,
          detail_level: 'comprehensive'
        }
      }
    });

    logger.info('INSIGHTS_GENERATION', '📥 Function response received', {
      hasData: !!data,
      hasError: !!error,
      errorMessage: error?.message
    });

    if (error) {
      logger.error('INSIGHTS_GENERATION', '❌ Failed to generate insights', {
        error: error.message,
        userId: userProfile?.userId,
        errorDetails: error
      });
      throw new Error(`Failed to generate insights: ${error.message}`);
    }

    logger.info('INSIGHTS_GENERATION', '✅ Insights generated successfully', {
      userId: userProfile?.userId,
      insightsCount: data?.insights?.length || 0
    });

    return data;
  } catch (fetchError) {
    logger.error('INSIGHTS_GENERATION', '❌ Network or parsing error', {
      error: fetchError.message,
      stack: fetchError.stack,
      userId: userProfile?.userId
    });
    throw fetchError;
  }
}