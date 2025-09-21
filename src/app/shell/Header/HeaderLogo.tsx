import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFeedback } from '../../../hooks/useFeedback';
import logger from '../../../lib/utils/logger';

/**
 * Header Logo Component - Simplified
 * TWINFORGE branding with Dual Ingot symbol
 */
export const HeaderLogo: React.FC = () => {
  const navigate = useNavigate();
  const { click, headerClick } = useFeedback();
  const [isHovered, setIsHovered] = React.useState(false);

  const handleLogoClick = () => {
    logger.trace('HEADER', 'Logo click triggered');
    navigate('/');
  };

  const handlePointerDown = () => {
    logger.trace('HEADER', 'Logo pointer down');
    headerClick(); // Son spécifique header au pointer down
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      {/* Mobile Logo - Format carré */}
      <div className="lg:hidden">
        <button
          onClick={handleLogoClick}
          onPointerDown={handlePointerDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="focus-ring rounded-lg p-1 transition-colors cursor-pointer"
          aria-label="Retour au tableau de bord"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLogoClick();
            }
          }}
        >
          <div className="flex items-center gap-2 mt-0.5">
            {/* Logo Mobile Carré */}
            <motion.div
              className="w-10 h-10 relative"
              style={{ aspectRatio: '1/1' }}
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <img 
                src="https://kwipydbtjagypocpvbwn.supabase.co/storage/v1/object/public/Logos%20TWINFORGE/TwinForgeLogoMobile.png"
                alt="TwinForge Logo Mobile"
                className="w-10 h-10 object-contain"
                style={{
                  aspectRatio: '1/1',
                  filter: isHovered ? 
                    'drop-shadow(0 0 8px color-mix(in srgb, var(--color-plasma-cyan) 15%, transparent))' : 
                    'drop-shadow(0 0 2px rgba(0, 0, 0, 0.1))'
                }}
              />
            </motion.div>
          </div>
        </button>
      </div>

      {/* Desktop Logo */}
      <div className="hidden lg:flex items-center gap-2 mt-1">
        <button
          onClick={handleLogoClick}
          onPointerDown={handlePointerDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="focus-ring rounded-lg p-2 transition-colors cursor-pointer"
          aria-label="Retour au tableau de bord"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLogoClick();
            }
          }}
        >
          <div className="flex items-center gap-3">
            {/* Dual Ingot Symbol */}
            <motion.div
              className="h-12 relative"
              style={{ width: 'auto', aspectRatio: '460/144' }}
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <img 
                src="https://kwipydbtjagypocpvbwn.supabase.co/storage/v1/object/public/Logos%20TWINFORGE/TwinForge%20Logo4.png"
                alt="TwinForge Logo"
                className="h-12 w-auto"
                style={{
                  aspectRatio: '460/144',
                  filter: isHovered ? 
                    'drop-shadow(0 0 8px color-mix(in srgb, var(--color-plasma-cyan) 15%, transparent))' : 
                    'drop-shadow(0 0 2px rgba(0, 0, 0, 0.1))'
                }}
              />
            </motion.div>
          </div>
        </button>
      </div>
    </>
  );
};