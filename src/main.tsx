import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './app/App.tsx';
import './styles/index.css';
import { AppProviders } from './app/providers/AppProviders';
import { logEnvConfig } from './system/env';
import { logSupabaseConfig } from './system/supabase/client';
import logger from './lib/utils/logger';
import { logMealScannerFeatureFlags } from './config/featureFlags';
import Home from './app/pages/Home';
import Profile from './app/pages/Profile';
import ActivityPage from './app/pages/ActivityPage';
import FastingPage from './app/pages/FastingPage';
import BodyScanPage from './app/pages/BodyScanPage';
import BodyScanPageNew from './app/pages/BodyScan/BodyScanPage';
import BodyScanReview from './app/pages/BodyScan/BodyScanReview';
import BodyScanCelebrationStep from './app/pages/BodyScan/BodyScanCelebrationStep';
import BodyScanCaptureEntry from './app/pages/BodyScan/BodyScanCaptureEntry';
import BodyScanSimulator from './app/pages/BodyScan/BodyScanSimulator';
import AvatarPage from './app/pages/Avatar/AvatarPage';
import MealsPage from './app/pages/MealsPage';
import FridgePage from './app/pages/FridgePage';
import TrainingPage from './app/pages/TrainingPage';
import SettingsPage from './app/pages/SettingsPage';
import NotificationsPage from './app/pages/NotificationsPage';
import { AuthForm } from './app/components/AuthForm';
import { unlockAudioContext } from './audio';

// Create the router with data router API
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: "profile",
        element: <Profile />
      },
      {
        path: "meals",
        element: <MealsPage />
      },
      {
        path: "activity",
        element: <ActivityPage />
      },
      {
        path: "fasting",
        element: <FastingPage />
      },
      {
        path: "body-scan",
        element: <AvatarPage />
      },
      {
        path: "body-scan/capture",
        element: <BodyScanCaptureEntry />
      },
      {
        path: "body-scan/review",
        element: <BodyScanReview />
      },
      {
        path: "body-scan/celebration",
        element: <BodyScanCelebrationStep />
      },
      {
        path: "body-scan/simulator",
        element: <BodyScanSimulator />
      },
      {
        path: "fridge",
        element: <FridgePage />
      },
      {
        path: "training",
        element: <TrainingPage />
      },
      {
        path: "settings",
        element: <SettingsPage />
      },
      {
        path: "notifications",
        element: <NotificationsPage />
      }
    ]
  },
  {
    path: "/auth",
    element: <AuthForm onSuccess={() => window.location.href = '/'} />
  }
]);

// Setup logger context provider to avoid circular dependencies
logger.setContextProvider(() => {
  return {};
});

// Initialize deferred logging after all modules are loaded
// This part is now handled in AppProviders.tsx to ensure logger is fully ready
// setTimeout(() => {
//   logEnvConfig();
//   logSupabaseConfig();
//   logMealScannerFeatureFlags();
// }, 0);

// Global audio unlock handler for mobile compatibility
let audioUnlockAttempted = false;

const handleGlobalInteraction = async () => {
  if (audioUnlockAttempted) return;
  
  audioUnlockAttempted = true;
  // console.log('🔊 AUDIO_DEBUG: Global interaction detected, attempting to unlock audio context');
  
  try {
    const unlocked = await unlockAudioContext();
    // console.log('🔊 AUDIO_DEBUG: Global audio unlock result', { unlocked });
  } catch (error) {
    console.error('🔊 AUDIO_DEBUG: Global audio unlock failed', error);
  }
  
  // Remove listeners after first attempt
  document.removeEventListener('pointerdown', handleGlobalInteraction);
  document.removeEventListener('touchstart', handleGlobalInteraction);
  document.removeEventListener('click', handleGlobalInteraction);
  document.removeEventListener('keydown', handleGlobalInteraction);
};

// Add global listeners for mobile audio unlock
document.addEventListener('pointerdown', handleGlobalInteraction, { passive: true });
document.addEventListener('touchstart', handleGlobalInteraction, { passive: true });
document.addEventListener('click', handleGlobalInteraction, { passive: true });
document.addEventListener('keydown', handleGlobalInteraction, { passive: true });

// Service Worker registration with update detection
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    logger.info('PWA_SERVICE_WORKER', 'Service Worker not supported', {
      userAgent: navigator.userAgent.substring(0, 100),
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    logger.info('PWA_SERVICE_WORKER', 'Registering Service Worker', {
      timestamp: new Date().toISOString()
    });

    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none' // Always check for updates
    });

    logger.info('PWA_SERVICE_WORKER', 'Service Worker registered successfully', {
      scope: registration.scope,
      updateViaCache: registration.updateViaCache,
      timestamp: new Date().toISOString()
    });

    // Check for updates immediately
    registration.update();

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        logger.info('PWA_SERVICE_WORKER', 'New Service Worker found', {
          state: newWorker.state,
          scriptURL: newWorker.scriptURL,
          registrationScope: registration.scope,
          timestamp: new Date().toISOString()
        });

        newWorker.addEventListener('statechange', () => {
          logger.info('PWA_SERVICE_WORKER', 'Service Worker state changed', {
            state: newWorker.state,
            scriptURL: newWorker.scriptURL,
            previousState: 'statechange_event',
            timestamp: new Date().toISOString()
          });

          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New update available
            logger.info('PWA_SERVICE_WORKER', 'Service Worker update available', {
              newWorkerState: newWorker.state,
              controllerState: navigator.serviceWorker.controller?.state,
              scriptURL: newWorker.scriptURL,
              timestamp: new Date().toISOString()
            });
          }
          
          if (newWorker.state === 'redundant') {
            logger.warn('PWA_SERVICE_WORKER', 'Service Worker became redundant', {
              scriptURL: newWorker.scriptURL,
              registrationScope: registration.scope,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    });

    // Handle controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('PWA_SERVICE_WORKER', 'Service Worker controller changed', {
        newController: navigator.serviceWorker.controller?.scriptURL,
        newControllerState: navigator.serviceWorker.controller?.state,
        timestamp: new Date().toISOString()
      });
      window.location.reload();
    });

  } catch (error) {
    logger.error('PWA_SERVICE_WORKER', 'Service Worker registration failed', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      } : error,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      userAgent: navigator.userAgent,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      isSecureContext: window.isSecureContext,
      location: window.location.href,
      timestamp: new Date().toISOString()
    });
  }
};

// Register service worker for PWA functionality
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
);
