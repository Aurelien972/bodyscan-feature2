/**
 * Optimized Will Change Hook - Simplified
 * Basic will-change optimization for performance
 */

import { useEffect } from 'react';

/**
 * Optimized will-change hook
 */
export function useOptimizedWillChange(
  ref: React.RefObject<HTMLElement>,
  properties: string[],
  timeout: number = 250
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || properties.length === 0) return;
    
    // Set will-change
    element.style.willChange = properties.join(', ');
    
    // Clear after timeout
    const timer = setTimeout(() => {
      if (element) {
        element.style.willChange = 'auto';
      }
    }, timeout);
    
    return () => {
      clearTimeout(timer);
      if (element) {
        element.style.willChange = 'auto';
      }
    };
  }, [ref, properties, timeout]);
}