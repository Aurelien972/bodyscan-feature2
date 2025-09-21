import React from 'react';
import { motion } from 'framer-motion';

interface CameraOverlayGuidesProps {
  photoType: 'front' | 'profile';
}

const CameraOverlayGuides: React.FC<CameraOverlayGuidesProps> = ({ photoType }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 py-20 sm:py-24 md:py-32">
      <div className="relative">
        {/* Simplified Guide Frame - VisionOS 26 Minimal */}
        <div className="
          w-[min(300px,65vw)] h-[min(400px,60vh)] 
          sm:w-[min(340px,55vw)] sm:h-[min(450px,55vh)]
          md:w-[min(380px,45vw)] md:h-[min(500px,50vh)]
          border border-dashed border-white/30 rounded-3xl 
          bg-white/3 backdrop-blur-sm
          shadow-[0_0_20px_rgba(255,255,255,0.05)]
          relative overflow-hidden
        ">
          {/* Minimal Inner Frame */}
          <div className="absolute inset-6 border border-white/15 rounded-2xl" />
          
          {/* Minimal Corner Points - VisionOS 26 Style */}
          <div className="absolute top-4 left-4 w-3 h-3 border-l border-t border-white/40 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-3 h-3 border-r border-t border-white/40 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-3 h-3 border-l border-b border-white/40 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-3 h-3 border-r border-b border-white/40 rounded-br-lg" />
          
          {/* Minimal Position Indicator */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-white/80 text-sm font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
            {photoType === 'front' ? 'Face' : 'Profil'}
          </div>
          
          {/* Subtle Alignment Guides - No Labels */}
          <div className="absolute top-1/4 left-6 right-6 h-px bg-white/15" />
          <div className="absolute top-1/2 left-6 right-6 h-px bg-white/20" />
          <div className="absolute top-3/4 left-6 right-6 h-px bg-white/15" />
          <div className="absolute top-6 bottom-6 left-1/2 w-px bg-white/15" />
          
          {/* Subtle Breathing Animation */}
          <motion.div
            className="absolute inset-0 border border-brand-primary/10 rounded-3xl" /* ACIER SUR VERRE - Deep Forge Indigo */
            animate={{
              scale: [1, 1.01, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        
        {/* Minimal Instructions - VisionOS 26 Clean */}
        <div className="absolute -bottom-20 sm:-bottom-24 md:-bottom-28 left-1/2 transform -translate-x-1/2 text-center max-w-sm px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-black/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10 shadow-lg"
          >
            <p className="text-white/90 text-sm font-medium">
              {photoType === 'front' 
                ? 'Alignez-vous au centre'
                : 'Tournez-vous de 90°'
              }
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CameraOverlayGuides;
