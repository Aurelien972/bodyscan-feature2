/**
 * Scroll Memory Hook - Phase 9.78
 * Sauvegarde et restaure la position de scroll par clé (ex: onglet)
 */

import { useEffect } from 'react';

// Mémoire globale des positions de scroll
const scrollMemory = new Map<string, number>();

/**
 * Hook pour mémoriser et restaurer la position de scroll
 * @param key - Clé unique pour identifier la position (ex: "profile:identity")
 * @param container - Élément conteneur (optionnel, utilise window par défaut)
 */
export function useScrollMemory(key: string, container?: HTMLElement | null) {
  useEffect(() => {
    const element = container || document.scrollingElement || document.documentElement;
    
    // Restaurer la position sauvegardée
    const savedPosition = scrollMemory.get(key) || 0;
    if (element && savedPosition > 0) {
      // Utiliser scrollTo avec behavior: 'instant' pour éviter l'animation
      if ('scrollTo' in element) {
        (element as any).scrollTo({ top: savedPosition, behavior: 'instant' });
      } else {
        (element as any).scrollTop = savedPosition;
      }
    }
    
    // Sauvegarder la position lors du scroll
    const handleScroll = () => {
      const currentPosition = element ? 
        ('scrollTop' in element ? element.scrollTop : window.scrollY) : 
        window.scrollY;
      scrollMemory.set(key, currentPosition);
    };
    
    // Utiliser des listeners passifs pour la performance
    const target = element || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [key, container]);
}

/**
 * Hook pour mémoriser la position de scroll d'un conteneur spécifique
 */

/**
 * Nettoyer la mémoire de scroll (utile pour le debugging)
 */

/**
 * Obtenir les statistiques de la mémoire de scroll
 */