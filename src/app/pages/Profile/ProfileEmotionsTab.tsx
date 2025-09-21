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

// Enhanced Progress Bar Component
const ProgressBar: React.FC<{ 
  percentage: number; 
  title: string; 
  subtitle?: string;
  color?: string;
}> = ({ percentage, title, subtitle, color = '#F59E0B' }) => {
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

// Validation schema for emotions data
const emotionsSchema = z.object({
  chronotype: z.enum(['morning', 'evening', 'intermediate']).optional(),
  stress: z.number().min(1).max(10).optional(),
  sleepHours: z.number().min(4).max(12).optional(),
  moodBaseline: z.enum(['very_low', 'low', 'neutral', 'good', 'very_good']).optional(),
  sensitivities: z.array(z.string()).default([]),
});

type EmotionsForm = z.infer<typeof emotionsSchema>;

/**
 * Profile Emotions Tab - Bien-être Émotionnel TwinForge
 * Gestion complète des données émotionnelles avec design VisionOS 26
 */
const ProfileEmotionsTab: React.FC = () => {
  const { profile, updateProfile, saving } = useUserStore();
  const { showToast } = useToast();
  const { success, formSubmit } = useFeedback();
  const [sectionSaving, setSectionSaving] = React.useState<string | null>(null);
  const [newSensitivity, setNewSensitivity] = React.useState('');

  // Initialize form with current emotions data
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<EmotionsForm>({
    resolver: zodResolver(emotionsSchema),
    defaultValues: {
      chronotype: profile?.emotions?.chronotype || undefined,
      stress: profile?.emotions?.stress || undefined,
      sleepHours: profile?.emotions?.sleepHours || undefined,
      moodBaseline: profile?.emotionBaseline?.moodBaseline || undefined,
      sensitivities: profile?.emotions?.sensitivities || [],
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  // Calculate completion percentage
  const completionPercentage = React.useMemo(() => {
    const fields = [
      { value: watchedValues.chronotype, validator: (v: any) => typeof v === 'string' && v.trim() !== '' },
      { value: watchedValues.stress, validator: (v: any) => typeof v === 'number' && !isNaN(v) && v >= 1 && v <= 10 },
      { value: watchedValues.sleepHours, validator: (v: any) => typeof v === 'number' && !isNaN(v) && v >= 4 && v <= 12 },
      { value: watchedValues.moodBaseline, validator: (v: any) => typeof v === 'string' && v.trim() !== '' },
      { value: watchedValues.sensitivities, validator: (v: any) => Array.isArray(v) && v.length > 0 },
    ];
    
    const completed = fields.filter(field => field.validator(field.value)).length;
    return Math.round((completed / fields.length) * 100);
  }, [watchedValues]);

  // Reset form when profile changes
  React.useEffect(() => {
    if (profile) {
      reset({
        chronotype: profile.emotions?.chronotype || undefined,
        stress: profile.emotions?.stress || undefined,
        sleepHours: profile.emotions?.sleepHours || undefined,
        moodBaseline: profile.emotionBaseline?.moodBaseline || undefined,
        sensitivities: profile.emotions?.sensitivities || [],
      });
    }
  }, [profile, reset]);

  // Add/remove functions for sensitivities
  const addSensitivity = () => {
    if (newSensitivity.trim()) {
      const current = watchedValues.sensitivities || [];
      setValue('sensitivities', [...current, newSensitivity.trim()], { shouldDirty: true });
      setNewSensitivity('');
    }
  };

  const removeSensitivity = (index: number) => {
    const current = watchedValues.sensitivities || [];
    setValue('sensitivities', current.filter((_, i) => i !== index), { shouldDirty: true });
  };

  // Section-specific save handlers
  const saveSleepSection = async () => {
    setSectionSaving('sleep');
    try {
      await updateProfile({
        emotions: {
          ...profile?.emotions,
          chronotype: watchedValues.chronotype,
          sleepHours: watchedValues.sleepHours,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Données de sommeil sauvegardées',
        message: 'Votre chronotype et heures de sommeil ont été mis à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les données de sommeil',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const saveMoodSection = async () => {
    setSectionSaving('mood');
    try {
      await updateProfile({
        emotions: {
          ...profile?.emotions,
          stress: watchedValues.stress,
          sensitivities: watchedValues.sensitivities,
        },
        emotionBaseline: {
          ...profile?.emotionBaseline,
          moodBaseline: watchedValues.moodBaseline,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Données émotionnelles sauvegardées',
        message: 'Votre profil de bien-être a été mis à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les données émotionnelles',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const onSubmit = async (data: EmotionsForm) => {
    try {
      formSubmit();
      
      logger.info('PROFILE_EMOTIONS', 'Submitting complete emotions updates', {
        userId: profile?.userId,
        completionPercentage,
        philosophy: 'complete_emotions_submission'
      });

      await updateProfile({
        emotions: {
          ...profile?.emotions,
          chronotype: data.chronotype,
          stress: data.stress,
          sleepHours: data.sleepHours,
          sensitivities: data.sensitivities,
        },
        emotionBaseline: {
          ...profile?.emotionBaseline,
          moodBaseline: data.moodBaseline,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Profil émotionnel sauvegardé',
        message: 'Toutes vos données de bien-être ont été mises à jour',
        duration: 4000,
      });

    } catch (error) {
      logger.error('PROFILE_EMOTIONS', 'Emotions update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: profile?.userId,
      });

      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder votre profil émotionnel',
        duration: 4000,
      });
    }
  };

  // Check for section changes
  const hasSleepChanges = !!(dirtyFields.chronotype || dirtyFields.sleepHours);
  const hasMoodChanges = !!(dirtyFields.stress || dirtyFields.moodBaseline || dirtyFields.sensitivities);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <ProgressBar
        percentage={completionPercentage}
        title="Bien-être Émotionnel"
        subtitle="Configurez votre profil de sommeil et d'humeur"
        color="#F59E0B"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sleep & Chronotype Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(245, 158, 11, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.Moon} size={20} className="text-orange-400" />
              </div>
              Sommeil & Rythme
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-orange-300 text-sm font-medium">Circadien</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chronotype */}
            <div>
              <label htmlFor="chronotype" className="block text-white/90 text-sm font-medium mb-3">
                Chronotype
              </label>
              <select
                {...register('chronotype')}
                id="chronotype"
                className="glass-input"
              >
                <option value="">Sélectionnez votre chronotype</option>
                <option value="morning">Matinal (Alouette)</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="evening">Tardif (Hibou)</option>
              </select>
              {errors.chronotype && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.chronotype.message}
                </p>
              )}
            </div>

            {/* Sleep Hours */}
            <div>
              <label htmlFor="sleepHours" className="block text-white/90 text-sm font-medium mb-3">
                Heures de sommeil moyennes
              </label>
              <input
                {...register('sleepHours', { valueAsNumber: true })}
                type="number"
                id="sleepHours"
                min="4"
                max="12"
                step="0.5"
                className="glass-input"
                placeholder="8"
              />
              {errors.sleepHours && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.sleepHours.message}
                </p>
              )}
            </div>
          </div>

          <SectionSaveButton
            isDirty={hasSleepChanges}
            isSaving={sectionSaving === 'sleep'}
            onSave={saveSleepSection}
            sectionName="Sommeil"
          />
        </GlassCard>

        {/* Mood & Stress Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(245, 158, 11, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.Smile} size={20} className="text-orange-400" />
              </div>
              Humeur & Stress
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-orange-300 text-sm font-medium">Psychologique</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stress Level */}
            <div>
              <label htmlFor="stress" className="block text-white/90 text-sm font-medium mb-3">
                Niveau de stress perçu (1-10)
              </label>
              <input
                {...register('stress', { valueAsNumber: true })}
                type="range"
                id="stress"
                min="1"
                max="10"
                step="1"
                className="enhanced-morph-slider w-full"
              />
              <div className="flex justify-between text-xs text-white/60 mt-2">
                <span>Très faible</span>
                <span className="text-white font-medium">
                  {watchedValues.stress ? `${watchedValues.stress}/10` : 'Non défini'}
                </span>
                <span>Très élevé</span>
              </div>
              {errors.stress && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.stress.message}
                </p>
              )}
            </div>

            {/* Mood Baseline */}
            <div>
              <label htmlFor="moodBaseline" className="block text-white/90 text-sm font-medium mb-3">
                Humeur de base
              </label>
              <select
                {...register('moodBaseline')}
                id="moodBaseline"
                className="glass-input"
              >
                <option value="">Sélectionnez votre humeur habituelle</option>
                <option value="very_low">Très basse</option>
                <option value="low">Basse</option>
                <option value="neutral">Neutre</option>
                <option value="good">Bonne</option>
                <option value="very_good">Très bonne</option>
              </select>
              {errors.moodBaseline && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.moodBaseline.message}
                </p>
              )}
            </div>
          </div>

          {/* Sensitivities */}
          <div className="mt-6">
            <label className="block text-white/90 text-sm font-medium mb-3">
              Sensibilités comportementales
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSensitivity}
                  onChange={(e) => setNewSensitivity(e.target.value)}
                  className="glass-input flex-1"
                  placeholder="Ex: grignotage sucré, stress alimentaire..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSensitivity();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addSensitivity}
                  className="btn-glass px-4"
                >
                  <SpatialIcon Icon={ICONS.Plus} size={14} />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(watchedValues.sensitivities || []).map((sensitivity, index) => (
                  <motion.div
                    key={index}
                    className="chip chip--on flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      color: 'rgb(245, 158, 11)'
                    }}
                  >
                    <span>{sensitivity}</span>
                    <button
                      type="button"
                      onClick={() => removeSensitivity(index)}
                      className="text-orange-300 hover:text-orange-200"
                    >
                      <SpatialIcon Icon={ICONS.X} size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <SectionSaveButton
            isDirty={hasMoodChanges}
            isSaving={sectionSaving === 'mood'}
            onSave={saveMoodSection}
            sectionName="Humeur"
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
};

export default ProfileEmotionsTab;