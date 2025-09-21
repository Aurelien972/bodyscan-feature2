// src/app/App.tsx
import React, { Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useUserStore } from '../system/store/userStore';
import { useOverlayStore } from '../system/store/overlayStore.ts';

import { LoadingFallback } from './components/LoadingFallback';
import { Header } from './shell/Header/Header';
import Sidebar from './shell/Sidebar';
import NewMobileBottomBar from './shell/NewMobileBottomBar';

/* PWA + Toast (design file additions) */
import { usePWAInstall } from '../hooks/usePWAInstall';
import { usePWAUpdate } from '../hooks/usePWAUpdate';
import { useToast } from '../ui/components/ToastProvider';
import InstallPrompt from '../ui/components/InstallPrompt';
import UpdateNotification from '../ui/components/UpdateNotification';
import logger from '../lib/utils/logger';

/* Pages (functional file) */
import Home from './pages/Home';
import BodyScan from './pages/BodyScan';
import BodyScanReview from './pages/BodyScan/BodyScanReview';
import BodyScanCelebrationStep from './pages/BodyScan/BodyScanCelebrationStep';
import Profile from './pages/Profile';
import AvatarPage from './pages/Avatar/AvatarPage';
import FaceScanPage from './pages/FaceScanPage';
import FaceScanCelebrationStep from './pages/FaceScan/FaceScanCelebrationStep';
import FaceScanReviewPage from './pages/FaceScan/FaceScanReviewPage';

/* ------------------------------ */
/* AppContent – fusion logique + UI */
/* ------------------------------ */
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authReady } = useUserStore();

  /* Design-file: PWA + toasts */
  const { isInstallable, isInstalled } = usePWAInstall();
  const { isUpdateAvailable, updateInfo, applyUpdate, dismissUpdate } = usePWAUpdate();
  const { showToast } = useToast();

  /* Design-file: overlay -> lock/unlock body scroll */
  const { isAnyOpen } = useOverlayStore();
  React.useEffect(() => {
    const anyOverlayOpen = isAnyOpen();
    if (!anyOverlayOpen) return;

    const original = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.body.style.width,
      height: document.body.style.height,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    logger.debug('OVERLAY_BODY_LOCK', 'Body scroll locked', { anyOverlayOpen, ts: Date.now() });

    return () => {
      document.body.style.overflow = original.overflow;
      document.body.style.position = original.position;
      document.body.style.width = original.width;
      document.body.style.height = original.height;
      logger.debug('OVERLAY_BODY_UNLOCK', 'Body scroll unlocked', { ts: Date.now() });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnyOpen()]);

  /* Fusion: smooth scroll on route change (design version + functional) */
  React.useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const mainContent = document.getElementById('main-content');
      if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
      document
        .querySelectorAll('[data-scroll-container]')
        .forEach((c) => (c as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' }));
    };
    const t = setTimeout(scrollToTop, 100);
    logger.debug('APP_NAVIGATION', 'Smooth scroll to top on route change', {
      newPath: location.pathname,
      previousScrollY: window.scrollY,
      timestamp: new Date().toISOString(),
    });
    return () => clearTimeout(t);
  }, [location.pathname]);

  /* Design-file: extra scroll for meal flow */
  React.useEffect(() => {
    if (!location.pathname.includes('/meals/scan')) return;
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(t);
  }, [location.pathname, location.hash]);

  /* Auth guard (functional file) */
  if (!authReady) return <LoadingFallback />;

  const shouldApplyBodyScanClass =
    location.pathname.startsWith('/body-scan') || location.pathname.startsWith('/avatar');

  return (
    <div className="min-h-screen flex flex-col relative bg-twinforge-visionos">
      {/* Particules (functional file) */}
      <div className="cosmic-forge-particles">
        <div className="forge-particle forge-particle--1" style={{ '--particle-phase': '0' } as React.CSSProperties} />
        <div className="forge-particle forge-particle--2" style={{ '--particle-phase': '1.57' } as React.CSSProperties} />
        <div className="forge-particle forge-particle--3" style={{ '--particle-phase': '3.14' } as React.CSSProperties} />
        <div className="forge-particle forge-particle--4" style={{ '--particle-phase': '4.71' } as React.CSSProperties} />
        <div className="forge-particle forge-particle--5" style={{ '--particle-phase': '6.28' } as React.CSSProperties} />
        <div className="forge-particle forge-particle--6" style={{ '--particle-phase': '1.05' } as React.CSSProperties} />
      </div>

      {/* Header */}
      <Header />

      {/* Main layout */}
      <div className="flex-1 flex">
        {/* Sidebar (desktop) */}
        <div className="hidden lg:flex lg:flex-col lg:w-[240px] xl:w-[260px] shrink-0 ml-6 mr-3 pt-20">
          <Sidebar />
        </div>

        {/* Content */}
        <main
          id="main-content"
          className={`flex-1 px-4 py-4 md:px-6 lg:px-6 xl:px-8 md:pb-4 pt-20 pb-24 route-container overflow-x-hidden ${
            shouldApplyBodyScanClass ? 'body-scan-page' : ''
          }`}
          role="main"
          aria-label="Contenu principal de l'application"
          style={{
            position: 'relative',
            overflow: 'auto',
            overflowX: 'hidden',
            height: '100vh',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
          }}
        >
          <div className="mx-auto w-full min-w-0">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/body-scan" element={<BodyScan />} />
                <Route path="/body-scan/celebration" element={<BodyScanCelebrationStep />} />
                <Route path="/body-scan/review" element={<BodyScanReview />} />
                <Route path="/avatar" element={<AvatarPage />} />
                <Route path="/face-scan" element={<FaceScanPage />} />
                <Route path="/face-scan/celebration" element={<FaceScanCelebrationStep />} />
                <Route path="/face-scan/review" element={<FaceScanReviewPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>

      {/* PWA Install Prompt (design file) */}
      {isInstallable && !isInstalled && (
        <InstallPrompt
          variant="floating"
          onInstallSuccess={() =>
            showToast({
              type: 'success',
              title: 'TwinForge installé !',
              message: "L'application est maintenant disponible sur votre écran d'accueil",
              duration: 4000,
            })
          }
        />
      )}

      {/* PWA Update Notification (design file) */}
      <UpdateNotification
        isVisible={isUpdateAvailable}
        onUpdate={async () => {
          try {
            await applyUpdate();
            showToast({
              type: 'success',
              title: 'Mise à jour appliquée',
              message: 'TwinForge redémarre avec la nouvelle version',
              duration: 4000,
            });
          } catch (error) {
            logger.error('PWA_UPDATE', 'Failed to apply update', {
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            });
            showToast({
              type: 'error',
              title: 'Erreur de mise à jour',
              message: "Impossible d'appliquer la mise à jour. Réessayez plus tard.",
              duration: 4000,
            });
          }
        }}
        onDismiss={dismissUpdate}
        updateInfo={updateInfo}
      />

      {/* Bottom bar (design file) */}
      <NewMobileBottomBar />
    </div>
  );
}

/* ------------------------------ */
/* App wrapper (functional file)  */
/* ------------------------------ */
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}