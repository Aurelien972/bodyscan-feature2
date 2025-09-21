import React, { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from '../nav/Link';
import { ICONS } from '../../ui/icons/registry';
import SpatialIcon from '../../ui/icons/SpatialIcon';
import { useUserStore } from '../../system/store/userStore';
import { getCircuitColor } from '../../ui/theme/circuits';
import { navFor } from './navigation';
import { useFeedback } from '@/hooks';
import logger from '../../lib/utils/logger';

interface NavItemProps {
  to: string;
  icon: keyof typeof ICONS;
  label: string;
  subtitle: string;
  isPrimary?: boolean;
  isActive?: boolean;
  circuitColor?: string;
}

const NavItem = React.memo(({ to, icon, label, subtitle, isPrimary = false, isActive, circuitColor }: NavItemProps) => {
  const Icon = ICONS[icon];
  const itemColor = circuitColor || getCircuitColor(to);
  const { sidebarClick } = useFeedback();

  const handleNavItemClick = (e: React.MouseEvent) => {
    logger.trace('SIDEBAR', 'NavItem click captured', { to, label, isActive });
    
    logger.trace('SIDEBAR', 'NavItem click triggered', { to, label, currentPath: window.location.pathname });
  };

  return (
    <div className="relative">
      <Link
        to={to}
        className={`
          sidebar-item ${isPrimary ? 'sidebar-item--primary' : ''} 
          group flex items-center gap-3 focus-ring
          ${isActive 
            ? 'text-white shadow-sm' 
            : 'text-white/70 hover:bg-white/5 hover:text-white'
          }
        `}
        onClick={handleNavItemClick}
        onPointerDown={(e) => {
          logger.trace('SIDEBAR', 'NavItem pointer down', { to, label });
        }}
        onMouseDown={(e) => {
          logger.trace('SIDEBAR', 'NavItem mouse down', { to, label });
        }}
        aria-current={isActive ? 'page' : undefined}
      >
        <SpatialIcon 
          Icon={Icon} 
          size={isPrimary ? 20 : 16} 
          className={`sidebar-item-icon ${isActive ? '' : 'opacity-80 group-hover:opacity-100'}`}
          color={isActive ? itemColor : undefined}
          style={isActive ? { 
            color: itemColor,
            filter: `drop-shadow(0 0 8px ${itemColor}60)`
          } : undefined}
        />
        <div className="flex-1 min-w-0">
          <div className={`sidebar-item-label font-medium ${isPrimary ? 'text-sm' : 'text-xs'} truncate ${
            isActive ? 'text-white' : 'text-white/82'
          }`}>
            {label}
          </div>
          <div className={`sidebar-item-subtitle text-xxs truncate ${isPrimary ? 'mt-0.5' : 'mt-0'} ${
            isActive ? 'text-white/70' : 'text-white/50'
          }`}>
            {subtitle}
          </div>
        </div>
      </Link>
    </div>
  );
});
NavItem.displayName = 'NavItem';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    {title && (
      <h3 className={`sidebar-section-title ${getSectionClass(title)}`} role="heading" aria-level="3">
        {title}
      </h3>
    )}
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

/**
 * Get section-specific CSS class for visual differentiation
 */
function getSectionClass(title: string): string {
  switch (title) {
    case 'Rituels du Forgeron':
      return 'sidebar-section--daily-tracking';
    case 'Ateliers du Forgeron':
      return 'sidebar-section--forge-tools';
    case 'Mon Profil':
      return 'sidebar-section--profile';
    default:
      return '';
  }
}

const Sidebar = React.memo(({ className = '' }: { className?: string }) => {
  const location = useLocation();
  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);
  
  // Log sidebar render
  React.useEffect(() => {
    logger.trace('SIDEBAR', 'Component rendered', { currentPath: location.pathname });
  }, [location.pathname]);

  // Get navigation structure
  const navigation = navFor();

  return (
    <aside
      className={`hidden lg:flex flex-col ${className}
        sticky top-[88px] left-0
        h-[calc(100dvh-104px)]
        w-full
        sidebar-glass-enhanced rounded-2xl visionos-grid
      `}
      role="complementary"
      aria-label="Main navigation"
    >
      <div className="sidebar-content space-y-3 flex-1 pt-2">
        
        {/* Dynamic Navigation Based on Role */}
        {navigation.map((section) => (
          <Section key={section.title} title={section.title}>
            {section.items.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                subtitle={item.subtitle}
                isPrimary={item.isPrimary}
                isActive={isActive(item.to)}
                circuitColor={item.circuitColor}
              />
            ))}
          </Section>
        ))}
      </div>
    </aside>
  );
});
Sidebar.displayName = 'Sidebar';


export default Sidebar;
