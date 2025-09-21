import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';
import { useFeedback } from '../../../../../hooks/useFeedback';
import type { CapturedPhotoEnhanced } from '../../../../../domain/types';

interface CapturedPhotoDisplayProps {
  photo: CapturedPhotoEnhanced;
  showSuccessAnimation: boolean;
  onRetake: () => void;
}

/**
 * Captured Photo Display Component
 * VisionOS 26 optimized photo display with glass effects
 */
const CapturedPhotoDisplay: React.FC<CapturedPhotoDisplayProps> = ({
  photo,
  showSuccessAnimation,
  onRetake,
}) => {
  const { click } = useFeedback();

  return (
    <div className="space-y-4">
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
        <motion.img
          src={photo.url}
          alt={`Photo ${photo.type}`}
          className="w-full h-full object-contain bg-black/20 border border-white/10 photo-processing"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        
        {/* Success Animation with Glass Ripple */}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center backdrop-blur-md rounded-xl success-ripple"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.4))',
                border: '1px solid rgba(34, 197, 94, 0.5)'
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Glass Success Icon */}
              <motion.div
                className="w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.5))',
                  border: '2px solid rgba(34, 197, 94, 0.6)',
                  boxShadow: '0 0 40px rgba(34, 197, 94, 0.6), inset 0 2px 0 rgba(255,255,255,0.3)'
                }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 300, 
                  damping: 20,
                  delay: 0.2
                }}
              >
                <SpatialIcon Icon={ICONS.Check} size={36} className="text-green-400" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Validation Indicator */}
        {photo.validationResult && (
          <motion.div 
            className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
              photo.validationResult.isValid
                ? 'bg-green-500/20 text-green-300 border border-green-400/40'
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {photo.validationResult.isValid ? 'Validée' : 'À améliorer'}
          </motion.div>
        )}
      </div>
      
      {/* Retake Button */}
      <motion.button
        onClick={() => {
          click();
          onRetake();
        }}
        className="w-full btn-glass"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          borderRadius: '999px',
          padding: '.5rem 1.5rem',
          minHeight: '44px',
          overflow: 'hidden'
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-center gap-2">
          <SpatialIcon Icon={ICONS.RotateCcw} size={14} />
          <span>Reprendre</span>
        </div>
      </motion.button>
    </div>
  );
};

export default CapturedPhotoDisplay;
