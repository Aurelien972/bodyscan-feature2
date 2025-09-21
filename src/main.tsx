import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { AppProviders } from './app/providers/AppProviders';
import { logEnvConfig } from './system/env';
import { logSupabaseConfig } from './system/supabase/client';
import logger from './lib/utils/logger';
import { useProgressStore } from './system/store/progressStore';
import { logMorphologyFeatureFlags } from './config/featureFlags';

// Setup logger context provider to avoid circular dependencies
logger.setContextProvider(() => {
  const state = useProgressStore.getState();
  return {
    clientScanId: state.clientScanId || undefined,
    serverScanId: state.serverScanId || undefined,
  };
});

// Initialize deferred logging after all modules are loaded
setTimeout(() => {
  logEnvConfig();
  logSupabaseConfig();
  logMorphologyFeatureFlags();
}, 0);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);