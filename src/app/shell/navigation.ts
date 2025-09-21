/**
 * Simplified Navigation System
 * Essential navigation for Body Scan development
 */

import { ICONS } from '../../ui/icons/registry';

interface NavItem {
  to: string;
  icon: keyof typeof ICONS;
  label: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Generate simplified navigation structure
 */
export function navFor(role: 'user' | 'admin' = 'user'): NavSection[] {
  return [
    {
      title: 'Navigation',
      items: [
        { to: '/', icon: 'Home', label: 'Tableau de bord' },
        { to: '/avatar', icon: 'Eye', label: 'Avatar' },
        { to: '/body-scan', icon: 'Scan', label: 'Scanner mon corps' },
      ],
    },
  ];
}