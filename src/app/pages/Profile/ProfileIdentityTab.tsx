import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import GlassCard from '../../../ui/cards/GlassCard';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useUserStore } from '../../../system/store/userStore';
import { useToast } from '../../../ui/components/ToastProvider';
import { useFeedback } from '../../../hooks/useFeedback';
import logger from '../../../lib/utils/logger';

// Validation schema for profile identity
const profileIdentitySchema = z.object({
  displayName: z.string().min(1, 'Le nom est requis').max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  sex: z.enum(['male', 'female'], { required_error: 'Le genre est requis' }),
  height_cm: z.number()
    .min(120, 'La taille doit être d\'au moins 120 cm')
    .max(230, 'La taille ne peut pas dépasser 230 cm'),
  weight_kg: z.number()
    .min(30, 'Le poids doit être d\'au moins 30 kg')
    .max(300, 'Le poids ne peut pas dépasser 300 kg'),
  birthdate: z.string().optional(),
  target_weight_kg: z.number()
    .min(30, 'Le poids cible doit être d\'au moins 30 kg')
    .max(300, 'Le poids cible ne peut pas dépasser 300 kg')
    .optional(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'athlete']).optional(),
  objective: z.enum(['fat_loss', 'recomp', 'muscle_gain']).optional(),
  job_category: z.enum(['office', 'field', 'shift', 'manual', 'student', 'other']).optional(),
  phone_number: z.string().optional(),
});

type ProfileIdentityForm = z.infer<typeof profileIdentitySchema>;

/**
 * Enhanced Progress Bar Component - VisionOS 26 Style
 */
const ProgressBar: React.FC<{ 
  percentage: number; 
  title: string; 
  subtitle?: string;
  color?: string;
}> = ({ percentage, title, subtitle, color = '#60A5FA' }) => {
  return (
    <GlassCard className="p-6 mb-6" style={{
      background: `
        radial-gradient(circle at 30% 20%, color-mix(in srgb, ${color} 8%, transparent) 0%, transparent 60%),
        var(--glass-opacity)
      `,
      borderColor: `color-mix(in srgb, ${color} 20%, transparent)`
    }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <SpatialIcon Icon={ICONS.Target} size={16} style={{ color }} />
            {title}
          </h3>
          {subtitle && (
            <p className="text-white/60 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ 
                background: color,
                boxShadow: `0 0 8px ${color}60`
              }} 
            />
            <span className="text-white font-bold text-lg">
              {percentage}%
            </span>
          </div>
          <span className="text-white/60 text-xs">Complété</span>
        </div>
      </div>
      
      {/* Enhanced Progress Bar */}
      <div className="relative">
        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-3 rounded-full relative overflow-hidden"
            style={{ 
              background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 80%, white))`,
              boxShadow: `0 0 12px ${color}60, inset 0 1px 0 rgba(255,255,255,0.3)`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  rgba(255,255,255,0.4) 50%, 
                  transparent 100%
                )`,
                animation: 'progressShimmer 2s ease-in-out infinite'
              }}
            />
          </motion.div>
        </div>
        
        {/* Progress milestones */}
        <div className="flex justify-between mt-2 text-xs text-white/50">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </GlassCard>
  );
};

/**
 * Section Save Button Component
 */
const SectionSaveButton: React.FC<{
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  sectionName: string;
}> = ({ isDirty, isSaving, onSave, sectionName }) => {
  const { formSubmit } = useFeedback();
  
  if (!isDirty) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-end mt-4"
    >
      <button
        type="button"
        onClick={() => {
          formSubmit();
          onSave();
        }}
        disabled={isSaving}
        className="btn-glass px-4 py-2 text-sm"
      >
        <div className="flex items-center gap-2">
          {isSaving ? (
            <SpatialIcon Icon={ICONS.Loader2} size={14} className="animate-spin" />
          ) : (
            <SpatialIcon Icon={ICONS.Save} size={14} />
          )}
          <span>{isSaving ? 'Sauvegarde...' : `Sauvegarder ${sectionName}`}</span>
        </div>
      </button>
    </motion.div>
  );
};

