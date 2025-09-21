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
}> = ({ percentage, title, subtitle, color = '#10B981' }) => {
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

// Validation schema for nutrition data
const nutritionSchema = z.object({
  diet: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  intolerances: z.array(z.string()).default([]),
  disliked: z.array(z.string()).default([]),
  budgetLevel: z.enum(['low', 'medium', 'high']).optional(),
  proteinTarget_g: z.number().min(0).max(300).optional(),
  fastingWindow: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    windowHours: z.number().min(8).max(24).optional(),
    mealsPerDay: z.number().min(1).max(8).optional(),
  }).optional(),
});

type NutritionForm = z.infer<typeof nutritionSchema>;

/**
 * Profile Nutrition Tab - Forge Nutritionnelle TwinForge
 * Gestion complète des données nutritionnelles avec design VisionOS 26
 */
const ProfileNutritionTab: React.FC = () => {
  const { profile, updateProfile, saving } = useUserStore();
  const { showToast } = useToast();
  const { success, formSubmit } = useFeedback();
  const [sectionSaving, setSectionSaving] = React.useState<string | null>(null);
  const [newAllergy, setNewAllergy] = React.useState('');
  const [newIntolerance, setNewIntolerance] = React.useState('');
  const [newDisliked, setNewDisliked] = React.useState('');

  // Initialize form with current nutrition data
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<NutritionForm>({
    resolver: zodResolver(nutritionSchema),
    defaultValues: {
      diet: profile?.nutrition?.diet || '',
      allergies: profile?.nutrition?.allergies || [],
      intolerances: profile?.nutrition?.intolerances || [],
      disliked: profile?.nutrition?.disliked || [],
      budgetLevel: profile?.nutrition?.budgetLevel || undefined,
      proteinTarget_g: profile?.nutrition?.proteinTarget_g || undefined,
      fastingWindow: {
        start: profile?.nutrition?.fastingWindow?.start || '',
        end: profile?.nutrition?.fastingWindow?.end || '',
        windowHours: profile?.nutrition?.fastingWindow?.windowHours || undefined,
        mealsPerDay: profile?.nutrition?.fastingWindow?.mealsPerDay || undefined,
      },
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  // Calculate completion percentage
  const completionPercentage = React.useMemo(() => {
    const fields = [
      { value: watchedValues.diet, validator: (v: any) => typeof v === 'string' && v.trim() !== '' },
      { value: watchedValues.allergies, validator: (v: any) => Array.isArray(v) && v.length > 0 },
      { value: watchedValues.intolerances, validator: (v: any) => Array.isArray(v) && v.length > 0 },
      { value: watchedValues.disliked, validator: (v: any) => Array.isArray(v) && v.length > 0 },
      { value: watchedValues.budgetLevel, validator: (v: any) => typeof v === 'string' && v.trim() !== '' },
      { value: watchedValues.proteinTarget_g, validator: (v: any) => typeof v === 'number' && !isNaN(v) && v > 0 },
      { value: watchedValues.fastingWindow?.windowHours, validator: (v: any) => typeof v === 'number' && !isNaN(v) && v > 0 },
    ];
    
    const completed = fields.filter(field => field.validator(field.value)).length;
    return Math.round((completed / fields.length) * 100);
  }, [watchedValues]);

  // Reset form when profile changes
  React.useEffect(() => {
    if (profile?.nutrition) {
      reset({
        diet: profile.nutrition.diet || '',
        allergies: profile.nutrition.allergies || [],
        intolerances: profile.nutrition.intolerances || [],
        disliked: profile.nutrition.disliked || [],
        budgetLevel: profile.nutrition.budgetLevel || undefined,
        proteinTarget_g: profile.nutrition.proteinTarget_g || undefined,
        fastingWindow: {
          start: profile.nutrition.fastingWindow?.start || '',
          end: profile.nutrition.fastingWindow?.end || '',
          windowHours: profile.nutrition.fastingWindow?.windowHours || undefined,
          mealsPerDay: profile.nutrition.fastingWindow?.mealsPerDay || undefined,
        },
      });
    }
  }, [profile?.nutrition, reset]);

  // Add/remove functions for arrays
  const addAllergy = () => {
    if (newAllergy.trim()) {
      const current = watchedValues.allergies || [];
      setValue('allergies', [...current, newAllergy.trim()], { shouldDirty: true });
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    const current = watchedValues.allergies || [];
    setValue('allergies', current.filter((_, i) => i !== index), { shouldDirty: true });
  };

  const addIntolerance = () => {
    if (newIntolerance.trim()) {
      const current = watchedValues.intolerances || [];
      setValue('intolerances', [...current, newIntolerance.trim()], { shouldDirty: true });
      setNewIntolerance('');
    }
  };

  const removeIntolerance = (index: number) => {
    const current = watchedValues.intolerances || [];
    setValue('intolerances', current.filter((_, i) => i !== index), { shouldDirty: true });
  };

  const addDisliked = () => {
    if (newDisliked.trim()) {
      const current = watchedValues.disliked || [];
      setValue('disliked', [...current, newDisliked.trim()], { shouldDirty: true });
      setNewDisliked('');
    }
  };

  const removeDisliked = (index: number) => {
    const current = watchedValues.disliked || [];
    setValue('disliked', current.filter((_, i) => i !== index), { shouldDirty: true });
  };

  // Section-specific save handlers
  const saveDietSection = async () => {
    setSectionSaving('diet');
    try {
      await updateProfile({
        nutrition: {
          ...profile?.nutrition,
          diet: watchedValues.diet,
          budgetLevel: watchedValues.budgetLevel,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Régime alimentaire sauvegardé',
        message: 'Vos préférences alimentaires ont été mises à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder le régime alimentaire',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const saveRestrictionsSection = async () => {
    setSectionSaving('restrictions');
    try {
      await updateProfile({
        nutrition: {
          ...profile?.nutrition,
          allergies: watchedValues.allergies,
          intolerances: watchedValues.intolerances,
          disliked: watchedValues.disliked,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Restrictions alimentaires sauvegardées',
        message: 'Vos allergies et intolérances ont été mises à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les restrictions',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const saveFastingSection = async () => {
    setSectionSaving('fasting');
    try {
      await updateProfile({
        nutrition: {
          ...profile?.nutrition,
          proteinTarget_g: watchedValues.proteinTarget_g,
          fastingWindow: watchedValues.fastingWindow,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Objectifs nutritionnels sauvegardés',
        message: 'Vos cibles et fenêtre de jeûne ont été mises à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les objectifs',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const onSubmit = async (data: NutritionForm) => {
    try {
      formSubmit();
      
      logger.info('PROFILE_NUTRITION', 'Submitting complete nutrition updates', {
        userId: profile?.userId,
        completionPercentage,
        philosophy: 'complete_nutrition_submission'
      });

      await updateProfile({
        nutrition: {
          ...profile?.nutrition,
          ...data,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Profil nutritionnel sauvegardé',
        message: 'Toutes vos données nutritionnelles ont été mises à jour',
        duration: 4000,
      });

    } catch (error) {
      logger.error('PROFILE_NUTRITION', 'Nutrition update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: profile?.userId,
      });

      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder votre profil nutritionnel',
        duration: 4000,
      });
    }
  };

  // Check for section changes
  const hasDietChanges = !!(dirtyFields.diet || dirtyFields.budgetLevel);
  const hasRestrictionsChanges = !!(dirtyFields.allergies || dirtyFields.intolerances || dirtyFields.disliked);
  const hasFastingChanges = !!(dirtyFields.proteinTarget_g || dirtyFields.fastingWindow);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <ProgressBar
        percentage={completionPercentage}
        title="Forge Nutritionnelle"
        subtitle="Configurez vos préférences et restrictions alimentaires"
        color="#10B981"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Diet & Budget Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(16, 185, 129, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.Utensils} size={20} className="text-green-400" />
              </div>
              Régime & Budget
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-300 text-sm font-medium">Préférences</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Diet Type */}
            <div>
              <label htmlFor="diet" className="block text-white/90 text-sm font-medium mb-3">
                Type de régime
              </label>
              <select
                {...register('diet')}
                id="diet"
                className="glass-input"
              >
                <option value="">Aucun régime spécifique</option>
                <option value="omnivore">Omnivore</option>
                <option value="vegetarian">Végétarien</option>
                <option value="vegan">Végétalien</option>
                <option value="pescatarian">Pescétarien</option>
                <option value="keto">Cétogène</option>
                <option value="paleo">Paléo</option>
                <option value="mediterranean">Méditerranéen</option>
                <option value="low_carb">Faible en glucides</option>
                <option value="intermittent_fasting">Jeûne intermittent</option>
              </select>
            </div>

            {/* Budget Level */}
            <div>
              <label htmlFor="budgetLevel" className="block text-white/90 text-sm font-medium mb-3">
                Niveau de budget
              </label>
              <select
                {...register('budgetLevel')}
                id="budgetLevel"
                className="glass-input"
              >
                <option value="">Non spécifié</option>
                <option value="low">Économique</option>
                <option value="medium">Modéré</option>
                <option value="high">Élevé</option>
              </select>
            </div>
          </div>

          <SectionSaveButton
            isDirty={hasDietChanges}
            isSaving={sectionSaving === 'diet'}
            onSave={saveDietSection}
            sectionName="Régime"
          />
        </GlassCard>

        {/* Restrictions Card */}
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(239, 68, 68, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <SpatialIcon Icon={ICONS.AlertCircle} size={20} className="text-red-400" />
              </div>
              Restrictions Alimentaires
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-300 text-sm font-medium">Important</span>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Allergies */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-3">
                Allergies alimentaires
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    className="glass-input flex-1"
                    placeholder="Ajouter une allergie..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAllergy();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addAllergy}
                    className="btn-glass px-4"
                  >
                    <SpatialIcon Icon={ICONS.Plus} size={14} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(watchedValues.allergies || []).map((allergy, index) => (
                    <motion.div
                      key={index}
                      className="chip chip--on flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <span>{allergy}</span>
                      <button
                        type="button"
                        onClick={() => removeAllergy(index)}
                        className="text-red-300 hover:text-red-200"
                      >
                        <SpatialIcon Icon={ICONS.X} size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Intolerances */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-3">
                Intolérances alimentaires
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIntolerance}
                    onChange={(e) => setNewIntolerance(e.target.value)}
                    className="glass-input flex-1"
                    placeholder="Ajouter une intolérance..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIntolerance();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addIntolerance}
                    className="btn-glass px-4"
                  >
                    <SpatialIcon Icon={ICONS.Plus} size={14} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(watchedValues.intolerances || []).map((intolerance, index) => (
                    <motion.div
                      key={index}
                      className="chip chip--on flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <span>{intolerance}</span>
                      <button
                        type="button"
                        onClick={() => removeIntolerance(index)}
                        className="text-orange-300 hover:text-orange-200"
                      >
                        <SpatialIcon Icon={ICONS.X} size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Disliked Foods */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-3">
                Aliments à éviter
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDisliked}
                    onChange={(e) => setNewDisliked(e.target.value)}
                    className="glass-input flex-1"
                    placeholder="Ajouter un aliment à éviter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDisliked();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addDisliked}
                    className="btn-glass px-4"
                  >
                    <SpatialIcon Icon={ICONS.Plus} size={14} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(watchedValues.disliked || []).map((food, index) => (
                    <motion.div
                      key={index}
                      className="chip flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <span>{food}</span>
                      <button
                        type="button"
                        onClick={() => removeDisliked(index)}
                        className="text-white/60 hover:text-white/80"
                      >
                        <SpatialIcon Icon={ICONS.X} size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SectionSaveButton
            isDirty={hasRestrictionsChanges}
            isSaving={sectionSaving === 'restrictions'}
            onSave={saveRestrictionsSection}
            sectionName="Restrictions"
          />
        </GlassCard>

        {/* Objectives & Fasting Card */}
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
                <SpatialIcon Icon={ICONS.Target} size={20} className="text-orange-400" />
              </div>
              Objectifs & Jeûne
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-orange-300 text-sm font-medium">Avancé</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Protein Target */}
            <div>
              <label htmlFor="proteinTarget_g" className="block text-white/90 text-sm font-medium mb-3">
                Cible protéines (g/jour)
              </label>
              <input
                {...register('proteinTarget_g', { valueAsNumber: true })}
                type="number"
                id="proteinTarget_g"
                min="0"
                max="300"
                step="1"
                className="glass-input"
                placeholder="120"
              />
              {errors.proteinTarget_g && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.proteinTarget_g.message}
                </p>
              )}
            </div>

            {/* Fasting Window Hours */}
            <div>
              <label htmlFor="fastingWindow.windowHours" className="block text-white/90 text-sm font-medium mb-3">
                Fenêtre de jeûne (heures)
              </label>
              <input
                {...register('fastingWindow.windowHours', { valueAsNumber: true })}
                type="number"
                id="fastingWindow.windowHours"
                min="8"
                max="24"
                step="1"
                className="glass-input"
                placeholder="16"
              />
            </div>

            {/* Fasting Start Time */}
            <div>
              <label htmlFor="fastingWindow.start" className="block text-white/90 text-sm font-medium mb-3">
                Début du jeûne
              </label>
              <input
                {...register('fastingWindow.start')}
                type="time"
                id="fastingWindow.start"
                className="glass-input"
              />
            </div>

            {/* Fasting End Time */}
            <div>
              <label htmlFor="fastingWindow.end" className="block text-white/90 text-sm font-medium mb-3">
                Fin du jeûne
              </label>
              <input
                {...register('fastingWindow.end')}
                type="time"
                id="fastingWindow.end"
                className="glass-input"
              />
            </div>

            {/* Meals Per Day */}
            <div className="md:col-span-2">
              <label htmlFor="fastingWindow.mealsPerDay" className="block text-white/90 text-sm font-medium mb-3">
                Nombre de repas par jour
              </label>
              <select
                {...register('fastingWindow.mealsPerDay', { valueAsNumber: true })}
                id="fastingWindow.mealsPerDay"
                className="glass-input"
              >
                <option value="">Non spécifié</option>
                <option value={1}>1 repas (OMAD)</option>
                <option value={2}>2 repas</option>
                <option value={3}>3 repas</option>
                <option value={4}>4 repas</option>
                <option value={5}>5 repas</option>
                <option value={6}>6 repas</option>
              </select>
            </div>
          </div>

          <SectionSaveButton
            isDirty={hasFastingChanges}
            isSaving={sectionSaving === 'fasting'}
            onSave={saveFastingSection}
            sectionName="Objectifs"
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

export default ProfileNutritionTab;