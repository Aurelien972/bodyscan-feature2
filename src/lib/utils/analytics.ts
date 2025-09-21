/**
 * Analytics Utility - Body Scan Events Tracking
 * Simple event tracking for scan flow optimization
 */
import logger from './logger';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

interface ScanAnalyticsData {
  view: 'front' | 'profile';
  quality_scores: {
    blur_score: number;
    brightness: number;
    confidence: number;
  };
  retake_reasons?: string[];
  device_model: string;
  duration_ms?: number;
}

// Deduplication tracking
const sentEvents = new Map<string, number>();

/**
 * Track analytics event
 */
function trackEvent(event: string, properties: Record<string, any> = {}): void {
  // Create unique event key for deduplication based on scan_id and event type
  const scanId = properties.scan_id || properties.session_id || 'unknown';
  const eventKey = `${event}_${scanId}`;
  
  // Check for recent duplicate (within 5 seconds)
  const now = Date.now();
  const lastSent = sentEvents.get(eventKey);
  if (lastSent && (now - lastSent) < 5000) {
    logger.debug('Analytics Event deduplicated', { 
      event, 
      scanId,
      reason: 'recent_duplicate',
      timeSinceLastMs: now - lastSent
    });
    return;
  }
  
  // Add to sent events with timestamp
  sentEvents.set(eventKey, now);
  
  // Clean up old entries (older than 30 seconds)
  for (const [key, timestamp] of sentEvents.entries()) {
    if (now - timestamp > 30000) {
      sentEvents.delete(key);
    }
  }
  
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties: {
      ...properties,
      scan_id: scanId, // Ensure scan_id is always present
      timestamp: Date.now(),
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
    timestamp: Date.now(),
  };
  
  // Log to console in development
  if (import.meta.env.DEV) {
    logger.debug('Analytics Event tracked', {
      event: analyticsEvent.event,
      ...analyticsEvent.properties
    });
  }
  
  // Store in localStorage for now (Phase 2 will send to backend)
  storeEventLocally(analyticsEvent);
  
  // TODO Phase 2: Send to analytics service
  // sendToAnalyticsService(analyticsEvent);
}

/**
 * Track scan-specific events
 */
export const scanAnalytics = {
  captureStarted: (data: { device_model: string; scan_id: string }) => {
    trackEvent('scan.capture_started', data);
  },
  
  photoTaken: (data: ScanAnalyticsData & { scan_id: string }) => {
    trackEvent('scan.photo_taken', data);
  },
  
  photoRetake: (data: ScanAnalyticsData & { retake_reasons: string[]; scan_id: string }) => {
    trackEvent('scan.photo_retake_reason', data);
  },
  
  captureCompleted: (data: {
    total_duration_ms: number;
    photos_count: number;
    retakes_count: number;
    device_model: string;
    scan_id?: string;
  }) => {
    trackEvent('scan.capture_completed', data);
  },
  
  processingStarted: (data: { photos_count: number; scan_id: string }) => {
    trackEvent('scan.processing_started', data);
  },
  
  processingCompleted: (data: {
    success: boolean;
    duration_ms: number;
    confidence?: number;
    scan_id: string;
  }) => {
    trackEvent('scan.processing_completed', data);
  },
};

/**
 * Get or create session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('scan_session_id');
  if (!sessionId) {
    sessionId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('scan_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Store event locally for offline support
 */
function storeEventLocally(event: AnalyticsEvent): void {
  try {
    const stored = localStorage.getItem('scan_analytics_events');
    const events: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];
    
    events.push(event);
    
    // Keep only last 100 events to prevent storage bloat
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    
    localStorage.setItem('scan_analytics_events', JSON.stringify(events));
  } catch (error) {
    console.warn('Failed to store analytics event:', error);
  }
}

/**
 * Get stored events (for Phase 2 batch upload)
 */
function getStoredEvents(): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem('scan_analytics_events');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to retrieve stored events:', error);
    return [];
  }
}

/**
 * Clear stored events (after successful upload)
 */
function clearStoredEvents(): void {
  try {
    localStorage.removeItem('scan_analytics_events');
  } catch (error) {
    console.warn('Failed to clear stored events:', error);
  }
}

/**
 * Get analytics summary for debugging
 */
function getAnalyticsSummary(): {
  total_events: number;
  events_by_type: Record<string, number>;
  last_event_time: number | null;
} {
  const events = getStoredEvents();
  const eventsByType: Record<string, number> = {};
  
  events.forEach(event => {
    eventsByType[event.event] = (eventsByType[event.event] || 0) + 1;
  });
  
  return {
    total_events: events.length,
    events_by_type: eventsByType,
    last_event_time: events.length > 0 ? events[events.length - 1].timestamp || null : null,
  };
}