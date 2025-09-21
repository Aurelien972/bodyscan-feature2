import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../../ui/cards/GlassCard';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useUserStore } from '../../../system/store/userStore';
import { useToast } from '../../../ui/components/ToastProvider';
import { useFeedback } from '../../../hooks/useFeedback';
import logger from '../../../lib/utils/logger';

// Enhanced Progress Bar Component
const ProgressBar: React.FC<{ 
  percentage: number; 
  title: string; 
  subtitle?: string;
  color?: string;
}> = ({ percentage, title, subtitle, color = '#06B6D4' }) => {
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

// Section Save Button Component
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

// Validation schema for preferences data
const preferencesSchema = z.object({
  workout: z.object({
    type: z.enum(['strength', 'cardio', 'mixed', 'yoga', 'pilates', 'crossfit', 'bodyweight', 'sports']).optional(),
    sessionsPerWeek: z.number().min(0).max(14).optional(),
    preferredDuration: z.number().min(15).max(180).optional(),
    equipment: z.array(z.string()).default([]),
    morningWorkouts: z.boolean().optional(),
    highIntensity: z.boolean().optional(),
    groupWorkouts: z.boolean().optional(),
    outdoorActivities: z.boolean().optional(),
  }).optional(),
});

type PreferencesForm = z.infer<typeof preferencesSchema>;

/**
 * Profile Preferences Tab - Préférences Générales TwinForge
 * Gestion complète des préférences d'entraînement avec design VisionOS 26
 */
const ProfilePreferencesTab: React.FC = () => {
  const { profile, updateProfile, saving } = useUserStore();
  const { showToast } = useToast();
  const { success, formSubmit } = useFeedback();
  const [sectionSaving, setSectionSaving] = React.useState<string | null>(null);
  const [newEquipment, setNewEquipment] = React.useState('');

  // Initialize form with current preferences data
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      workout: {
        type: profile?.preferences?.workout?.type || undefined,
        sessionsPerWeek: profile?.preferences?.workout?.sessionsPerWeek || undefined,
        preferredDuration: profile?.preferences?.workout?.preferredDuration || undefined,
        equipment: profile?.preferences?.workout?.equipment || [],
        morningWorkouts: profile?.preferences?.workout?.morningWorkouts || false,
        highIntensity: profile?.preferences?.workout?.highIntensity || false,
        groupWorkouts: profile?.preferences?.workout?.groupWorkouts || false,
        outdoorActivities: profile?.preferences?.workout?.outdoorActivities || false,
      },
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  // Calculate completion percentage
  const completionPercentage = React.useMemo(() => {
    const workout = watchedValues.workout;
    const fields = [
      { value: workout?.type, validator: (v: any) => typeof v === 'string' && v.trim() !== '' },
      { value: workout?.sessionsPerWeek, validator: (v: any) => typeof v === 'number' && !isNaN(v) && v >= 0 && v <= 14 },
      { value: workout?.preferredDuration, validator: (v: any) => typeof v === 'number' && !isNaN(v) && v >= 15 && v <= 180 },
      { value: workout?.equipment, validator: (v: any) => Array.isArray(v) && v.length > 0 },
      { value: workout?.morningWorkouts, validator: (v: any) => typeof v === 'boolean' },
      { value: workout?.highIntensity, validator: (v: any) => typeof v === 'boolean' },
      { value: workout?.groupWorkouts, validator: (v: any) => typeof v === 'boolean' },
      { value: workout?.outdoorActivities, validator: (v: any) => typeof v === 'boolean' },
    ];
    
    const completed = fields.filter(field => field.validator(field.value)).length;
    return Math.round((completed / fields.length) * 100);
  }, [watchedValues]);

  // Reset form when profile changes
  React.useEffect(() => {
    if (profile?.preferences?.workout) {
      reset({
        workout: {
          type: profile.preferences.workout.type || undefined,
          sessionsPerWeek: profile.preferences.workout.sessionsPerWeek || undefined,
          preferredDuration: profile.preferences.workout.preferredDuration || undefined,
          equipment: profile.preferences.workout.equipment || [],
          morningWorkouts: profile.preferences.workout.morningWorkouts || false,
          highIntensity: profile.preferences.workout.highIntensity || false,
          groupWorkouts: profile.preferences.workout.groupWorkouts || false,
          outdoorActivities: profile.preferences.workout.outdoorActivities || false,
        },
      });
    }
  }, [profile?.preferences?.workout, reset]);

  // Add/remove equipment
  const addEquipment = () => {
    if (newEquipment.trim()) {
      const current = watchedValues.workout?.equipment || [];
      setValue('workout.equipment', [...current, newEquipment.trim()], { shouldDirty: true });
      setNewEquipment('');
    }
  };

  const removeEquipment = (index: number) => {
    const current = watchedValues.workout?.equipment || [];
    setValue('workout.equipment', current.filter((_, i) => i !== index), { shouldDirty: true });
  };

  // Section-specific save handlers
  const saveWorkoutBasicsSection = async () => {
    setSectionSaving('basics');
    try {
      await updateProfile({
        preferences: {
          ...profile?.preferences,
          workout: {
            ...profile?.preferences?.workout,
            type: watchedValues.workout?.type,
            sessionsPerWeek: watchedValues.workout?.sessionsPerWeek,
            preferredDuration: watchedValues.workout?.preferredDuration,
          },
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Préférences d\'entraînement sauvegardées',
        message: 'Vos préférences de base ont été mises à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les préférences d\'entraînement',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const saveWorkoutPrefsSection = async () => {
    setSectionSaving('prefs');
    try {
      await updateProfile({
        preferences: {
          ...profile?.preferences,
          workout: {
            ...profile?.preferences?.workout,
            equipment: watchedValues.workout?.equipment,
            morningWorkouts: watchedValues.workout?.morningWorkouts,
            highIntensity: watchedValues.workout?.highIntensity,
            groupWorkouts: watchedValues.workout?.groupWorkouts,
            outdoorActivities: watchedValues.workout?.outdoorActivities,
          },
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Préférences d\'activité sauvegardées',
        message: 'Vos préférences d\'activité ont été mises à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les préférences d\'activité',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const onSubmit = async (data: PreferencesForm) => {
    try {
      formSubmit();
      
      logger.info('PROFILE_PREFERENCES', 'Submitting complete preferences updates', {
        userId: profile?.userId,
        completionPercentage,
        philosophy: 'complete_preferences_submission'
      });

      await updateProfile({
        preferences: {
          ...profile?.preferences,
          workout: data.workout,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Préférences sauvegardées',
        message: 'Toutes vos préférences ont été mises à jour',
        duration: 4000,
      });

    } catch (error) {
      logger.error('PROFILE_PREFERENCES', 'Preferences update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: profile?.userId,
      });

      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder vos préférences',
        duration: 4000,
      });
    }
  };

  // Check for section changes
  const hasBasicsChanges = !!(dirtyFields.workout?.type || dirtyFields.workout?.sessionsPerWeek || dirtyFields.workout?.preferredDuration);
  const hasPrefsChanges = !!(dirtyFields.workout?.equipment || dirtyFields.workout?.morningWorkouts || dirtyFields.workout?.highIntensity || dirtyFields.workout?.groupWorkouts || dirtyFields.workout?.outdoorActivities);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <ProgressBar
        percentage={completionPercentage}
        title="Préférences d'Entraînement"
        subtitle="Configurez vos préférences d'activité physique"
        color="#06B6D4"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Workout Basics Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(6, 182, 212, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.Zap} size={20} className="text-cyan-400" />
              </div>
              Entraînement de Base
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-cyan-300 text-sm font-medium">Essentiel</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workout Type */}
            <div>
              <label htmlFor="workout.type" className="block text-white/90 text-sm font-medium mb-3">
                Type d'entraînement préféré
              </label>
              <select
                {...register('workout.type')}
                id="workout.type"
                className="glass-input"
              >
                <option value="">Sélectionnez votre type d'entraînement</option>
                <option value="strength">Musculation</option>
                <option value="cardio">Cardio</option>
                <option value="mixed">Mixte</option>
                <option value="yoga">Yoga</option>
                <option value="pilates">Pilates</option>
                <option value="crossfit">CrossFit</option>
                <option value="bodyweight">Poids du corps</option>
                <option value="sports">Sports</option>
              </select>
              {errors.workout?.type && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.workout.type.message}
                </p>
              )}
            </div>

            {/* Sessions Per Week */}
            <div>
              <label htmlFor="workout.sessionsPerWeek" className="block text-white/90 text-sm font-medium mb-3">
                Séances par semaine
              </label>
              <input
                {...register('workout.sessionsPerWeek', { valueAsNumber: true })}
                type="number"
                id="workout.sessionsPerWeek"
                min="0"
                max="14"
                step="1"
                className="glass-input"
                placeholder="3"
              />
              {errors.workout?.sessionsPerWeek && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.workout.sessionsPerWeek.message}
                </p>
              )}
            </div>

            {/* Preferred Duration */}
            <div className="md:col-span-2">
              <label htmlFor="workout.preferredDuration" className="block text-white/90 text-sm font-medium mb-3">
                Durée préférée par séance (minutes)
              </label>
              <input
                {...register('workout.preferredDuration', { valueAsNumber: true })}
                type="number"
                id="workout.preferredDuration"
                min="15"
                max="180"
                step="15"
                className="glass-input"
                placeholder="60"
              />
              {errors.workout?.preferredDuration && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.workout.preferredDuration.message}
                </p>
              )}
            </div>
          </div>

          <SectionSaveButton
            isDirty={hasBasicsChanges}
            isSaving={sectionSaving === 'basics'}
            onSave={saveWorkoutBasicsSection}
            sectionName="Base"
          />
        </GlassCard>

        {/* Equipment & Preferences Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(6, 182, 212, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.Settings} size={20} className="text-cyan-400" />
              </div>
              Équipement & Préférences
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-cyan-300 text-sm font-medium">Personnalisé</span>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Equipment */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-3">
                Équipement disponible
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEquipment}
                    onChange={(e) => setNewEquipment(e.target.value)}
                    className="glass-input flex-1"
                    placeholder="Ex: haltères, tapis de course, élastiques..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEquipment();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addEquipment}
                    className="btn-glass px-4"
                  >
                    <SpatialIcon Icon={ICONS.Plus} size={14} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(watchedValues.workout?.equipment || []).map((equipment, index) => (
                    <motion.div
                      key={index}
                      className="chip chip--on flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{
                        background: 'rgba(6, 182, 212, 0.15)',
                        borderColor: 'rgba(6, 182, 212, 0.3)',
                        color: 'rgb(6, 182, 212)'
                      }}
                    >
                      <span>{equipment}</span>
                      <button
                        type="button"
                        onClick={() => removeEquipment(index)}
                        className="text-cyan-300 hover:text-cyan-200"
                      >
                        <SpatialIcon Icon={ICONS.X} size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Workout Preferences */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-4">
                Préférences d'activité
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Morning Workouts */}
                <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/8 transition-colors">
                  <input
                    {...register('workout.morningWorkouts')}
                    type="checkbox"
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    watchedValues.workout?.morningWorkouts 
                      ? 'bg-cyan-500 border-cyan-400' 
                      : 'border-white/30'
                  }`}>
                    {watchedValues.workout?.morningWorkouts && (
                      <SpatialIcon Icon={ICONS.Check} size={12} className="text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">Entraînements matinaux</div>
                    <div className="text-white/60 text-sm">Préférence pour s'entraîner le matin</div>
                  </div>
                </label>

                {/* High Intensity */}
                <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/8 transition-colors">
                  <input
                    {...register('workout.highIntensity')}
                    type="checkbox"
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    watchedValues.workout?.highIntensity 
                      ? 'bg-cyan-500 border-cyan-400' 
                      : 'border-white/30'
                  }`}>
                    {watchedValues.workout?.highIntensity && (
                      <SpatialIcon Icon={ICONS.Check} size={12} className="text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">Haute intensité</div>
                    <div className="text-white/60 text-sm">Préférence pour les entraînements intenses</div>
                  </div>
                </label>

                {/* Group Workouts */}
                <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/8 transition-colors">
                  <input
                    {...register('workout.groupWorkouts')}
                    type="checkbox"
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    watchedValues.workout?.groupWorkouts 
                      ? 'bg-cyan-500 border-cyan-400' 
                      : 'border-white/30'
                  }`}>
                    {watchedValues.workout?.groupWorkouts && (
                      <SpatialIcon Icon={ICONS.Check} size={12} className="text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">Entraînements en groupe</div>
                    <div className="text-white/60 text-sm">Préférence pour s'entraîner avec d'autres</div>
                  </div>
                </label>

                {/* Outdoor Activities */}
                <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/8 transition-colors">
                  <input
                    {...register('workout.outdoorActivities')}
                    type="checkbox"
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    watchedValues.workout?.outdoorActivities 
                      ? 'bg-cyan-500 border-cyan-400' 
                      : 'border-white/30'
                  }`}>
                    {watchedValues.workout?.outdoorActivities && (
                      <SpatialIcon Icon={ICONS.Check} size={12} className="text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">Activités extérieures</div>
                    <div className="text-white/60 text-sm">Préférence pour les activités en plein air</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <SectionSaveButton
            isDirty={hasPrefsChanges}
            isSaving={sectionSaving === 'prefs'}
            onSave={saveWorkoutPrefsSection}
            sectionName="Préférences"
          />
        </GlassCard>

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
              <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
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
};

export default ProfilePreferencesTab;