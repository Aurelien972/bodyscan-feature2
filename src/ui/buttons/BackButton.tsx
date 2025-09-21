import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpatialIcon from '../icons/SpatialIcon';
import { ICONS } from '../icons/registry';
import { useFeedback } from '../../hooks/useFeedback';
import logger from '../../lib/utils/logger';

interface BackButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'glass' | 'minimal';
  showOnHome?: boolean;
}

/**
 * Back Button Component - VisionOS 26 Inspired
 * Intelligent navigation button that appears when navigation history is available
 */
const BackButton: React.FC<BackButtonProps> = ({
  className = '',
  size = 'md',
  variant = 'glass',
  showOnHome = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { click } = useFeedback();

  // Determine if back button should be visible
  const shouldShow = React.useMemo(() => {
    // Don't show on home page unless explicitly requested
    if (location.pathname === '/' && !showOnHome) {
      return false;
    }

    // Check if there's navigation history
    // Note: We can't directly access history length in modern browsers for security reasons
    // So we'll show the button on all non-home pages and let the browser handle it
    return location.pathname !== '/';
  }, [location.pathname, showOnHome]);

  // Handle back navigation
  const handleBack = React.useCallback(() => {
    try {
      click(); // Audio feedback
      
      logger.debug('BACK_BUTTON', 'Back navigation triggered', {
        currentPath: location.pathname,
        timestamp: new Date().toISOString()
      });
      
      // Use browser's back functionality
      navigate(-1);
    } catch (error) {
      logger.warn('BACK_BUTTON', 'Back navigation failed, redirecting to home', {
        error: error instanceof Error ? error.message : 'Unknown error',
        currentPath: location.pathname
      });
      
      // Fallback to home if back navigation fails
      navigate('/');
    }
  }, [navigate, location.pathname, click]);

  // Size configurations
  const sizeConfig = {
    sm: { buttonSize: 'w-8 h-8', iconSize: 14, padding: 'p-1.5' },
    md: { buttonSize: 'w-10 h-10', iconSize: 16, padding: 'p-2' },
    lg: { buttonSize: 'w-12 h-12', iconSize: 18, padding: 'p-2.5' }
  };

  const config = sizeConfig[size];

  // Variant styles
  const variantStyles = {
    glass: `
      bg-white/8 backdrop-blur-sm border border-white/15
      hover:bg-white/12 hover:border-white/25
      shadow-lg hover:shadow-xl
    `,
    minimal: `
      bg-transparent border border-white/10
      hover:bg-white/5 hover:border-white/20
    `
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <motion.button
      onClick={handleBack}
      className={`
        ${config.buttonSize} ${config.padding}
        rounded-xl transition-all duration-200
        ${variantStyles[variant]}
        focus-ring touch-target
        ${className}
      `}
      whileHover={{ 
        scale: 1.05,
        y: -1
      }}
      whileTap={{ 
        scale: 0.95 
      }}
      initial={{ 
        opacity: 0, 
        x: -10 
      }}
      animate={{ 
        opacity: 1, 
        x: 0 
      }}
      exit={{ 
        opacity: 0, 
        x: -10 
      }}
      transition={{ 
        duration: 0.3, 
        ease: [0.25, 0.1, 0.25, 1] 
      }}
      aria-label="Retour à la page précédente"
      title="Retour"
    >
      <SpatialIcon 
        Icon={ICONS.ArrowLeft} 
        size={config.iconSize} 
        className="text-white/80 hover:text-white transition-colors"
        aria-hidden="true"
      />
    </motion.button>
  );
};

export default BackButton;