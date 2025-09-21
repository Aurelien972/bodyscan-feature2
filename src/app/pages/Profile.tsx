import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, useTabsKeyboard } from '../../ui/tabs';
import { ICONS } from '../../ui/icons/registry';
import { useScrollMemory } from '../../hooks/scroll/useScrollMemory';
import ProfileIdentityTab from './Profile/ProfileIdentityTab';
import ProfileNutritionTab from './Profile/ProfileNutritionTab';
import ProfileHealthTab from './Profile/ProfileHealthTab';
import ProfileEmotionsTab from './Profile/ProfileEmotionsTab';
import ProfilePreferencesTab from './Profile/ProfilePreferencesTab';
import { useFeedback } from '../../hooks/useFeedback';
import logger from '../../lib/utils/logger';
import ProfileAvatarTab from './Profile/ProfileAvatarTab';
import PageHeader from '../../ui/page/PageHeader';

/**
 * Get dynamic header content based on active tab
 */
function getTabHeaderContent(activeTab: string) {
  switch (activeTab) {
    case 'identity':
      return {
        icon: 'User' as const,
        title: 'Identité Personnelle',
        subtitle: 'Vos informations de base et mesures corporelles',
        circuit: 'home' as const,
        color: '#60A5FA',
      };
    case 'nutrition':
      return {
        icon: 'Utensils' as const,
        title: 'Forge Nutritionnelle',
        subtitle: 'Régime, allergies et préférences alimentaires',
        circuit: 'meals' as const,
        color: '#10B981',
      };
    case 'health':
      return {
        icon: 'Heart' as const,
        title: 'Santé & Médical',
        subtitle: 'Conditions médicales et contraintes de santé',
        circuit: 'health' as const,
        color: '#EF4444',
      };
    case 'emotions':
      return {
        icon: 'Smile' as const,
        title: 'Bien-être & Sommeil',
        subtitle: 'Chronotype, stress et habitudes de sommeil',
        circuit: 'emotions' as const,
        color: '#F59E0B',
      };
    case 'preferences':
      return {
        icon: 'Settings' as const,
        title: 'Entraînement & Activité',
        subtitle: 'Entraînement et préférences d\'activité',
        circuit: 'training' as const,
        color: '#06B6D4',
      };
    case 'avatar':
      return {
        icon: 'Camera' as const,
        title: 'Avatar 3D',
        subtitle: 'Votre reflet numérique et données morphologiques',
        circuit: 'avatar' as const,
        color: '#A855F7',
      };
    default:
      return {
        icon: 'User' as const,
        title: 'Profil Utilisateur',
        subtitle: 'Votre fiche personnelle complète',
        circuit: 'home' as const,
        color: '#60A5FA',
      };
  }
}

/**
 * Profile - Simplified for Body Scan development
 * Only Identity and Avatar tabs
 */
const Profile: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { click } = useFeedback();
  
  // Derive activeTab from URL hash, fallback to defaultValue
  const activeTab = React.useMemo(() => {
    const hash = location.hash.replace('#', '');
    return hash && ['identity', 'nutrition', 'health', 'emotions', 'preferences', 'avatar'].includes(hash) ? hash : 'identity';
  }, [location.hash]); 
  
  // Enable keyboard navigation for tabs
  useTabsKeyboard();
  
  // Mémoriser la position de scroll pour chaque onglet
  useScrollMemory(`profile:${activeTab}`);

  // Get dynamic header content based on active tab
  const headerContent = getTabHeaderContent(activeTab);

  const handleTabChange = (value: string) => {
    click();
    
    logger.debug('PROFILE', 'Tab change triggered', { newTab: value });
  };


  return (
    <div className="space-y-6 w-full overflow-visible">
      <PageHeader
        icon={headerContent.icon}
        title={headerContent.title}
        subtitle={headerContent.subtitle}
        circuit={headerContent.circuit}
        iconColor={headerContent.color}
      />
      
      <Tabs 
        defaultValue="identity" 
        className="w-full min-w-0 profile-tabs"
        onValueChange={handleTabChange}
      >
        <Tabs.List role="tablist" aria-label="Sections du profil" className="mb-6 w-full">
          <Tabs.Trigger value="identity" icon="User">
            <span className="tab-text">Identité</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="nutrition" icon="Utensils">
            <span className="tab-text">Nutrition</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="health" icon="Heart">
            <span className="tab-text">Santé</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="emotions" icon="Smile">
            <span className="tab-text">Émotions</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="preferences" icon="Settings">
            <span className="tab-text">Préférences</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="avatar" icon="Camera">
            <span className="tab-text">Avatar</span>
          </Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Panel value="identity">
          <ProfileIdentityTab />
        </Tabs.Panel>
        
        <Tabs.Panel value="nutrition">
          <ProfileNutritionTab />
        </Tabs.Panel>
        
        <Tabs.Panel value="health">
          <ProfileHealthTab />
        </Tabs.Panel>
        
        <Tabs.Panel value="emotions">
          <ProfileEmotionsTab />
        </Tabs.Panel>
        
        <Tabs.Panel value="preferences">
          <ProfilePreferencesTab />
        </Tabs.Panel>
        
        <Tabs.Panel value="avatar">
          <ProfileAvatarTab />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default Profile;
