import React from 'react';
import { motion } from 'framer-motion';

/**
 * Loading Fallback Component
 * Consistent loading state for lazy-loaded routes
 */
export const LoadingFallback: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-transparent loading-minimum gpu-layer">
      <div className="glass-card p-8">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-6 h-6 rounded-full bg-primary-400/20 border border-primary-400/40 loading-instant gpu-only-transform"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <div className="text-white/70">Chargement...</div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-white/50 text-xs">
            Chargement de votre espace personnalisé
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingFallback;