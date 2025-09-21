// src/lib/utils/logger.ts
/**
 * Logging utility with context provider and strict contract enforcement
 * Structured logging with single payload to prevent [object Object] issues
 */


type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Configuration des niveaux de log par environnement
 */
const LOG_LEVEL_CONFIG = {
  development: {
    level: 'debug' as LogLevel, // Temporarily set to debug for detailed logs
  },
  staging: {
    level: 'info' as LogLevel,
  },
  production: {
    level: 'warn' as LogLevel,
  },
} as const;

/**
 * Get current environment log configuration
 */
function getCurrentLogConfig() {
  const env = import.meta.env.MODE as keyof typeof LOG_LEVEL_CONFIG;
  return LOG_LEVEL_CONFIG[env] || LOG_LEVEL_CONFIG.development;
}


// Context provider to avoid circular dependencies
let contextProvider: (() => { clientScanId?: string; serverScanId?: string }) | null = null;

/**
 * Set context provider for automatic ID injection
 */
function setContextProvider(provider: () => { clientScanId?: string; serverScanId?: string }) {
  contextProvider = provider;
}

/**
 * Get current context from provider
 */
function getCurrentContext(): { clientScanId?: string; serverScanId?: string } {
  try {
    return contextProvider?.() || {};
  } catch (error) {
    console.warn('Failed to get context from provider:', error);
    return {};
  }
}

/**
 * Check if a log level should be displayed based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  const config = getCurrentLogConfig();
  const levelOrder = {
    'trace': 0,
    'debug': 1,
    'info': 2,
    'warn': 3,
    'error': 4
  };
  
  const currentLevelValue = levelOrder[config.level as LogLevel];
  const messageLevelValue = levelOrder[level];
  
  // More restrictive logging - only show important logs
  if (import.meta.env.DEV) {
    // Only show debug logs for critical components
    if (level === 'debug') {
      return messageLevelValue >= Math.max(currentLevelValue, 2); // Require at least info level
    }
    // Only show trace logs for very specific debugging
    if (level === 'trace') {
      return false; // Disable trace logs in dev unless explicitly needed
    }
  }
  
  return messageLevelValue >= currentLevelValue;
}

/**
 * Create structured log payload with automatic context injection
 */
function createLogPayload(level: LogLevel, message: string, context?: any) {
  const autoContext = getCurrentContext();
  
  // Handle case where context is a string (common mistake)
  if (context && typeof context !== 'object') {
    message = `${message} — ${String(context)}`;
    context = undefined;
  }
  
  // Merge auto context with provided context
  const mergedContext = {
    ...autoContext,
    ...(context || {})
  };
  
  // Always add context property, even if empty, for debugging purposes
  const payload: Record<string, any> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: mergedContext // Always include context
  };
  
  return payload;
}

/**
 * Core logging functions with strict contract
 */
function trace(message: string, context?: Record<string, any>) {
  if (!shouldLog('trace')) return;
  const payload = createLogPayload('trace', message, context);
  console.trace(JSON.stringify(payload, null, 2));
}

function debug(message: string, context?: Record<string, any>) {
  if (!shouldLog('debug')) return;
  const payload = createLogPayload('debug', message, context);
  console.debug(JSON.stringify(payload, null, 2));
}

function info(message: string, context?: Record<string, any>) {
  if (!shouldLog('info')) return;
  const payload = createLogPayload('info', message, context);
  console.log(JSON.stringify(payload, null, 2));
}

function warn(message: string, context?: Record<string, any>) {
  if (!shouldLog('warn')) return;
  const payload = createLogPayload('warn', message, context);
  console.warn(JSON.stringify(payload, null, 2));
}

function error(message: string, context?: Record<string, any>) {
  if (!shouldLog('error')) return;
  const payload = createLogPayload('error', message, context);
  console.error(JSON.stringify(payload, null, 2));
}

/**
 * Progress logging function for tracking operation progress
 */
function progress(category: string, progressValue: number, message: string, subMessage?: string) {
  if (!shouldLog('info')) return;
  const safeProgress = Number.isFinite(progressValue) && !Number.isNaN(progressValue) ? 
    Math.max(0, Math.min(100, progressValue)) : 0;
  
  const payload = createLogPayload('info', `${category}: ${safeProgress}% - ${message}`, {
    category,
    progress: safeProgress,
    message,
    ...(subMessage && { subMessage })
  });
  
  console.log(JSON.stringify(payload, null, 2));
}

/**
 * AI Refinement logging function for tracking AI-driven morphological refinement
 */
function aiRefinement(
  operation: string, 
  data: {
    scanId?: string;
    resolvedGender?: string;
    mappingVersion?: string;
    blendShapeParamsCount?: number;
    finalShapeParamsCount?: number;
    clampedKeysCount?: number;
    outOfRangeCount?: number;
    activeKeysCount?: number;
    aiConfidence?: number;
    topDeltas?: Array<{ key: string; delta: number }>;
    philosophy?: string;
  }
) {
  if (!shouldLog('info')) return;
  
  const payload = createLogPayload('info', `AI_REFINEMENT: ${operation}`, {
    operation,
    philosophy: data.philosophy || 'ai_driven_morphological_refinement',
    ...data
  });
  
  console.log(JSON.stringify(payload, null, 2));
}

/**
 * Gender Resolution logging function for tracking gender consistency
 */
function genderResolution(
  stage: string,
  data: {
    resolvedGender?: string;
    source?: string;
    scanId?: string;
    mappingUsed?: string;
    modelLoaded?: string;
    reason?: string;
  }
) {
  if (!shouldLog('info')) return;
  
  const payload = createLogPayload('info', `GENDER_RESOLUTION: ${stage}`, {
    stage,
    philosophy: 'consistent_gender_resolution',
    ...data
  });
  
  console.log(JSON.stringify(payload, null, 2));
}

/**
 * Enhanced error logging with context
 */
function logError(message: string, err: unknown, context: Record<string, any> = {}) {
  if (!shouldLog('error')) return;
  const e = err as any;
  const payload = createLogPayload('error', message, {
    error: {
      name: e?.name || 'Unknown',
      message: e?.message || 'No message',
      stack: e?.stack || 'No stack trace',
    },
    ...context
  });
  console.error(JSON.stringify(payload, null, 2));
}

/**
 * Default export with all logging functions
 */
const logger = {
  trace,
  info,
  warn,
  debug,
  error,
  progress,
  aiRefinement,
  genderResolution,
  logError,
  logOnce,
  setContextProvider,
};

;
export default logger;

/**
 * Log once utility to prevent repetitive logs
 */
const loggedOnce = new Set<string>();

export function logOnce(key: string, level: 'trace' | 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
  if (loggedOnce.has(key)) return;
  loggedOnce.add(key);
  
  switch (level) {
    case 'trace': trace(message, context); break;
    case 'debug': debug(message, context); break;
    case 'info': info(message, context); break;
    case 'warn': warn(message, context); break;
    case 'error': error(message, context); break;
  }
}

/**
 * Clear logged once cache (useful for testing)
 */
function clearLogOnceCache() {
  loggedOnce.clear();
}
