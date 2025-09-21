// src/app/shell/Header/Header.tsx
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useShell } from '../../../ui/shell/useShell';
import MobileDrawer from '../../../ui/shell/MobileDrawer';
import { HeaderLogo } from './HeaderLogo';
import { HeaderActions } from './HeaderActions';
import { useFeedback } from '../../../hooks';
import { BackButton } from '../../../ui/buttons';
// Removed: import { useProgressStore } from '../../../system/store/progressStore'; // No longer needed here

/**
 * Main Header Component
 * Navigation header with responsive design
 */
export const Header = React.memo(() => {
  const { setDrawer } = useShell();
  const { click } = useFeedback();
  // Removed: const hideHeader = useProgressStore((state) => state.hideHeader); // Get hideHeader state

  // The main Header should always be visible. Its visibility is not controlled by hideHeader.
  // The DynamicProgressHeader will handle its own visibility.
  // Removed: if (hideHeader) { return null; }

  return (
    <>
      <header
        className="
          header-glass safe-top px-3 md:px-6 h-[64px] flex items-center justify-between gap-2
          sticky top-0 z-[60]
          backdrop-blur-xl
          transition-all duration-300
        "
        style={{ 
          WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          background: `
            color-mix(in srgb, var(--color-graphite-fog) 60%, transparent)
          `,
          borderBottom: '1px solid color-mix(in srgb, var(--color-plasma-cyan) 8%, transparent)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
        role="banner"
        aria-label="FASTLIFT AI cockpit"
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          {/* Back Button - VisionOS 26 Navigation */}
          <BackButton 
            size="md" 
            variant="glass"
          />
          
          <button
            className="md:hidden btn-glass rounded-xl p-2 touch-target"
            aria-label="Ouvrir le menu de navigation principal"
            aria-expanded="false"
            aria-haspopup="menu"
            onPointerDown={() => click()}
            onClick={() => setDrawer(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                click();
                setDrawer(true);
              }
            }}
          >
            <SpatialIcon Icon={ICONS.Menu} size={18} aria-hidden="true" />
          </button>

          <HeaderLogo />
        </div>

        {/* Right */}
        <HeaderActions />
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer />
    </>
  );
});

Header.displayName = 'Header';
