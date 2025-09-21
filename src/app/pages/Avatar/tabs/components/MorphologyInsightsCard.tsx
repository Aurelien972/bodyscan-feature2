import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';

interface MorphologyInsightsCardProps {
  finalShapeParams: Record<string, number>;
  resolvedGender: 'male' | 'female';
  userProfile: {
    sex: 'male' | 'female';
    height_cm: number;
    weight_kg: number;
  };
}

interface MorphInsight {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof ICONS;
  color: string;
  value: string;
  category: 'silhouette' | 'composition' | 'development' | 'balance';
}

/**
 * Analyze morphology and generate positive insights
 */
function analyzeMorphology(
  shapeParams: Record<string, number>,
  gender: 'male' | 'female',
  userProfile: { height_cm: number; weight_kg: number }
): MorphInsight[] {
  const insights: MorphInsight[] = [];
  
  // Calculate BMI for context
  const bmi = userProfile.weight_kg / Math.pow(userProfile.height_cm / 100, 2);
  
  // 1. Silhouette Analysis (always positive framing)
  const pearFigure = shapeParams.pearFigure || 0;
  const narrowWaist = Math.abs(shapeParams.narrowWaist || 0);
  const bigHips = shapeParams.bigHips || 0;
  
  let silhouetteInsight: MorphInsight;
  
  if (pearFigure > 0.3 || bigHips > 0.3) {
    silhouetteInsight = {
      id: 'silhouette-curves',
      title: 'Silhouette Harmonieuse',
      description: 'Vos courbes naturelles créent une silhouette équilibrée et féminine',
      icon: 'Heart',
      color: '#EC4899',
      value: 'Courbes',
      category: 'silhouette'
    };
  } else if (narrowWaist > 0.3) {
    silhouetteInsight = {
      id: 'silhouette-athletic',
      title: 'Taille Définie',
      description: 'Votre taille marquée révèle une silhouette athlétique et structurée',
      icon: 'Target',
      color: '#10B981',
      value: 'Athlétique',
      category: 'silhouette'
    };
  } else {
    silhouetteInsight = {
      id: 'silhouette-balanced',
      title: 'Silhouette Équilibrée',
      description: 'Vos proportions naturelles créent une harmonie corporelle parfaite',
      icon: 'Circle',
      color: '#06B6D4',
      value: 'Équilibrée',
      category: 'silhouette'
    };
  }
  
  insights.push(silhouetteInsight);
  
  // 2. Muscle Development Analysis (always encouraging)
  const bodybuilderSize = shapeParams.bodybuilderSize || 0;
  const bodybuilderDetails = shapeParams.bodybuilderDetails || 0;
  const emaciated = shapeParams.emaciated || 0;
  
  let developmentInsight: MorphInsight;
  
  if (bodybuilderSize > 0.3 || bodybuilderDetails > 0.3) {
    developmentInsight = {
      id: 'development-muscular',
      title: 'Développement Musculaire',
      description: 'Votre masse musculaire témoigne d\'un excellent travail physique',
      icon: 'Zap',
      color: '#8B5CF6',
      value: 'Développé',
      category: 'development'
    };
  } else if (emaciated < -0.3) {
    developmentInsight = {
      id: 'development-lean',
      title: 'Composition Lean',
      description: 'Votre physique fin révèle une excellente définition musculaire',
      icon: 'TrendingUp',
      color: '#F59E0B',
      value: 'Défini',
      category: 'development'
    };
  } else {
    developmentInsight = {
      id: 'development-natural',
      title: 'Tonus Naturel',
      description: 'Votre développement musculaire naturel offre une base solide',
      icon: 'Activity',
      color: '#22C55E',
      value: 'Naturel',
      category: 'development'
    };
  }
  
  insights.push(developmentInsight);
  
  // 3. Body Composition Analysis (BMI-based but positive)
  let compositionInsight: MorphInsight;
  
  if (bmi < 18.5) {
    compositionInsight = {
      id: 'composition-lean',
      title: 'Métabolisme Rapide',
      description: 'Votre composition révèle un métabolisme efficace et dynamique',
      icon: 'Zap',
      color: '#06B6D4',
      value: 'Dynamique',
      category: 'composition'
    };
  } else if (bmi >= 18.5 && bmi < 25) {
    compositionInsight = {
      id: 'composition-optimal',
      title: 'Composition Optimale',
      description: 'Votre équilibre masse/taille se situe dans la zone idéale',
      icon: 'Check',
      color: '#10B981',
      value: 'Optimale',
      category: 'composition'
    };
  } else if (bmi >= 25 && bmi < 30) {
    compositionInsight = {
      id: 'composition-robust',
      title: 'Constitution Robuste',
      description: 'Votre morphologie révèle une constitution solide et puissante',
      icon: 'Shield',
      color: '#F59E0B',
      value: 'Robuste',
      category: 'composition'
    };
  } else {
    compositionInsight = {
      id: 'composition-powerful',
      title: 'Potentiel de Transformation',
      description: 'Votre morphologie actuelle offre un excellent potentiel d\'évolution',
      icon: 'TrendingUp',
      color: '#8B5CF6',
      value: 'Évolutif',
      category: 'composition'
    };
  }
  
  insights.push(compositionInsight);
  
  // 4. Balance and Symmetry Analysis
  const assLarge = shapeParams.assLarge || 0;
  const superBreast = shapeParams.superBreast || 0;
  const breastsSmall = shapeParams.breastsSmall || 0;
  
  let balanceInsight: MorphInsight;
  
  if (gender === 'female' && (superBreast > 0.2 || breastsSmall > 0.2)) {
    balanceInsight = {
      id: 'balance-feminine',
      title: 'Féminité Naturelle',
      description: 'Vos attributs féminins créent une harmonie corporelle unique',
      icon: 'Heart',
      color: '#EC4899',
      value: 'Féminine',
      category: 'balance'
    };
  } else if (assLarge > 0.2) {
    balanceInsight = {
      id: 'balance-curves',
      title: 'Équilibre des Volumes',
      description: 'La répartition de vos volumes crée une silhouette harmonieuse',
      icon: 'Circle',
      color: '#A855F7',
      value: 'Harmonieuse',
      category: 'balance'
    };
  } else {
    balanceInsight = {
      id: 'balance-symmetrical',
      title: 'Symétrie Parfaite',
      description: 'Votre morphologie présente un équilibre naturel remarquable',
      icon: 'GitCompare',
      color: '#06B6D4',
      value: 'Symétrique',
      category: 'balance'
    };
  }
  
  insights.push(balanceInsight);
  
  return insights;
}

