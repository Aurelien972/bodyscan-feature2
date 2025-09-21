import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';

interface MeasurementsCardProps {
  extractedData: {
    raw_measurements?: Record<string, number>;
    estimated_bmi?: number;
    estimated_body_fat_perc?: number;
    processing_confidence?: number;
  };
  userProfile: {
    sex: 'male' | 'female';
    height_cm: number;
    weight_kg: number;
  };
}

// Traductions françaises pour les mesures
const MEASUREMENT_TRANSLATIONS: Record<string, string> = {
  waist_cm: 'Tour de taille',
  chest_cm: 'Tour de poitrine',
  hips_cm: 'Tour de hanches',
  shoulder_width_cm: 'Largeur d\'épaules',
  neck_cm: 'Tour de cou',
  arm_length_cm: 'Longueur de bras',
  bicep_cm: 'Tour de biceps',
  thigh_cm: 'Tour de cuisse',
  calf_cm: 'Tour de mollet',
  forearm_cm: 'Tour d\'avant-bras',
  wrist_cm: 'Tour de poignet',
  ankle_cm: 'Tour de cheville',
  height_cm: 'Taille',
  weight_kg: 'Poids',
  inseam_cm: 'Entrejambe',
  torso_length_cm: 'Longueur du torse',
  estimated_body_fat_perc: 'Masse Grasse Estimée',
  estimated_muscle_mass_kg: 'Masse Musculaire Estimée',
  waist_to_hip_ratio: 'Ratio Taille/Hanches',
};

/**
 * Calculate estimated body age based on BMI and body fat percentage
 */
function calculateBodyAge(bmi: number, bodyFatPerc: number, userSex: 'male' | 'female'): number {
  // Simplified formula for illustrative purposes (not medically accurate)
  const baseBMI = 22; // Ideal BMI
  const idealBodyFat = userSex === 'male' ? 15 : 25; // Ideal body fat by gender
  
  // Calculate deviations
  const bmiDeviation = Math.abs(bmi - baseBMI) / baseBMI;
  const bodyFatDeviation = Math.abs(bodyFatPerc - idealBodyFat) / idealBodyFat;
  
  // Base age adjustment (simplified calculation)
  const ageAdjustment = (bmiDeviation + bodyFatDeviation) * 15;
  
  // Assume base age of 30 and adjust
  const estimatedAge = 30 + ageAdjustment;
  
  return Math.max(18, Math.min(65, estimatedAge)); // Clamp between 18-65
}

/**
 * Calculate ideal weight based on height
 */
function calculateIdealWeight(height_cm: number): number {
  // Using BMI of 22 as ideal
  const idealBMI = 22;
  const heightInMeters = height_cm / 100;
  return idealBMI * heightInMeters * heightInMeters;
}

/**
 * Get BMI category and color
 */
function getBMIInfo(bmi: number): { category: string; color: string; description: string } {
  if (bmi < 18.5) {
    return {
      category: 'Insuffisant',
      color: '#06B6D4',
      description: 'Poids en dessous de la normale'
    };
  } else if (bmi < 25) {
    return {
      category: 'Normal',
      color: '#10B981',
      description: 'Poids dans la plage normale'
    };
  } else if (bmi < 30) {
    return {
      category: 'Surpoids',
      color: '#F59E0B',
      description: 'Poids au-dessus de la normale'
    };
  } else {
    return {
      category: 'Obésité',
      color: '#EF4444',
      description: 'Poids significativement élevé'
    };
  }
}

/**
 * Measurements display card
 */
const MeasurementsCard: React.FC<MeasurementsCardProps> = ({ extractedData, userProfile }) => {
  const measurements = extractedData?.raw_measurements || {};
  const estimatedBMI = extractedData?.estimated_bmi;
  const bodyFatPerc = extractedData?.estimated_body_fat_perc;
  const confidence = extractedData?.processing_confidence;

  if (!extractedData || Object.keys(measurements).length === 0) {
    return null;
  }

  // Calculate BMI from user profile if not provided
  const calculatedBMI = estimatedBMI || (userProfile.weight_kg / Math.pow(userProfile.height_cm / 100, 2));
  const bmiInfo = estimatedBMI ? getBMIInfo(estimatedBMI) : null;
  
  // Calculate additional metrics
  const bodyAge = calculatedBMI && bodyFatPerc ? 
    calculateBodyAge(calculatedBMI, bodyFatPerc, userProfile.sex) : null;
  const idealWeight = calculateIdealWeight(userProfile.height_cm);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <GlassCard className="p-6 relative overflow-visible">
        {/* Enhanced header with better visual hierarchy */}
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <SpatialIcon Icon={ICONS.Activity} size={18} className="text-green-400" />
            Mesures extraites
          </h4>
          
          {confidence && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-blue-300 text-xs font-medium">
                {Math.round(confidence * 100)}% confiance
              </span>
            </div>
          )}
        </div>

        {/* Measurements grid with summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* IMC - Résumé clé */}
            {calculatedBMI && bmiInfo && (
              <motion.div 
                className="col-span-full text-center p-6 rounded-xl bg-blue-600/20 border-2 border-blue-500/40 hover:bg-blue-600/25 transition-colors"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-2xl font-bold text-blue-400 mb-2">
                  {calculatedBMI.toFixed(1)}
                </div>
                <div className="text-blue-300 text-sm font-semibold capitalize leading-tight">
                  IMC • {bmiInfo.category}
                </div>
                <div className="text-blue-200/70 text-xs mt-1">
                  {bmiInfo.description}
                </div>
              </motion.div>
            )}

            {/* Âge Corporel - Résumé clé */}
            {bodyAge && (
              <motion.div 
                className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-lg font-bold text-blue-400 mb-1">
                  {Math.round(bodyAge)} ans
                </div>
                <div className="text-blue-300 text-xs font-medium capitalize leading-tight">
                  Âge Corporel
                </div>
              </motion.div>
            )}

            {/* Poids Idéal - Résumé clé */}
            <motion.div 
              className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-lg font-bold text-blue-400 mb-1">
                {idealWeight.toFixed(1)} kg
              </div>
              <div className="text-blue-300 text-xs font-medium capitalize leading-tight">
                Poids Idéal
              </div>
            </motion.div>

            {/* Mesures détaillées */}
            {Object.entries(measurements).map(([key, value], index) => {
              const translatedName = MEASUREMENT_TRANSLATIONS[key] || key.replace(/_/g, ' ');
              const unit = key.includes('_cm') ? 'cm' : key.includes('_kg') ? 'kg' : key.includes('_perc') ? '%' : '';
              const displayValue = typeof value === 'number' ? value.toFixed(1) : value;
              
              return (
                <motion.div 
                  key={key} 
                  className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-lg font-bold text-blue-400 mb-1">
                    {displayValue}{unit}
                  </div>
                  <div className="text-white/70 text-xs font-medium capitalize leading-tight">
                    {translatedName}
                  </div>
                </motion.div>
              );
            })}
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default MeasurementsCard;
