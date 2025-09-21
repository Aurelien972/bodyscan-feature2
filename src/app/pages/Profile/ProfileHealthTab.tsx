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
}> = ({ percentage, title, subtitle, color = '#EF4444' }) => {
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

// Validation schema for health data
const healthSchema = z.object({
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  conditions: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
});

type HealthForm = z.infer<typeof healthSchema>;

/**
 * Profile Health Tab - Santé & Médical TwinForge
 * Gestion complète des données de santé avec design VisionOS 26
 */
const ProfileHealthTab: React.FC = () => {
  const { profile, updateProfile, saving } = useUserStore();
  const { showToast } = useToast();
  const { success, formSubmit } = useFeedback();
  const [sectionSaving, setSectionSaving] = React.useState<string | null>(null);
  const [newCondition, setNewCondition] = React.useState('');
  const [newMedication, setNewMedication] = React.useState('');
  const [newConstraint, setNewConstraint] = React.useState('');

  // Initialize form with current health data
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    watch,
    setValue,
    reset,
    trigger
  } = useForm<HealthForm>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      bloodType: profile?.health?.bloodType || undefined,
      conditions: profile?.health?.conditions || [],
      medications: profile?.health?.medications || [],
      constraints: profile?.constraints ? Object.values(profile.constraints) : [],
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  // Calculate completion percentage
  const completionPercentage = React.useMemo(() => {
    const fields = [
      { value: watchedValues.bloodType, validator: (v: any) => typeof v === 'string' && v.trim() !== '' },
      { value: watchedValues.conditions, validator: (v: any) => Array.isArray(v) && v.length > 0 },
      { value: watchedValues.medications, validator: (v: any) => Array.isArray(v) && v.length > 0 },
      { value: watchedValues.constraints, validator: (v: any) => Array.isArray(v) && v.length > 0 },
    ];
    
    const completed = fields.filter(field => field.validator(field.value)).length;
    return Math.round((completed / fields.length) * 100);
  }, [watchedValues]);

  // Reset form when profile changes
  React.useEffect(() => {
    if (profile) {
      reset({
        bloodType: profile.health?.bloodType || undefined,
        conditions: profile.health?.conditions || [],
        medications: profile.health?.medications || [],
        constraints: profile.constraints ? Object.values(profile.constraints) : [],
      });
    }
  }, [profile, reset]);

  // Add/remove functions for arrays
  const addCondition = () => {
    if (newCondition.trim()) {
      const current = watchedValues.conditions || [];
      setValue('conditions', [...current, newCondition.trim()], { shouldDirty: true });
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    const current = watchedValues.conditions || [];
    setValue('conditions', current.filter((_, i) => i !== index), { shouldDirty: true });
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      const current = watchedValues.medications || [];
      setValue('medications', [...current, newMedication.trim()], { shouldDirty: true });
      setNewMedication('');
    }
  };

  const removeMedication = (index: number) => {
    const current = watchedValues.medications || [];
    setValue('medications', current.filter((_, i) => i !== index), { shouldDirty: true });
  };

  const addConstraint = () => {
    if (newConstraint.trim()) {
      const current = watchedValues.constraints || [];
      setValue('constraints', [...current, newConstraint.trim()], { shouldDirty: true });
      setNewConstraint('');
    }
  };

  const removeConstraint = (index: number) => {
    const current = watchedValues.constraints || [];
    setValue('constraints', current.filter((_, i) => i !== index), { shouldDirty: true });
  };

  // Section-specific save handlers
  const saveBasicHealthSection = async () => {
    setSectionSaving('basic');
    try {
      await updateProfile({
        health: {
          ...profile?.health,
          bloodType: watchedValues.bloodType,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Informations de base sauvegardées',
        message: 'Vos données médicales de base ont été mises à jour',
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

  const saveMedicalSection = async () => {
    setSectionSaving('medical');
    try {
      await updateProfile({
        health: {
          ...profile?.health,
          conditions: watchedValues.conditions,
          medications: watchedValues.medications,
        },
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Données médicales sauvegardées',
        message: 'Vos conditions et médicaments ont été mis à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les données médicales',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const saveConstraintsSection = async () => {
    setSectionSaving('constraints');
    try {
      // Convert array to object for constraints field
      const constraintsObj = (watchedValues.constraints || []).reduce((acc, constraint, index) => {
        acc[`constraint_${index}`] = constraint;
        return acc;
      }, {} as Record<string, string>);

      await updateProfile({
        constraints: constraintsObj,
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Contraintes sauvegardées',
        message: 'Vos contraintes alimentaires ont été mises à jour',
        duration: 3000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder les contraintes',
        duration: 4000,
      });
    } finally {
      setSectionSaving(null);
    }
  };

  const onSubmit = async (data: HealthForm) => {
    try {
      formSubmit();
      
      logger.info('PROFILE_HEALTH', 'Submitting complete health updates', {
        userId: profile?.userId,
        completionPercentage,
        philosophy: 'complete_health_submission'
      });

      // Convert constraints array to object
      const constraintsObj = (data.constraints || []).reduce((acc, constraint, index) => {
        acc[`constraint_${index}`] = constraint;
        return acc;
      }, {} as Record<string, string>);

      await updateProfile({
        health: {
          ...profile?.health,
          bloodType: data.bloodType,
          conditions: data.conditions,
          medications: data.medications,
        },
        constraints: constraintsObj,
        updated_at: new Date().toISOString(),
      });

      success();
      showToast({
        type: 'success',
        title: 'Profil santé sauvegardé',
        message: 'Toutes vos données de santé ont été mises à jour',
        duration: 4000,
      });

    } catch (error) {
      logger.error('PROFILE_HEALTH', 'Health update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: profile?.userId,
      });

      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder votre profil santé',
        duration: 4000,
      });
    }
  };

  // Check for section changes
  const hasBasicChanges = !!(dirtyFields.bloodType);
  const hasMedicalChanges = !!(dirtyFields.conditions || dirtyFields.medications);
  const hasConstraintsChanges = !!(dirtyFields.constraints);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <ProgressBar
        percentage={completionPercentage}
        title="Profil Santé & Médical"
        subtitle="Configurez vos informations médicales et contraintes"
        color="#EF4444"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Health Info Card */}
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
                <SpatialIcon Icon={ICONS.Heart} size={20} className="text-red-400" />
              </div>
              Informations Médicales de Base
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-300 text-sm font-medium">Médical</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Blood Type */}
            <div>
              <label htmlFor="bloodType" className="block text-white/90 text-sm font-medium mb-3">
                Groupe sanguin
              </label>
              <select
                {...register('bloodType')}
                id="bloodType"
                className="glass-input"
              >
                <option value="">Sélectionnez votre groupe sanguin</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.bloodType && (
                <p className="text-red-300 text-xs mt-2 flex items-center gap-1">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={12} />
                  {errors.bloodType.message}
                </p>
              )}
            </div>
          </div>

          <SectionSaveButton
            isDirty={hasBasicChanges}
            isSaving={sectionSaving === 'basic'}
            onSave={saveBasicHealthSection}
            sectionName="Base"
          />
        </GlassCard>

        {/* Medical Conditions & Medications Card */}
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
                <SpatialIcon Icon={ICONS.Shield} size={20} className="text-orange-400" />
              </div>
              Conditions & Médicaments
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-orange-300 text-sm font-medium">Confidentiel</span>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Medical Conditions */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-3">
                Conditions médicales
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="glass-input flex-1"
                    placeholder="Ajouter une condition médicale..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCondition();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCondition}
                    className="btn-glass px-4"
                  >
                    <SpatialIcon Icon={ICONS.Plus} size={14} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(watchedValues.conditions || []).map((condition, index) => (
                    <motion.div
                      key={index}
                      className="chip chip--on flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: 'rgb(239, 68, 68)'
                      }}
                    >
                      <span>{condition}</span>
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="text-red-300 hover:text-red-200"
                      >
                        <SpatialIcon Icon={ICONS.X} size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Medications */}
            <div>
              <label className="block text-white/90 text-sm font-medium mb-3">
                Médicaments actuels
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    className="glass-input flex-1"
                    placeholder="Ajouter un médicament..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMedication();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addMedication}
                    className="btn-glass px-4"
                  >
                    <SpatialIcon Icon={ICONS.Plus} size={14} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(watchedValues.medications || []).map((medication, index) => (
                    <motion.div
                      key={index}
                      className="chip chip--on flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        color: 'rgb(59, 130, 246)'
                      }}
                    >
                      <span>{medication}</span>
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="text-blue-300 hover:text-blue-200"
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
            isDirty={hasMedicalChanges}
            isSaving={sectionSaving === 'medical'}
            onSave={saveMedicalSection}
            sectionName="Médical"
          />
        </GlassCard>

        {/* Health Constraints Card */}
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
                <SpatialIcon Icon={ICONS.Lock} size={20} className="text-purple-400" />
              </div>
              Contraintes Alimentaires
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-purple-300 text-sm font-medium">Spécifique</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-3">
                Contraintes spécifiques (ex: faible en sodium, sans gluten)
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newConstraint}
                    onChange={(e) => setNewConstraint(e.target.value)}
                    className="glass-input flex-1"
                    placeholder="Ajouter une contrainte..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addConstraint();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addConstraint}
                    className="btn-glass px-4"
                  >
                    <SpatialIcon Icon={ICONS.Plus} size={14} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(watchedValues.constraints || []).map((constraint, index) => (
                    <motion.div
                      key={index}
                      className="chip chip--on flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        color: 'rgb(139, 92, 246)'
                      }}
                    >
                      <span>{constraint}</span>
                      <button
                        type="button"
                        onClick={() => removeConstraint(index)}
                        className="text-purple-300 hover:text-purple-200"
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
            isDirty={hasConstraintsChanges}
            isSaving={sectionSaving === 'constraints'}
            onSave={saveConstraintsSection}
            sectionName="Contraintes"
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

export default ProfileHealthTab;