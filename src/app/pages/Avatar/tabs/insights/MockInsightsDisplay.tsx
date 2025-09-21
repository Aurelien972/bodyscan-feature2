/**
 * Mock Insights Display Component
 * Shows example insights when the Edge Function is not yet implemented
 */

import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';
import { InsightCard } from './InsightCard';
import type { MorphInsight } from './types';

interface MockInsightsDisplayProps {
  userProfile: any;
  scanData: any;
}

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
 * Mock Insights Display for Development
 */
export const MockInsightsDisplay: React.FC<MockInsightsDisplayProps> = ({ userProfile, scanData }) => {
  const age = calculateAge(userProfile?.birthdate);
  const bmi = userProfile?.height_cm && userProfile?.weight_kg ? 
    calculateBMI(userProfile.height_cm, userProfile.weight_kg) : null;

  const mockInsights: MorphInsight[] = [
    {
      id: 'morphology-analysis',
      title: 'Profil Morphologique Unique',
      description: `Votre scan révèle une morphologie ${scanData?.resolvedGender === 'female' ? 'féminine' : 'masculine'} avec des caractéristiques distinctives. Votre composition corporelle indique un potentiel d'optimisation intéressant.`,
      type: 'observation',
      category: 'morphology',
      priority: 'high',
      value: scanData?.resolvedGender === 'female' ? 'Féminine' : 'Masculine',
      icon: 'Eye',
      color: '#8B5CF6',
      confidence: 0.92
    },
    {
      id: 'bmi-analysis',
      title: 'Indice de Masse Corporelle',
      description: bmi ? 
        `Votre IMC de ${bmi.toFixed(1)} ${bmi < 18.5 ? 'indique un poids insuffisant' : bmi < 25 ? 'se situe dans la plage normale' : bmi < 30 ? 'indique un surpoids' : 'indique une obésité'}. ${userProfile?.target_weight_kg ? `Pour atteindre votre objectif de ${userProfile.target_weight_kg}kg, voici nos recommandations.` : ''}` :
        'Renseignez votre taille et poids pour obtenir une analyse IMC personnalisée.',
      type: bmi && bmi >= 18.5 && bmi < 25 ? 'achievement' : 'recommendation',
      category: 'health',
      priority: 'high',
      value: bmi ? bmi.toFixed(1) : 'N/A',
      icon: 'Activity',
      color: bmi && bmi >= 18.5 && bmi < 25 ? '#22C55E' : '#F59E0B',
      confidence: 0.95,
      actionable: userProfile?.target_weight_kg ? {
        action: 'Voir le plan personnalisé',
        description: 'Plan d\'action basé sur votre morphologie'
      } : undefined
    },
    {
      id: 'activity-recommendation',
      title: 'Recommandations d\'Activité',
      description: userProfile?.activity_level ? 
        `Avec votre niveau d'activité "${userProfile.activity_level}" et votre morphologie actuelle, nous recommandons des exercices ciblés pour optimiser vos résultats.` :
        'Renseignez votre niveau d\'activité pour obtenir des recommandations d\'exercices personnalisées.',
      type: 'recommendation',
      category: 'fitness',
      priority: 'medium',
      value: userProfile?.activity_level || 'Non renseigné',
      icon: 'Zap',
      color: '#10B981',
      confidence: 0.88,
      actionable: {
        action: 'Voir les exercices recommandés',
        description: 'Exercices adaptés à votre morphologie'
      }
    },
    {
      id: 'goal-tracking',
      title: 'Suivi d\'Objectifs',
      description: userProfile?.objective ? 
        `Votre objectif "${userProfile.objective}" est bien aligné avec votre morphologie actuelle. Votre avatar 3D vous aidera à visualiser vos progrès.` :
        'Définissez un objectif pour obtenir un suivi personnalisé de vos progrès.',
      type: userProfile?.objective ? 'goal_progress' : 'recommendation',
      category: 'goals',
      priority: 'medium',
      value: userProfile?.objective || 'À définir',
      icon: 'Target',
      color: '#06B6D4',
      confidence: 0.85
    }
  ];

  if (age) {
    mockInsights.push({
      id: 'age-analysis',
      title: 'Analyse par Âge',
      description: `À ${age} ans, votre morphologie présente des caractéristiques typiques de votre tranche d'âge. Nos recommandations sont adaptées à votre profil démographique.`,
      type: 'observation',
      category: 'health',
      priority: 'low',
      value: `${age} ans`,
      icon: 'Calendar',
      color: '#EC4899',
      confidence: 0.90
    });
  }

  return (
    <div className="space-y-6">
      {/* Development Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GlassCard className="p-6 border-yellow-400/30 bg-yellow-500/10">
          <div className="flex items-center gap-3 mb-4">
            <SpatialIcon Icon={ICONS.Zap} size={20} className="text-yellow-400" />
            <div>
              <h4 className="text-yellow-300 font-semibold">Aperçu des Insights IA</h4>
              <p className="text-yellow-300/70 text-sm">
                Voici un aperçu des insights qui seront générés par notre IA
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Mock Insights */}
      <div className="space-y-6">
        <GlassCard className="p-6 glass-card--summary">
          <h4 className="text-white font-semibold mb-6 flex items-center gap-2">
            <SpatialIcon Icon={ICONS.BarChart3} size={16} className="text-yellow-400" />
            Insights personnalisés
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockInsights.map((insight, index) => (
              <InsightCard key={insight.id} insight={insight} index={index} />
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Call to Action for Edge Function Implementation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <GlassCard className="p-6 text-center border-blue-400/30 bg-blue-500/10">
          <SpatialIcon Icon={ICONS.Zap} size={32} className="text-blue-400 mx-auto mb-4" />
          <h4 className="text-blue-300 font-semibold mb-2">IA en Développement</h4>
          <p className="text-blue-300/70 text-sm mb-4">
            L'Edge Function "generate-morph-insights" doit être implémentée pour activer les insights IA en temps réel
          </p>
          <div className="text-xs text-blue-300/50">
            Endpoint: /functions/v1/generate-morph-insights
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};