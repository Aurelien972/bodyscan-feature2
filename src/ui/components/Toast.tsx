import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpatialIcon from '../icons/SpatialIcon';
import { ICONS } from '../icons/registry';
import GlassCard from '../cards/GlassCard';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { id, type, title, message, duration = 4000 } = toast;
  
  React.useEffect(() => {
    if (duration <= 0) return; // Don't auto-dismiss if duration is 0 or negative
    
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);
  
  const getIcon = () => {
    switch (type) {
      case 'success': return ICONS.Check;
      case 'error': return ICONS.AlertCircle;
      case 'warning': return ICONS.AlertCircle;
      default: return ICONS.Info;
    }
  };
  
  const getColors = () => {
    switch (type) {
      case 'success': return 'text-green-400 border-green-500/20 bg-green-500/10';
      case 'error': return 'text-red-400 border-red-500/20 bg-red-500/10';
      case 'warning': return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
      default: return 'text-blue-400 border-blue-500/20 bg-blue-500/10';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="pointer-events-auto"
    >
      <GlassCard className={`p-4 ${getColors()} border`}>
        <div className="flex items-start gap-3 visionos-grid-sm">
          <SpatialIcon Icon={getIcon()} size={20} className="mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white text-visionos-body">{title}</h4>
            {message && (
              <p className="text-white/70 text-sm mt-1 text-visionos-body">{message}</p>
            )}
          </div>
          
          <button
            onClick={() => onDismiss(id)}
            className="p-1 rounded-glass hover:bg-white/10 transition-colors"
            aria-label="Fermer la notification"
          >
            <SpatialIcon Icon={ICONS.X} size={14} className="text-white/60" />
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default Toast;