/**
 * Profile Identity Tab - Refonte Complète VisionOS 26
 * Focus sur les informations personnelles de base uniquement
 */
const ProfileIdentityTab = React.memo(() => {
  const { profile, updateProfile, saving } = useUserStore();
  const { showToast } = useToast();
  const { success, formSubmit } = useFeedback();
  const [sectionSaving, setSectionSaving] = React.useState<string | null>(null);
  
  // Initialize form with current profile data
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty, dirtyFields },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<ProfileIdentityForm>({
    resolver: zodResolver(profileIdentitySchema),
    defaultValues: {
      displayName: profile?.displayName || '',
      sex: profile?.sex || undefined,
      height_cm: profile?.height_cm || undefined,
      weight_kg: profile?.weight_kg || undefined,
      birthdate: profile?.birthdate || '',
      target_weight_kg: profile?.target_weight_kg || undefined,
      activity_level: profile?.activity_level || undefined,
      objective: profile?.objective || undefined,
      job_category: profile?.job_category || undefined,
      phone_number: profile?.phoneNumber || '',
    },
    mode: 'onChange'
  });

  // Watch form values for real-time validation feedback
  const watchedValues = watch();
  
  // Calculate profile completion percentage
  const completionPercentage = React.useMemo(() => {
    const requiredFields = ['displayName', 'sex', 'height_cm', 'weight_kg'];
    const optionalFields = ['birthdate', 'target_weight_kg', 'activity_level', 'objective', 'job_category', 'phone_number'];
    
    const requiredCompleted = requiredFields.filter(field => {
      const value = watchedValues[field as keyof ProfileIdentityForm];
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return !isNaN(value) && value > 0;
      return !!value;
    }).length;
    
    const optionalCompleted = optionalFields.filter(field => {
      const value = watchedValues[field as keyof ProfileIdentityForm];
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return !isNaN(value) && value > 0;
      return !!value;
    }).length;
    
    const requiredWeight = 0.7; // 70% weight for required fields
    const optionalWeight = 0.3; // 30% weight for optional fields
    
    const requiredScore = (requiredCompleted / requiredFields.length) * requiredWeight;
    const optionalScore = (optionalCompleted / optionalFields.length) * optionalWeight;
    
    return Math.round((requiredScore + optionalScore) * 100);
  }, [watchedValues]);

  // Check if minimum required fields are completed
  const isProfileComplete = React.useMemo(() => {
    return !!(
      watchedValues.displayName?.trim() && 
      watchedValues.sex?.trim() && 
      typeof watchedValues.height_cm === 'number' && watchedValues.height_cm > 0 &&
      typeof watchedValues.weight_kg === 'number' && watchedValues.weight_kg > 0
    );
  }, [watchedValues.displayName, watchedValues.sex, watchedValues.height_cm, watchedValues.weight_kg]);

  // Reset form when profile changes
  React.useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName || '',
        sex: profile.sex || undefined,
        height_cm: profile.height_cm || undefined,
        weight_kg: profile.weight_kg || undefined,
        birthdate: profile.birthdate || '',
        target_weight_kg: profile.target_weight_kg || undefined,
        activity_level: profile.activity_level || undefined,
        objective: profile.objective || undefined,
        job_category: profile.job_category || undefined,
        phone_number: profile.phoneNumber || '',
      });
    }
  }, [profile, reset]);

  // Section-specific save handlers
  const saveRequiredSection = async () => {
    setSectionSaving('required');
    try {
      const isRequiredValid = await trigger(['displayName', 'sex', 'height_cm', 'weight_kg']);
      if (!isRequiredValid) return;

      await updateProfile({
        displayName: watchedValues.displayName,
        sex: watchedValues.sex,
        height_cm: watchedValues.height_cm,
        weight_kg: watchedValues.weight_kg,
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Informations de base sauvegardées',
        message: 'Vos informations essentielles ont été mises à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les informations de base',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const saveOptionalSection = async () => {
    setSectionSaving('optional');
    try {
      await updateProfile({
        birthdate: watchedValues.birthdate || null,
        target_weight_kg: watchedValues.target_weight_kg || null,
        activity_level: watchedValues.activity_level || null,
        objective: watchedValues.objective || null,
        job_category: watchedValues.job_category || null,
        phoneNumber: watchedValues.phone_number || null,
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Informations complémentaires sauvegardées',
        message: 'Vos préférences ont été mises à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les informations complémentaires',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const onSubmit = async (data: ProfileIdentityForm) => {
    try {
      formSubmit();
      
      logger.info('PROFILE_IDENTITY', 'Submitting complete profile updates', {
        userId: profile?.userId,
        completionPercentage,
        philosophy: 'complete_profile_submission'
      });

      await updateProfile({
        displayName: data.displayName,
        sex: data.sex,
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
        birthdate: data.birthdate || null,
        target_weight_kg: data.target_weight_kg || null,
        activity_level: data.activity_level || null,
        objective: data.objective || null,
        job_category: data.job_category || null,
        phoneNumber: data.phone_number || null,
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Profil complet sauvegardé',
        message: 'Toutes vos informations ont été mises à jour',
        duration: 4000,
      });

    } catch (error) {
      logger.error('PROFILE_IDENTITY', 'Profile update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: profile?.userId,
      });

      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder votre profil',
        duration: 4000,
      });
    }
  };

  // Check if required section has changes
  const hasRequiredChanges = !!(dirtyFields.displayName || dirtyFields.sex || dirtyFields.height_cm || dirtyFields.weight_kg);
  
  // Check if optional section has changes
  const hasOptionalChanges = !!(dirtyFields.birthdate || dirtyFields.target_weight_kg || dirtyFields.activity_level || dirtyFields.objective || dirtyFields.job_category || dirtyFields.phone_number);

  return (
    <div className="space-y-6">
      {/* Enhanced Progress Header */}
      <ProgressBar
        percentage={completionPercentage}
        title="Progression du Profil"
        subtitle="Complétez vos informations personnelles"
        color="#60A5FA"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Required Information Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(96, 165, 250, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(96, 165, 250, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.User} size={20} className="text-blue-400" />
              </div>
              Informations Essentielles
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-300 text-sm font-medium">Requis</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-white/90 text-sm font-medium mb-3">
                Nom d'affichage *
              </label>
              <input
                {...register('displayName')}
                type="text"
                id="displayName"
                className="glass-input"
                placeholder="Votre nom"
              />
              {errors.displayName && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.displayName.message}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="sex" className="block text-white/90 text-sm font-medium mb-3">
                Genre *
              </label>
              <select
                {...register('sex')}
                id="sex"
                className="glass-input"
              >
                <option value="">Sélectionnez votre genre</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
              </select>
              {errors.sex && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.sex.message}
                </p>
              )}
            </div>

            {/* Height */}
            <div>
              <label htmlFor="height_cm" className="block text-white/90 text-sm font-medium mb-3">
                Taille (cm) *
              </label>
              <input
                {...register('height_cm', { valueAsNumber: true })}
                type="number"
                id="height_cm"
                min="120"
                max="230"
                step="1"
                className="glass-input"
                placeholder="175"
              />
              {errors.height_cm && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.height_cm.message}
                </p>
              )}
            </div>

            {/* Weight */}
            <div>
              <label htmlFor="weight_kg" className="block text-white/90 text-sm font-medium mb-3">
                Poids (kg) *
              </label>
              <input
                {...register('weight_kg', { valueAsNumber: true })}
                type="number"
                id="weight_kg"
                min="30"
                max="300"
                step="0.1"
                className="glass-input"
                placeholder="70"
              />
              {errors.weight_kg && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.weight_kg.message}
                </p>
              )}
            </div>
          </div>

          {/* Section Save Button */}
          <SectionSaveButton
            isDirty={hasRequiredChanges}
            isSaving={sectionSaving === 'required'}
            onSave={saveRequiredSection}
            sectionName="Essentielles"
          />
        </GlassCard>

        {/* Personal Details Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(139, 92, 246, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.Calendar} size={20} className="text-purple-400" />
              </div>
              Détails Personnels
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-purple-300 text-sm font-medium">Optionnel</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Birthdate */}
            <div>
              <label htmlFor="birthdate" className="block text-white/90 text-sm font-medium mb-3">
                Date de naissance
              </label>
              <input
                {...register('birthdate')}
                type="date"
                id="birthdate"
                className="glass-input"
              />
              {errors.birthdate && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.birthdate.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone_number" className="block text-white/90 text-sm font-medium mb-3">
                Numéro de téléphone
              </label>
              <input
                {...register('phone_number')}
                type="tel"
                id="phone_number"
                className="glass-input"
                placeholder="+33 6 12 34 56 78"
              />
              {errors.phone_number && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.phone_number.message}
                </p>
              )}
            </div>

            {/* Job Category */}
            <div>
              <label htmlFor="job_category" className="block text-white/90 text-sm font-medium mb-3">
                Catégorie professionnelle
              </label>
              <select
                {...register('job_category')}
                id="job_category"
                className="glass-input"
              >
                <option value="">Sélectionnez votre activité</option>
                <option value="office">Bureau</option>
                <option value="field">Terrain</option>
                <option value="shift">Équipes</option>
                <option value="manual">Manuel</option>
                <option value="student">Étudiant</option>
                <option value="other">Autre</option>
              </select>
              {errors.job_category && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.job_category.message}
                </p>
              )}
            </div>
          </div>

          {/* Section Save Button */}
          <SectionSaveButton
            isDirty={hasOptionalChanges && !hasRequiredChanges}
            isSaving={sectionSaving === 'optional'}
            onSave={saveOptionalSection}
            sectionName="Personnels"
          />
        </GlassCard>

        {/* Fitness Goals Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(34, 197, 94, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(34, 197, 94, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.Target} size={20} className="text-green-400" />
              </div>
              Objectifs Fitness
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-300 text-sm font-medium">Recommandé</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Weight */}
            <div>
              <label htmlFor="target_weight_kg" className="block text-white/90 text-sm font-medium mb-3">
                Poids cible (kg)
              </label>
              <input
                {...register('target_weight_kg', { valueAsNumber: true })}
                type="number"
                id="target_weight_kg"
                min="30"
                max="300"
                step="0.1"
                className="glass-input"
                placeholder="65"
              />
              {errors.target_weight_kg && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.target_weight_kg.message}
                </p>
              )}
            </div>

            {/* Activity Level */}
            <div>
              <label htmlFor="activity_level" className="block text-white/90 text-sm font-medium mb-3">
                Niveau d'activité
              </label>
              <select
                {...register('activity_level')}
                id="activity_level"
                className="glass-input"
              >
                <option value="">Sélectionnez votre niveau</option>
                <option value="sedentary">Sédentaire</option>
                <option value="light">Léger</option>
                <option value="moderate">Modéré</option>
                <option value="active">Actif</option>
                <option value="athlete">Athlète</option>
              </select>
              {errors.activity_level && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.activity_level.message}
                </p>
              )}
            </div>

            {/* Objective */}
            <div className="md:col-span-2">
              <label htmlFor="objective" className="block text-white/90 text-sm font-medium mb-3">
                Objectif principal
              </label>
              <select
                {...register('objective')}
                id="objective"
                className="glass-input"
              >
                <option value="">Sélectionnez votre objectif</option>
                <option value="fat_loss">Perte de graisse</option>
                <option value="recomp">Recomposition corporelle</option>
                <option value="muscle_gain">Prise de muscle</option>
              </select>
              {errors.objective && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.objective.message}
                </p>
              )}
            </div>
          </div>

          {/* Section Save Button */}
          <SectionSaveButton
            isDirty={hasOptionalChanges && !hasRequiredChanges}
            isSaving={sectionSaving === 'fitness'}
            onSave={saveOptionalSection}
            sectionName="Fitness"
          />
        </GlassCard>

        {/* BMI Calculator Card */}
        {watchedValues.height_cm && watchedValues.weight_kg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="p-6" style={{
              background: `
                radial-gradient(circle at 30% 20%, rgba(52, 211, 153, 0.08) 0%, transparent 60%),
                var(--glass-opacity)
              `,
              borderColor: 'rgba(52, 211, 153, 0.2)'
            }}>
              <h3 className="text-white font-semibold text-xl mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <SpatialIcon Icon={ICONS.Activity} size={20} className="text-emerald-400" />
                </div>
                Calculs Automatiques
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* BMI */}
                <div className="text-center p-6 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">
                    {((watchedValues.weight_kg || 0) / Math.pow((watchedValues.height_cm || 175) / 100, 2)).toFixed(1)}
                  </div>
                  <div className="text-emerald-300 text-sm font-medium">Indice de Masse Corporelle</div>
                </div>

                {/* BMI Category */}
                <div className="text-center p-6 rounded-xl bg-blue-500/10 border border-blue-400/20">
                  <div className="text-xl font-bold text-blue-400 mb-2">
                    {getBMICategory((watchedValues.weight_kg || 0) / Math.pow((watchedValues.height_cm || 175) / 100, 2))}
                  </div>
                  <div className="text-blue-300 text-sm font-medium">Catégorie</div>
                </div>

                {/* Weight Difference */}
                {watchedValues.target_weight_kg && (
                  <div className="text-center p-6 rounded-xl bg-purple-500/10 border border-purple-400/20">
                    <div className="text-xl font-bold text-purple-400 mb-2">
                      {watchedValues.target_weight_kg > watchedValues.weight_kg ? '+' : ''}
                      {(watchedValues.target_weight_kg - watchedValues.weight_kg).toFixed(1)} kg
                    </div>
                    <div className="text-purple-300 text-sm font-medium">Objectif</div>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Profile Complete Status */}
        {isProfileComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <GlassCard className="p-6 text-center" style={{
              background: `
                radial-gradient(circle at 30% 20%, rgba(34, 197, 94, 0.12) 0%, transparent 60%),
                radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
                var(--glass-opacity)
              `,
              borderColor: 'rgba(34, 197, 94, 0.3)',
              boxShadow: `
                0 8px 32px rgba(0, 0, 0, 0.2),
                0 0 20px rgba(34, 197, 94, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.15)
              `
            }}>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-400/40">
                <SpatialIcon Icon={ICONS.Check} size={36} className="text-green-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">Profil Identité Complet !</h3>
              <p className="text-green-200 text-base mb-6 max-w-md mx-auto leading-relaxed">
                Toutes vos informations personnelles essentielles sont renseignées. 
                Votre profil TwinForge est maintenant configuré.
              </p>
            </GlassCard>
          </motion.div>
        )}

        {/* Global Save Action */}
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className={`btn-glass--primary px-8 py-4 text-lg font-semibold ${
              !isDirty ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {saving ? (
                <SpatialIcon Icon={ICONS.Loader2} size={20} className="animate-spin" />
              ) : (
                <SpatialIcon Icon={ICONS.Save} size={20} />
              )}
              <span>{saving ? 'Sauvegarde globale...' : 'Sauvegarder Tout'}</span>
            </div>
          </button>
        </div>

        {/* Validation Summary */}
        {Object.keys(errors).length > 0 && (
          <GlassCard className="p-4" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)'
          }}>
            <h4 className="text-red-300 font-medium mb-3 flex items-center gap-2">
              <SpatialIcon Icon={ICONS.AlertCircle} size={16} />
              Erreurs de validation
            </h4>
            <div className="space-y-2">
              {Object.entries(errors).map(([field, error]) => (
                <p key={field} className="text-red-200 text-sm flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-red-400" />
                  {error.message}
                </p>
              ))}
            </div>
          </GlassCard>
        )}
      </form>
    </div>
  );
});

ProfileIdentityTab.displayName = 'ProfileIdentityTab';

/**
 * Get BMI category for display
 */
function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Insuffisant';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Surpoids';
  return 'Obésité';
}

export default ProfileIdentityTab;