import { useEffect } from 'react';

/**
 * Keyboard navigation for tabs
 */
export const useTabsKeyboard = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).getAttribute('role') === 'tab') {
        const tablist = (e.target as HTMLElement).closest('[role="tablist"]');
        if (!tablist) return;
        
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
        const currentIndex = tabs.indexOf(e.target as HTMLElement);
        
        let nextIndex = currentIndex;
        
        if (e.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft') {
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }
        
        if (nextIndex !== currentIndex) {
          e.preventDefault();
          tabs[nextIndex]?.click();
          tabs[nextIndex]?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};