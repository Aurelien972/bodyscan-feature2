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
  badge?: string;
  badgeClass?: string;
  isActive?: boolean;
}

const NavItem = React.memo(({ to, icon, label, badge, badgeClass, isActive }: NavItemProps) => {
  const Icon = ICONS[icon];
  const circuitColor = getCircuitColor(to);
  const { sidebarClick } = useFeedback();

  const handleNavItemClick = (e: React.MouseEvent) => {
    logger.trace('SIDEBAR', 'NavItem click captured', { to, label, isActive });
    
    logger.trace('SIDEBAR', 'NavItem click triggered', { to, label, currentPath: window.location.pathname });
  };

  // TwinForge active state styles
  const activeStyles = isActive ? {
    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)', // Indigo fumé 10%
    border: '1px solid color-mix(in srgb, var(--color-plasma-cyan) 12%, transparent)', // Bordure cyan 12%
    borderRadius: '20px', // Pill shape
    height: '40px',
    position: 'relative' as const,
    // Liseré vertical cyan sur le bord gauche
    '::before': {
      content: '""',
      position: 'absolute',
      left: '-3px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '2px',
      height: '24px',
      backgroundColor: 'color-mix(in srgb, var(--color-plasma-cyan) 12%, transparent)',
      borderRadius: '1px'
    }
  } : {};

  return (
    <div className="relative">
      {/* Liseré vertical cyan pour l'état actif */}
      {isActive && (
        <div
          className="absolute left-[-12px] top-1/2 transform -translate-y-1/2 w-[2px] h-[24px] rounded-[1px]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-plasma-cyan) 12%, transparent)',
            zIndex: 10
          }}
        />
      )}
      
      <Link
        to={to}
        className={`
          sidebar-item group flex items-center gap-3 px-3 py-2 rounded-xl
          transition-all duration-200 focus-ring
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
        style={isActive ? {
          backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)', // Indigo fumé 10%
          border: '1px solid color-mix(in srgb, var(--color-plasma-cyan) 12%, transparent)', // Bordure cyan 12%
          borderRadius: '20px', // Pill shape
          height: '40px'
        } : {}}
        aria-current={isActive ? 'page' : undefined}
      >
        <SpatialIcon 
          Icon={Icon} 
          size={16} 
          color={isActive ? 'var(--color-plasma-cyan)' : '#94A3B8'} // TwinForge colors
          className={`sidebar-item-icon ${isActive ? '' : 'opacity-80 group-hover:opacity-100'}`}
        />
        <span className={`sidebar-item-label font-medium text-xs truncate ${
          isActive ? 'text-white' : 'text-white/82'
        }`}>
          {label}
        </span>
        {badge && (
          <span className={`ml-auto text-xs ${badgeClass || 'text-white/40'}`}>
            {badge}
          </span>
        )}
      </Link>
    </div>
  );
});
NavItem.displayName = 'NavItem';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <h3 className="sidebar-section-title" role="heading" aria-level="3">
      {title}
    </h3>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const Sidebar = React.memo(({ className = '' }: { className?: string }) => {
  const location = useLocation();
  const { sessionInfo } = useUserStore();
  const userRole = sessionInfo?.role || 'user';
  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);
  
  // Log sidebar render
  React.useEffect(() => {
    logger.trace('SIDEBAR', 'Component rendered', { userRole, currentPath: location.pathname });
  }, [userRole, location.pathname]);

  // Get navigation structure for current role
  const navigation = navFor(userRole);

  return (
    <aside
      className={`hidden lg:flex flex-col ${className}
        sticky top-[88px] left-0
        h-[calc(100dvh-104px)]
        w-full
        sidebar-glass rounded-2xl visionos-grid
      `}
      role="complementary"
      aria-label="Main navigation"
    >
      <div className="sidebar-content space-y-4 flex-1 pt-0">
        
        {/* Dynamic Navigation Based on Role */}
        {navigation.map((section) => (
          <Section key={section.title} title={section.title}>
            {section.items.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                badgeClass={item.badge ? "text-[10px] text-brand-primary" : undefined}
                isActive={isActive(item.to)}
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
