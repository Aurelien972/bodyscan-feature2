/**
 * Environment variables configuration
 * Client-side environment variables only
 */

export const env = {
  supabaseUrl: (() => {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
    // Ensure HTTPS protocol for Supabase domains to prevent mixed content errors
    if (url && (url.includes('supabase.co') || url.includes('supabase.in'))) {
      return url.replace(/^http:\/\//, 'https://');
    }
    return url;
  })(),
  supabaseAnon: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '',
};

// Validate environment variables with graceful fallbacks
export const isSupabaseConfigured = () => {
  const hasUrl = env.supabaseUrl && env.supabaseUrl.length > 0;
  const hasKey = env.supabaseAnon && env.supabaseAnon.length > 0;
  const isValidUrl = hasUrl && (env.supabaseUrl.includes('supabase.co') || env.supabaseUrl.includes('supabase.in'));
  
  return hasUrl && hasKey && isValidUrl;
};

// Deferred logging function to avoid circular dependency
export const logEnvConfig = () => {
  import('../lib/utils/logger').then(({ default: logger }) => {
    const hasUrl = env.supabaseUrl && env.supabaseUrl.length > 0;
    const hasKey = env.supabaseAnon && env.supabaseAnon.length > 0;
    const isValidUrl = hasUrl && (env.supabaseUrl.includes('supabase.co') || env.supabaseUrl.includes('supabase.in'));
    
    logger.debug('ENV', 'Supabase configuration check', { hasUrl, hasKey, isValidUrl });
    
    // Log environment info for production debugging
    if (import.meta.env.PROD) {
      if (isSupabaseConfigured()) {
        logger.info('ENV', 'Supabase Production: Client configured successfully');
      } else {
        logger.error('ENV', 'Supabase Production: Configuration missing!', { hasUrl: !!env.supabaseUrl, hasKey: !!env.supabaseAnon });
      }
    }
  }).catch(err => {
    console.warn('Failed to load logger for env config:', err);
  });
};