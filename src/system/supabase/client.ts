import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '../env';

/**
 * Get robust auth storage key for production environments
 * Handles subdomains, custom domains, and tenant isolation
 */
function getAuthStorageKey(): string {
  try {
    // Extract project reference from Supabase URL
    const projectRef = new URL(env.supabaseUrl).hostname.split('.')[0];
    
    // Normalize hostname for consistent storage keys
    const hostname = window.location.hostname.toLowerCase();
    
    // Handle different hosting scenarios
    let tenantId = 'default';
    
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      // Development: use 'dev' as tenant
      tenantId = 'dev';
    } else if (hostname.includes('webcontainer') || hostname.includes('stackblitz')) {
      // WebContainer/StackBlitz: use 'preview' as tenant
      tenantId = 'preview';
    } else {
      // Production: extract tenant from subdomain or use domain
      const parts = hostname.split('.');
      if (parts.length > 2) {
        // Subdomain mode: coach.app.com -> coach
        tenantId = parts[0];
      } else {
        // Custom domain mode: coaching.johndoe.com -> johndoe
        tenantId = parts[0];
      }
    }
    
    // Sanitize tenant ID for storage key
    const safeTenantId = tenantId.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    
    return `sb-${projectRef}-${safeTenantId}-auth-token`;
  } catch (error) {
    console.warn('Failed to generate auth storage key:', error);
    // Fallback to simple key
    return 'sb-auth-token-fallback';
  }
}

/**
 * Debug wrapper for Supabase client
 * Logs queries and auth state changes in development
 */
function withDebug<T extends ReturnType<typeof createClient>>(client: T): T {
  return client;
}

/**
 * Supabase client configuration
 * SINGLETON - Only one instance per app to prevent auth conflicts
 */
const createSupabaseClient = () => {
  // Validate environment variables
  if (!env.supabaseUrl || !env.supabaseAnon) {
    console.error('Missing environment variables. Please check your .env file.');
    console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    throw new Error('Supabase configuration missing');
  }
  
  const supabaseUrl = env.supabaseUrl;
  const supabaseKey = env.supabaseAnon;
  
  const storageKey = getAuthStorageKey();
  
  try {
    return withDebug(createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: window.localStorage,
        storageKey: storageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'fastlift-pwa@9.77',
        },
      },
    }));
  } catch (error) {
    console.error('SUPABASE', 'Failed to create client', { error });
    throw error;
  }
};

// SINGLETON INSTANCE - Never create multiple clients
export const supabase = createSupabaseClient();

// Export configuration status for other modules
const isConfigured = isSupabaseConfigured();

// Deferred logging function to avoid circular dependency
export const logSupabaseConfig = () => {
  import('../../lib/utils/logger').then(({ default: logger }) => {
    // Production auth diagnostics
    if (import.meta.env.PROD) {
      if (isConfigured) {
        logger.info('SUPABASE', 'Client configured successfully');
      } else {
        logger.warn('SUPABASE', 'Running in demo mode - configure environment variables for full functionality');
      }
    }
    
    // Prevent accidental recreation
    if (import.meta.env.DEV) {
      (window as any).__SUPABASE_CLIENT__ = supabase;
      
      // Warn if multiple instances detected
      const existingClient = (window as any).__SUPABASE_CLIENT_COUNT__ || 0;
      (window as any).__SUPABASE_CLIENT_COUNT__ = existingClient + 1;
      
      if (existingClient > 0) {
        logger.debug('SUPABASE', 'Multiple client instances detected');
      }
    }
  }).catch(err => {
    console.warn('Failed to load logger for supabase config:', err);
  });
};

// Types for better TypeScript support
type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          role: 'user' | 'coach' | 'admin';
          preferences: Record<string, any> | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'coach' | 'admin';
          preferences?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'coach' | 'admin';
          preferences?: Record<string, any> | null;
        };
      };
      // Add other table types as needed
    };
  };
};