/**
 * Morphology Insights Card Component
 * Displays positive, encouraging insights about user's morphology
 */
const MorphologyInsightsCard: React.FC<MorphologyInsightsCardProps> = ({
  finalShapeParams,
  resolvedGender,
  userProfile
}) => {
  const insights = React.useMemo(() => 
    analyzeMorphology(finalShapeParams, resolvedGender, userProfile),
    [finalShapeParams, resolvedGender, userProfile]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <SpatialIcon Icon={ICONS.Zap} size={16} className="text-purple-400" />
            Votre Profil Morphologique
          </h4>
          
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-purple-300 text-xs font-medium">Analyse IA</span>
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              className="text-center p-4 rounded-xl border transition-all hover:scale-105"
              style={{
                background: `color-mix(in srgb, ${insight.color} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${insight.color} 25%, transparent)`,
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <div 
                className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${insight.color} 20%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${insight.color} 30%, transparent)`,
                }}
              >
                <SpatialIcon Icon={ICONS[insight.icon]} size={20} color={insight.color} />
              </div>
              
              <div className="text-lg font-bold mb-1" style={{ color: insight.color }}>
                {insight.value}
              </div>
              
              <div className="text-white/80 text-xs font-medium">
                {insight.title}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Encouraging Summary */}
        <motion.div
          className="text-center p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-white/80 text-sm leading-relaxed">
            Votre morphologie unique révèle un potentiel extraordinaire. 
            Chaque caractéristique de votre corps raconte l'histoire de votre parcours 
            et offre des opportunités d'optimisation personnalisées.
          </p>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

export default MorphologyInsightsCard;