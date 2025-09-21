/**
 * Viewer Controls Component
 * Camera controls overlay for 3D viewer
 */

import React from 'react';
import { motion } from 'framer-motion';
import SpatialIcon from '../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../ui/icons/registry';

interface ViewerControlsProps {
  activeView: 'front' | 'profile' | 'threequarter';
  isAutoRotating: boolean;
  onCameraViewChange: (view: 'front' | 'profile' | 'threequarter') => void;
  onAutoRotateToggle: () => void;
  onCameraReset: () => void;
  showControls: boolean;
}

/**
 * Camera controls overlay component
 */
const ViewerControls: React.FC<ViewerControlsProps> = ({
  activeView,
  isAutoRotating,
  onCameraViewChange,
  onAutoRotateToggle,
  onCameraReset,
  showControls
}) => {
  if (!showControls) return null;

  return (
    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 space-y-1 sm:space-y-2">
      {/* View Controls */}
      <div className="flex flex-col gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-black/70 backdrop-blur-sm border border-white/20">
        {[
          { key: 'front', icon: ICONS.User, color: '#60A5FA' },
          { key: 'threequarter', icon: ICONS.RotateCcw, color: '#8B5CF6' },
          { key: 'profile', icon: ICONS.ArrowRight, color: '#06B6D4' },
        ].map(({ key, icon, color }) => (
          <button
            key={key}
            onClick={() => onCameraViewChange(key as any)}
            className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all ${
              activeView === key
                ? 'text-white shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            style={activeView === key ? {
              background: `color-mix(in srgb, ${color} 20%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
            } : {}}
            title={key === 'front' ? 'Vue de face' : key === 'profile' ? 'Vue de profil' : 'Vue 3/4'}
          >
            <SpatialIcon Icon={icon} size={12} className="sm:!w-[14px] sm:!h-[14px]" color={activeView === key ? color : undefined} />
          </button>
        ))}
      </div>

      {/* Auto-rotate Toggle */}
      <button
        onClick={onAutoRotateToggle}
        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all ${
          isAutoRotating
            ? 'bg-green-500/20 border-green-400/30 text-green-300'
            : 'bg-black/70 border-white/20 text-white/60 hover:bg-white/10'
        }`}
        title={isAutoRotating ? 'Désactiver la rotation automatique' : 'Activer la rotation automatique'}
      >
        <motion.div
          animate={isAutoRotating ? { rotate: 360 } : { rotate: 0 }}
          transition={isAutoRotating ? { duration: 4, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
        >
          <SpatialIcon Icon={ICONS.RotateCcw} size={12} className="sm:!w-[14px] sm:!h-[14px]" />
        </motion.div>
      </button>

      {/* Reset Camera */}
      <button
        onClick={onCameraReset}
        className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/70 border border-white/20 text-white/60 hover:bg-white/10 hover:text-white transition-all"
        title="Réinitialiser la vue"
      >
        <SpatialIcon Icon={ICONS.Target} size={12} className="sm:!w-[14px] sm:!h-[14px]" />
      </button>
    </div>
  );
};

export default ViewerControls;