// src/app/pages/Avatar/AvatarPage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, useTabsKeyboard } from '../../../ui/tabs';
import { useScrollMemory } from '../../../hooks/scroll/useScrollMemory';
import { useFeedback } from '../../../hooks/useFeedback';
import PageHeader from '../../../ui/page/PageHeader';
import AvatarTab from './tabs/AvatarTab';
import InsightsTab from './tabs/InsightsTab';
import HistoryTab from './tabs/HistoryTab';
import logger from '../../../lib/utils/logger';

type TabKey = 'avatar' | 'insights' | 'history';

/**
 * Get dynamic header content based on active tab
 */
function getTabHeaderContent(activeTab: TabKey) {
  switch (activeTab) {
    case 'avatar':
      return {
        icon: 'Eye' as const,
        title: 'Votre Avatar 3D',
        subtitle: 'Visualisez et ajustez votre reflet numérique personnalisé',
        circuit: 'avatar' as const,
        color: '#8B5CF6',
      };
    case 'insights':
      return {
        icon: 'Zap' as const,
        title: 'Insights Avatar',
        subtitle:
          'Analyses IA personnalisées et recommandations basées sur votre scan corporel',
        circuit: 'avatar' as const,
        color: '#F59E0B',
      };
    case 'history':
      return {
        icon: 'History' as const, // clé existante dans le registry
        title: 'Historique des Scans',
        subtitle: 'Revivez vos transformations corporelles au fil du temps',
        circuit: 'avatar' as const,
        color: '#06B6D4',
      };
    default:
      return {
        icon: 'Eye' as const,
        title: 'Votre Avatar 3D',
        subtitle: 'Visualisez et ajustez votre reflet numérique personnalisé',
        circuit: 'avatar' as const,
        color: '#8B5CF6',
      };
  }
}

/**
 * Avatar Page
 * - 3 onglets : Avatar / Insights / Historique
 * - Tabs non contrôlé avec defaultValue="avatar" -> Avatar sélectionné par défaut
 * - On met à jour le hash quand l’utilisateur change d’onglet pour URL partageable
 */
const AvatarPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { click } = useFeedback();

  // Onglet actif *pour l'entête uniquement* (si pas de hash -> 'avatar')
  const activeTab = React.useMemo<TabKey>(() => {
    const hash = location.hash.replace('#', '');
    return (['avatar', 'insights', 'history'] as TabKey[]).includes(hash as TabKey)
      ? (hash as TabKey)
      : 'avatar';
  }, [location.hash]);

  // Accessibilité clavier pour Tabs
  useTabsKeyboard();

  // Mémorise le scroll par onglet (si absence de hash, on mémorise 'avatar')
  useScrollMemory(`avatar:${activeTab}`);

  const headerContent = getTabHeaderContent(activeTab);

  // Met à jour le hash lors d’un changement d’onglet
  const handleTabChange = (value: string) => {
    const next = (value || 'avatar') as TabKey;
    click();
    logger.debug('AVATAR_PAGE', 'Tab change triggered', { newTab: next });

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: `#${next}`,
      },
      { replace: false }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={headerContent.icon}
        title={headerContent.title}
        subtitle={headerContent.subtitle}
        circuit={headerContent.circuit}
        iconColor={headerContent.color}
      />

      <Tabs
        // ⚠️ Non contrôlé : on laisse Tabs gérer l’état interne
        defaultValue="avatar" // --> Avatar sélectionné par défaut à l’arrivée
        className="w-full min-w-0 avatar-tabs"
        onValueChange={handleTabChange}
      >
        <Tabs.List
          role="tablist"
          aria-label="Sections de l'avatar"
          className="mb-4 md:mb-6 w-full"
        >
          <Tabs.Trigger value="avatar" icon="Eye" aria-controls="panel-avatar">
            <span className="tab-text">Avatar</span>
          </Tabs.Trigger>

          <Tabs.Trigger value="insights" icon="Zap" aria-controls="panel-insights">
            <span className="tab-text">Insights</span>
          </Tabs.Trigger>

          <Tabs.Trigger value="history" icon="History" aria-controls="panel-history">
            <span className="tab-text">Historique</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel id="panel-avatar" value="avatar">
          <AvatarTab />
        </Tabs.Panel>

        <Tabs.Panel id="panel-insights" value="insights">
          <InsightsTab />
        </Tabs.Panel>

        <Tabs.Panel id="panel-history" value="history">
          <HistoryTab />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default AvatarPage;