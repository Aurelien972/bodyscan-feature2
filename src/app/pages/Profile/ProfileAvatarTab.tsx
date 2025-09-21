import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../../ui/cards/GlassCard';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useUserStore } from '../../../system/store/userStore';

// Enhanced Progress Bar Component
const ProgressBar: React.FC<{ 
  percentage: number; 
  title: string; 
  subtitle?: string;
  color?: string;
}> = ({ percentage, title, subtitle, color = '#A855F7' }) => {
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

/**
 * Profile Avatar Tab - Harmonisé avec les Autres Onglets
 * Affiche le statut avatar avec design cohérent VisionOS 26
 */
const ProfileAvatarTab: React.FC = () => {
  const { profile } = useUserStore();
  
  // Determine if user has avatar data
  const hasAvatar = !!(profile?.preferences?.avatar_version || profile?.preferences?.savedMorphData);
  
  // Calculate completion percentage based on avatar data
  const completionPercentage = React.useMemo(() => {
    if (!profile) return 0;
    
    const fields = [
      { value: hasAvatar, validator: (v: any) => !!v },
      { value: profile?.preferences?.skin_tone, validator: (v: any) => v && typeof v === 'object' },
      { value: profile?.sex, validator: (v: any) => typeof v === 'string' && v.trim() !== '' },
      { value: profile?.preferences?.final_shape_params, validator: (v: any) => v && Object.keys(v).length > 0 },
      { value: profile?.preferences?.final_limb_masses, validator: (v: any) => v && Object.keys(v).length > 0 },
    ];
    
    const completed = fields.filter(field => field.validator(field.value)).length;
    return Math.round((completed / fields.length) * 100);
  }, [profile, hasAvatar]);

  // Define latestScanData based on available avatar data
  const latestScanData = React.useMemo(() => {
    return !!(
      profile?.preferences?.final_shape_params && 
      Object.keys(profile.preferences.final_shape_params).length > 0
    ) || !!(
      profile?.preferences?.final_limb_masses && 
      Object.keys(profile.preferences.final_limb_masses).length > 0
    );
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <ProgressBar
        percentage={completionPercentage}
        title="Avatar 3D"
        subtitle="Votre reflet numérique et données morphologiques"
        color="#A855F7"
      />

      {/* Avatar Status Card */}
      <GlassCard className="p-6" style={{
        background: `
          radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.08) 0%, transparent 60%),
          var(--glass-opacity)
        `,
        borderColor: 'rgba(168, 85, 247, 0.2)'
      }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold text-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <SpatialIcon Icon={ICONS.Eye} size={20} className="text-purple-400" />
            </div>
            Statut de l'Avatar
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-purple-300 text-sm font-medium">3D</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                hasAvatar 
                  ? 'bg-purple-500/20 border-purple-400/40' 
                  : 'bg-gray-500/20 border-gray-400/40'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <SpatialIcon 
                Icon={hasAvatar ? ICONS.Check : ICONS.Circle} 
                size={24} 
                className={hasAvatar ? 'text-purple-400' : 'text-gray-400'} 
              />
            </motion.div>
            
            <div>
              <h4 className="text-white font-semibold">
                {hasAvatar ? 'Avatar Disponible' : 'Aucun Avatar'}
              </h4>
              <p className={`text-sm ${hasAvatar ? 'text-purple-300' : 'text-gray-400'}`}>
                {hasAvatar ? 'Données morphologiques configurées' : 'Avatar non configuré'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-white mb-1">
              {completionPercentage}%
            </div>
            <div className="text-purple-300 text-xs">Complété</div>
          </div>
        </div>
      </GlassCard>
      
      {/* Avatar Details Card */}
      <GlassCard className="p-6" style={{
        background: `
          radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.06) 0%, transparent 60%),
          var(--glass-opacity)
        `,
        borderColor: 'rgba(168, 85, 247, 0.15)'
      }}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <SpatialIcon Icon={ICONS.Info} size={16} className="text-purple-400" />
            Informations Avatar
          </h4>
        </div>
        
        <div className="flex items-start gap-3">
          <SpatialIcon 
            Icon={hasAvatar ? ICONS.Check : ICONS.Plus} 
            size={16} 
            className={hasAvatar ? 'text-purple-400' : 'text-brand-accent'} 
          />
          <div>
            <p className="text-white/70 text-sm leading-relaxed">
              {hasAvatar 
                ? 'Votre avatar 3D est disponible. Les données morphologiques sont stockées dans vos préférences utilisateur.'
                : 'Aucun avatar 3D configuré. Vous pouvez ajouter des fonctionnalités pour créer et gérer des avatars.'
              }
            </p>
            {hasAvatar && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Données morphologiques
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Paramètres 3D
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Configuration matériaux
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    Teinte de peau
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Avatar Technical Details (if available) */}
      {hasAvatar && latestScanData && (
        <GlassCard className="p-6" style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.06) 0%, transparent 60%),
            var(--glass-opacity)
          `,
          borderColor: 'rgba(168, 85, 247, 0.15)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <SpatialIcon Icon={ICONS.Settings} size={16} className="text-purple-400" />
              Détails Techniques
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shape Parameters */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <SpatialIcon Icon={ICONS.GitCompare} size={14} className="text-purple-400" />
                <span className="text-white font-medium text-sm">Paramètres Morphologiques</span>
              </div>
              <div className="text-white/60 text-xs">
                {profile?.preferences?.final_shape_params ? 
                  `${Object.keys(profile.preferences.final_shape_params).length} paramètres` : 
                  'Non configuré'
                }
              </div>
            </div>

            {/* Limb Masses */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <SpatialIcon Icon={ICONS.Activity} size={14} className="text-purple-400" />
                <span className="text-white font-medium text-sm">Masses Corporelles</span>
              </div>
              <div className="text-white/60 text-xs">
                {profile?.preferences?.final_limb_masses ? 
                  `${Object.keys(profile.preferences.final_limb_masses).length} segments` : 
                  'Non configuré'
                }
              </div>
            </div>

            {/* Skin Tone */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <SpatialIcon Icon={ICONS.Palette} size={14} className="text-purple-400" />
                <span className="text-white font-medium text-sm">Teinte de Peau</span>
              </div>
              <div className="flex items-center gap-2">
                {profile?.preferences?.skin_tone && (
                  <div 
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ 
                      backgroundColor: profile.preferences.skin_tone.hex || '#D4A574'
                    }}
                  />
                )}
                <span className="text-white/60 text-xs">
                  {profile?.preferences?.skin_tone ? 
                    profile.preferences.skin_tone.hex || 'Configuré' : 
                    'Non configuré'
                  }
                </span>
              </div>
            </div>

            {/* Model Version */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <SpatialIcon Icon={ICONS.Globe} size={14} className="text-purple-400" />
                <span className="text-white font-medium text-sm">Version Modèle</span>
              </div>
              <div className="text-white/60 text-xs">
                {profile?.preferences?.avatar_version || 'v1.0'}
              </div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default ProfileAvatarTab;