import React from 'react';
import { motion } from 'framer-motion';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';
import { useFeedback } from '../../../../../hooks/useFeedback';
import logger from '../../../../../lib/utils/logger';

interface PhotoCaptureControlsProps {
  photoType: 'front' | 'profile';
  isValidating: boolean;
  onCameraCapture: () => void;
  onGallerySelect: () => void;
  isProgressInitialized: boolean; // NEW PROP
}

/**
 * Photo Capture Controls Component
 * VisionOS 26 optimized capture buttons with glassmorphism
 */
const PhotoCaptureControls: React.FC<PhotoCaptureControlsProps> = ({
  photoType,
  isValidating,
  onCameraCapture,
  onGallerySelect,
  isProgressInitialized, // NEW PROP
}) => {
  const { glassClick, click } = useFeedback();

  logger.debug('PHOTO_CONTROLS', 'isProgressInitialized status', { isProgressInitialized });

  const primaryColor = 'var(--brand-primary)';

  return (
    <div className="space-y-4">
      {/* Enhanced Camera Button with Glass Breathing */}
      <motion.button
        onClick={() => {
          glassClick();
          onCameraCapture();
        }}
        className="w-full btn-glass--primary relative overflow-hidden"
        disabled={isValidating || !isProgressInitialized} // Disable if not initialized
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          background: `linear-gradient(135deg, ${primaryColor}80, ${primaryColor})`,
          backdropFilter: 'blur(16px) saturate(140%)',
          boxShadow: `0 0 30px ${primaryColor}40, inset 0 2px 0 rgba(255,255,255,0.2)`,
          '--scan-primary': primaryColor,
          borderRadius: '999px',
          padding: '.5rem 1.5rem',
          minHeight: '44px',
          overflow: 'hidden'
        } as React.CSSProperties}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Glass Shimmer Effect */}
        <div className="glass-shimmer absolute inset-0" />
        
        <div className="relative flex items-center justify-center gap-3">
          <motion.div
            animate={isValidating ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <SpatialIcon 
              Icon={isValidating ? ICONS.Loader2 : ICONS.Camera} 
              size={24} 
            />
          </motion.div>
          <span className="font-bold text-lg">
            {isValidating ? 'Validation...' : 'Appareil photo'}
          </span>
        </div>
      </motion.button>

      {/* Enhanced Gallery Button */}
      <motion.button
        onClick={() => {
          click();
          onGallerySelect();
        }}
        className="w-full btn-glass"
        disabled={isValidating || !isProgressInitialized} // Disable if not initialized
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          borderRadius: '999px',
          padding: '.5rem 1.5rem',
          minHeight: '44px',
          overflow: 'hidden'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex items-center justify-center gap-2">
          <SpatialIcon Icon={ICONS.Upload} size={18} />
          <span className="font-medium">Galerie</span>
        </div>
      </motion.button>
    </div>
  );
};

export default PhotoCaptureControls;

