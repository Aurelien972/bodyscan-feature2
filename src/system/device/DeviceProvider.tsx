/**
 * Device Provider - Simplified
 * Basic device detection for Body Scan environment
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface DeviceContextType {
  preferredMotion: 'full' | 'reduced';
  hasTouch: boolean;
  isMobile: boolean;
}

const DeviceContext = createContext<DeviceContextType>({
  preferredMotion: 'full',
  hasTouch: false,
  isMobile: false,
});

export const usePreferredMotion = () => useContext(DeviceContext).preferredMotion;
export const useHasTouch = () => useContext(DeviceContext).hasTouch;
const useIsMobile = () => useContext(DeviceContext).isMobile;

interface DeviceProviderProps {
  children: ReactNode;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  const preferredMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobile = window.innerWidth < 768 || hasTouch;
  
  const value = {
    preferredMotion,
    hasTouch,
    isMobile,
  };
  
  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};