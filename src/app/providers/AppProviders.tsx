import React, { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataProvider } from './DataProvider';
import { ToastProvider } from '../../ui/components/ToastProvider';
import { DeviceProvider } from '../../system/device/DeviceProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { supabase } from '../../system/supabase/client';
import { AuthForm } from '../components/AuthForm';
import { LoadingFallback } from '../components/LoadingFallback';
import { useUserStore } from '../../system/store/userStore';
import logger from '../../lib/utils/logger';
import { usePrefetchMorphologyMapping } from '../../hooks/useMorphologyMapping';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const initRef = useRef(false);
  const { setSession, setAuthReady } = useUserStore();
  
  // Prefetch morphology mapping data when user authenticates
  const { isPrefetched } = usePrefetchMorphologyMapping();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeAuth = async () => {
      try {
        logger.debug('AUTH', 'Starting authentication initialization');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          logger.debug('AUTH', 'Found existing session');
          setUser(session.user);
          setShowAuthForm(false);
          setSession(session);
          setAuthReady(true);
          
          // Log prefetch status for morphology mapping
          logger.debug('AUTH', 'Morphology mapping prefetch status', { isPrefetched });
        } else {
          logger.debug('AUTH', 'No session found, showing auth form');
          setShowAuthForm(true);
          setSession(null);
          setAuthReady(false);
        }
      } catch (error) {
        logger.error('AUTH', 'Error during initialization', { error });
        setShowAuthForm(true);
        setSession(null);
        setAuthReady(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug('AUTH', 'Auth state changed', { event, hasSession: !!session });
      
      if (session?.user) {
        setUser(session.user);
        setShowAuthForm(false);
        setSession(session);
        setAuthReady(true);
        
        // Log prefetch status for morphology mapping on auth state change
        logger.debug('AUTH', 'Auth state changed - Morphology mapping prefetch status', { isPrefetched });
      } else {
        setUser(null);
        setShowAuthForm(true);
        setSession(null);
        setAuthReady(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (showAuthForm) {
    return <AuthForm />;
  }

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <DeviceProvider>
            <ToastProvider>
              <AuthInitializer>
                {children}
              </AuthInitializer>
            </ToastProvider>
          </DeviceProvider>
        </DataProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}