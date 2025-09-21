import React, { useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShell } from './useShell';
import { Link } from '../../app/nav/Link';
import { ICONS } from '../icons/registry';
import SpatialIcon from '../icons/SpatialIcon';
import { useLocation } from 'react-router-dom';
import { useUserStore } from '../../system/store/userStore';
import { getCircuitColor } from '../theme/circuits';
import { navFor } from '../../app/shell/navigation';

const Section = React.memo(({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-white/60 text-xs uppercase tracking-wider font-medium mb-2 px-3" style={{ color: 'var(--brand-accent)' }}>
      {title}
    </h3>
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
));
Section.displayName = 'Section';

const MobileDrawer = React.memo(() => {
  const { drawerOpen, setDrawer } = useShell();
  const location = useLocation();
  const { sessionInfo } = useUserStore();
  const navRef = React.useRef<HTMLElement>(null);

  const userRole = sessionInfo?.role || 'user';

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Body scroll lock - Empêche le scroll de la page principale quand la sidebar est ouverte
  useEffect(() => {
    if (drawerOpen) {
      // Sauvegarder l'état original du body
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      
      // Verrouiller le scroll du body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      return () => {
        // Restaurer l'état original
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = '';
        document.body.style.height = '';
      };
    }
  }, [drawerOpen]);

  // Reset sidebar scroll to top when opening
  useEffect(() => {
    if (drawerOpen && navRef.current) {
      // Force scroll to top when drawer opens - CRITIQUE pour voir le contenu
      requestAnimationFrame(() => {
        if (navRef.current) {
          navRef.current.scrollTop = 0;
        }
      });
    }
  }, [drawerOpen]);
  
  // Fermer avec ESC
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, setDrawer]);

  // Utiliser la même source de navigation que la sidebar desktop
  const navSections = useMemo(() => {
    return navFor(userRole);
  }, [userRole]);

  return (
    <div className="md:hidden">
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[9999]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 2147483646 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawer(false)}
          />

          {/* Drawer Panel */}
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw]
                       bg-[color-mix(in_srgb,white_10%,transparent)]
                       dark:bg-[color-mix(in_srgb,black_30%,transparent)]
                       backdrop-blur-2xl border-r border-white/10 
                       shadow-xl rounded-r-2xl overflow-hidden flex flex-col"
            style={{ 
              zIndex: 2147483647,
              height: '100dvh',
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 'auto',
              maxHeight: '100dvh',
              minHeight: '100dvh'
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 flex-shrink-0">
              <h2 className="text-white font-semibold text-lg">Menu Principal</h2>
              <button
                className="p-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors" /* ACIER SUR VERRE */
                onClick={() => setDrawer(false)}
                aria-label="Fermer le menu"
              >
                <SpatialIcon Icon={ICONS.X} size={16} className="text-white" />
              </button>
            </div>

            {/* Navigation */}
            <nav 
              ref={navRef}
              className="p-4 pt-2 space-y-4 overflow-y-auto flex-1 overscroll-behavior-contain"
              style={{
                maxHeight: 'calc(100dvh - 60px)', // Hauteur totale moins le header
                minHeight: 0, // Permet au flex-1 de fonctionner correctement
              }}
            >
              {navSections.map(section => (
                <Section key={section.title} title={section.title}>
                  {section.items.map(item => {
                    const Icon = ICONS[item.icon as keyof typeof ICONS];
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                          ${isActive(item.to)
                            ? 'bg-white/10 border border-white/20 text-white shadow-inner'
                            : 'text-white/80 hover:bg-white/5 hover:text-white'}
                        `}
                        onClick={() => setDrawer(false)}
                      >
                        <SpatialIcon
                          Icon={Icon}
                          size={18}
                         color={isActive(item.to) ? getCircuitColor(item.to) : 'rgba(255,255,255,0.7)'}
                        />
                        <span className="font-medium flex-1 text-sm">{item.label}</span>
                        {item.badge && (
                          <span className="text-xs text-brand-primary font-medium">{item.badge}</span>
                        )}
                      </Link>
                    );
                  })}
                </Section>
              ))}
            </nav>
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
MobileDrawer.displayName = 'MobileDrawer';

export default MobileDrawer;