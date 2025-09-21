/**
 * Base Navigation System
 * Essential navigation for TwinForge base
 */

import { ICONS } from '../../ui/icons/registry';

interface NavItem {
  to: string;
  icon: keyof typeof ICONS;
  label: string;
  subtitle: string;
  isPrimary?: boolean;
  circuitColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Generate navigation structure for Forge Spatiale
 * Simplified navigation for MVP users
 */
export function navFor(): NavSection[] {
  const sections: NavSection[] = [
    // Élément principal - Cœur de la Forge (en dehors des sections)
    {
      title: '', // Pas de titre pour l'élément principal
      items: [
        { 
          to: '/', 
          icon: 'Home', 
          label: 'Cœur de la Forge', 
          subtitle: 'Tableau de Bord',
          isPrimary: true,
          circuitColor: '#60A5FA' // Bleu pour le cœur
        },
      ],
    },
    {
      title: 'Rituels du Forgeron',
      items: [
        { to: '/meals', icon: 'Utensils', label: 'Forge Nutritionnelle', subtitle: 'Scanner de repas', circuitColor: '#10B981' },
        { to: '/activity', icon: 'Activity', label: 'Forge Énergétique', subtitle: 'Journal d\'activité', circuitColor: '#3B82F6' },
        { to: '/fasting', icon: 'Timer', label: 'Forge du Temps', subtitle: 'Jeûne intermittent', circuitColor: '#F59E0B' },
        { to: '/body-scan', icon: 'Scan', label: 'Forge Corporelle', subtitle: 'Scanner corporel', circuitColor: '#18E3FF' },
      ],
    },
    {
      title: 'Ateliers du Forgeron',
      items: [
        { to: '/fridge', icon: 'Refrigerator', label: 'Atelier de Recettes', subtitle: 'Scanner de frigo', circuitColor: '#EC4899' },
        { to: '/training', icon: 'Target', label: 'Atelier de Training', subtitle: 'Générateur de Training', circuitColor: '#A855F7' },
      ],
    },
  ];
  
  return sections;
}