import React, { ReactNode } from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../../system/store/userStore';
import { useFeedback } from '@/hooks';
import logger from '../../lib/utils/logger';

interface LinkProps extends Omit<RouterLinkProps, 'to'> {
  to: string;
  children: ReactNode;
  prefetch?: boolean;
  className?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}

/**
 * Enhanced Link component with prefetch capabilities
 * Optimizes navigation performance with hover prefetching
 */
export const Link: React.FC<LinkProps> = ({
  to,
  children,
  prefetch = true,
  className = '',
  onMouseEnter,
  onPointerDown,
  ...rest
}) => {
  // Component render logging moved to trace level
  React.useEffect(() => {
    logger.trace('LINK', 'Component rendered for route', { to, prefetch });
  }, [to, prefetch]);

  const queryClient = useQueryClient();
  const { session } = useUserStore();
  const { click } = useFeedback();

  const handleMouseEnter = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call original onMouseEnter if provided
    onMouseEnter?.(e);

    // Prefetch disabled - simplified for body scan environment
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
    logger.trace('LINK', 'PointerDown captured for route', { to, eventType: e.type });
    
    logger.trace('LINK', 'PointerDown event triggered', { to, isSidebarLink: !!e.currentTarget.closest('.sidebar-item') });
    
    // Immediate audio feedback for navigation - use specific sidebar sound if in sidebar context
    const isSidebarLink = e.currentTarget.closest('.sidebar.item');
    if (isSidebarLink) {
      const { sidebarClick } = useFeedback();
      logger.trace('LINK', 'Triggering sidebar click sound');
      sidebarClick();
    } else {
      logger.trace('LINK', 'Triggering regular click sound');
      click();
    }
    onPointerDown?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    logger.trace('LINK', 'Click captured', { to, eventType: e.type });
    
    logger.trace('LINK', 'Click event triggered', { to, currentPath: window.location.pathname, defaultPrevented: e.defaultPrevented });
    
    // Don't interfere with default navigation unless there's a specific reason
    if (e.defaultPrevented) {
      logger.debug('🔍 [Link] Event already prevented, not navigating');
      return;
    }
    
    // Log successful navigation attempt
    logger.trace('LINK', 'Proceeding with navigation to', { to });
  };
  
  // Component lifecycle logging moved to trace level
  React.useEffect(() => {
    logger.trace('LINK', 'Component mounted for route', { to });
    return () => {
      logger.trace('LINK', 'Component unmounted for route', { to });
    };
  }, [to]);
  
  return (
    <RouterLink
      to={to}
      className={`${className} inline-flex items-center`}
      onMouseEnter={handleMouseEnter}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onMouseDown={(e) => {
        logger.trace('LINK', 'MouseDown captured', { to, button: e.button });
      }}
      onTouchStart={(e) => {
        logger.trace('LINK', 'TouchStart captured', { to, touches: e.touches.length });
      }}
      {...rest}
    >
      {children}
    </RouterLink>
  );
};
