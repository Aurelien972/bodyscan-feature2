/**
 * Overlay Store - Gestion centralisée des panneaux superposés
 * Store unique pour gérer l'état d'ouverture des panneaux sur mobile
 */

import { create } from 'zustand';
import logger from '../../lib/utils/logger';

export type OverlayId = 'none' | 'mobileDrawer' | 'centralMenu' | 'userPanel';

interface OverlayState {
  activeOverlayId: OverlayId;
  previousOverlayId: OverlayId;
  
  // Actions
  open: (overlayId: Exclude<OverlayId, 'none'>) => void;
  close: () => void;
  toggle: (overlayId: Exclude<OverlayId, 'none'>) => void;
  isOpen: (overlayId: Exclude<OverlayId, 'none'>) => boolean;
  isAnyOpen: () => boolean;
}

/**
 * Store centralisé pour la gestion des overlays
 * Garantit qu'un seul panneau est ouvert à la fois
 */
export const useOverlayStore = create<OverlayState>((set, get) => ({
  activeOverlayId: 'none',
  previousOverlayId: 'none',

  open: (overlayId: Exclude<OverlayId, 'none'>) => {
    const currentState = get();
    
    logger.debug('OVERLAY_STORE', 'Opening overlay', {
      overlayId,
      currentActiveOverlay: currentState.activeOverlayId,
      willCloseExisting: currentState.activeOverlayId !== 'none',
      timestamp: new Date().toISOString()
    });

    // Si un autre panneau est ouvert, le fermer d'abord
    if (currentState.activeOverlayId !== 'none' && currentState.activeOverlayId !== overlayId) {
      logger.info('OVERLAY_STORE', 'Closing existing overlay before opening new one', {
        closingOverlay: currentState.activeOverlayId,
        openingOverlay: overlayId,
        timestamp: new Date().toISOString()
      });
    }

    set({
      previousOverlayId: currentState.activeOverlayId,
      activeOverlayId: overlayId,
    });

    logger.info('OVERLAY_STORE', 'Overlay opened successfully', {
      overlayId,
      previousOverlay: currentState.activeOverlayId,
      timestamp: new Date().toISOString()
    });
  },

  close: () => {
    const currentState = get();
    
    if (currentState.activeOverlayId === 'none') {
      logger.debug('OVERLAY_STORE', 'Close called but no overlay is open', {
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.debug('OVERLAY_STORE', 'Closing overlay', {
      closingOverlay: currentState.activeOverlayId,
      timestamp: new Date().toISOString()
    });

    set({
      previousOverlayId: currentState.activeOverlayId,
      activeOverlayId: 'none',
    });

    logger.info('OVERLAY_STORE', 'Overlay closed successfully', {
      closedOverlay: currentState.previousOverlayId,
      timestamp: new Date().toISOString()
    });
  },

  toggle: (overlayId: Exclude<OverlayId, 'none'>) => {
    const currentState = get();
    
    if (currentState.activeOverlayId === overlayId) {
      get().close();
    } else {
      get().open(overlayId);
    }
  },

  isOpen: (overlayId: Exclude<OverlayId, 'none'>) => {
    return get().activeOverlayId === overlayId;
  },

  isAnyOpen: () => {
    return get().activeOverlayId !== 'none';
  },
}));