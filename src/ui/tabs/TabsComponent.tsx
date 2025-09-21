import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ICONS } from '../icons/registry';
import { TabsContext, useTabs } from './TabsContext';

// Main Tabs component
const Tabs: React.FC<{
  defaultValue: string;
  className?: string;
  children: ReactNode;
  onValueChange?: (value: string) => void;
}> & {
  List: React.FC<{
    role?: string;
    'aria-label'?: string;
    className?: string;
    children: ReactNode;
  }>;
  Trigger: React.FC<{
    value: string;
    icon?: keyof typeof ICONS;
    children: ReactNode;
  }>;
  Panel: React.FC<{
    value: string;
    children: ReactNode;
  }>;
} = ({ defaultValue, className = '', children, onValueChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Derive activeTab from URL hash, fallback to defaultValue
  const activeTab = React.useMemo(() => {
    const hash = location.hash.replace('#', '');
    return hash || defaultValue;
  }, [location.hash, defaultValue]);
  
  // Handle tab change by updating URL hash
  const setActiveTab = React.useCallback((value: string) => {
    navigate({ hash: value });
    onValueChange?.(value);
  }, [navigate, onValueChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`tabs w-full ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// TabsList component
const TabsList: React.FC<{
  role?: string;
  'aria-label'?: string;
  className?: string;
  children: ReactNode;
}> = ({ 
  role = 'tablist', 
  'aria-label': ariaLabel, 
  className = '', 
  children 
}) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // VisionOS 26 - Dynamic overflow detection for fade indicators
  React.useEffect(() => {
    const checkOverflow = () => {
      const element = listRef.current;
      const container = containerRef.current;
      if (!element || !container) return;
      
      const hasOverflow = element.scrollWidth > element.clientWidth;
      container.classList.toggle('has-overflow', hasOverflow);
    };
    
    checkOverflow();
    
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (listRef.current) {
      resizeObserver.observe(listRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [children]);
  
  return (
    <div 
      ref={containerRef}
      className={`tabs-list-container ${className}`}
    >
      <div 
        ref={listRef}
        role={role}
        aria-label={ariaLabel}
        className="tabs-list"
      >
        {children}
      </div>
    </div>
  );
};

// TabsTrigger component
const TabsTrigger: React.FC<{
  value: string;
  icon?: keyof typeof ICONS;
  children: ReactNode;
}> = ({ value, icon, children }) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;
  const IconComponent = icon ? ICONS[icon] : null;

  // Couleurs spécifiques par onglet de profil
  const getTabIconColor = (tabValue: string, isActive: boolean) => {
    if (!isActive) return undefined; // Couleur par défaut pour les onglets inactifs
    
    const tabColors: Record<string, string> = {
      'avatar': '#A855F7',    // Violet pour avatar
      'identity': '#60A5FA',  // Bleu pour identité
      'nutrition': '#10B981', // Vert pour nutrition
      'health': '#EF4444',    // Rouge pour santé
      'emotions': '#F59E0B',  // Orange pour émotions
      'preferences': '#06B6D4', // Cyan pour préférences
      // Couleurs pour les onglets de repas
      'daily': '#10B981',     // Vert pour récap du jour (même que nutrition)
      'insights': '#06B6D4',  // Cyan pour insights
      'history': '#8B5CF6',   // Violet pour historique (déjà correct)
    };
    
    return tabColors[tabValue];
  };

  const iconColor = getTabIconColor(value, isActive);
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      className={`tabs-trigger ${isActive ? 'active' : ''}`}
      onClick={() => setActiveTab(value)}
    >
      {IconComponent && (
        <IconComponent 
          className="tab-icon" 
          color={iconColor}
          style={iconColor ? { color: iconColor } : undefined}
        />
      )}
      {children}
    </button>
  );
};

// TabsPanel component
const TabsPanel: React.FC<{
  value: string;
  children: ReactNode;
}> = ({ value, children }) => {
  const { activeTab } = useTabs();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className="tabs-panel pt-6 md:pt-8"
    >
      {children}
    </div>
  );
};

// Attach sub-components
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Panel = TabsPanel;

export default Tabs;