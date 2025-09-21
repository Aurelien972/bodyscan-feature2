import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpatialIcon from '../../ui/icons/SpatialIcon';
import { ICONS } from '../../ui/icons/registry';
import { useFeedback } from '../../hooks/useFeedback';
import { useOverlayStore } from '../../system/store/overlayStore';
import CentralActionsMenu from './CentralActionsMenu';

/**
 * Configuration des boutons de la nouvelle barre inférieure
 */
const BOTTOM_BAR_BUTTONS = [
  {
    id: 'nutrition',
    label: 'Nutrition',
    icon: 'Utensils' as const,
    route: '/meals',
    color: '#10B981', // Vert nutrition
  },
  {
    id: 'activity',
    label: 'Activité',
    icon: 'Activity' as const,
    route: '/activity',
    color: '#3B82F6', // Bleu activité
  },
  {
    id: 'central',
    icon: 'Zap' as const,
    color: '#18E3FF', // Plasma Cyan
    isCentral: true,
  },
  {
    id: 'fasting',
    label: 'Jeûne',
    icon: 'Timer' as const,
    route: '/fasting',
    color: '#F59E0B', // Orange jeûne
  },
  {
    id: 'body',
    label: 'Corps',
    icon: 'Scan' as const,
    route: '/body-scan',
    color: '#A855F7', // Violet
  },
];

/**
 * Bouton de barre mobile
 */
function BarButton({
  button,
  active,
  onClick,
}: {
  button: typeof BOTTOM_BAR_BUTTONS[0];
  active: boolean;
  onClick: () => void;
}) {
  const { click } = useFeedback();

  const handleClick = () => {
    click();
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`new-bottom-bar-button ${button.isCentral ? 'new-bottom-bar-button--central' : ''}`}
      style={{ 
        '--button-color': button.color,
        '--button-active': active ? '1' : '0'
      } as React.CSSProperties}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-current={active ? 'page' : undefined}
      aria-label={button.isCentral ? 'Ouvrir le menu d\'actions' : `Aller à ${button.label}`}
    >
      <div className={`new-bottom-bar-icon-container ${active ? 'new-bottom-bar-icon-container--active' : ''}`}>
        <SpatialIcon 
          Icon={ICONS[button.icon]} 
          size={button.isCentral ? 36 : 20} 
          style={{ color: active ? button.color : 'rgba(255, 255, 255, 0.5)' }}
        />
      </div>
      {!button.isCentral && (
        <div className={`new-bottom-bar-label ${active ? 'new-bottom-bar-label--active' : ''}`}>
          {button.label}
        </div>
      )}
    </motion.button>
  );
}

/**
 * New Mobile Bottom Bar - Barre de navigation inférieure redesignée
 * 5 boutons en pleine largeur avec bouton central pour actions rapides
 */
const NewMobileBottomBar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isOpen, open, close } = useOverlayStore();
  const centralMenuOpen = isOpen('centralMenu');

  const handleButtonClick = (button: typeof BOTTOM_BAR_BUTTONS[0]) => {
    if (button.isCentral) {
      if (centralMenuOpen) {
        close();
      } else {
        open('centralMenu');
      }
    } else if (button.route) {
      navigate(button.route);
      close(); // Fermer tout panneau ouvert
    }
  };

  const isButtonActive = (button: typeof BOTTOM_BAR_BUTTONS[0]) => {
    if (button.isCentral) return centralMenuOpen;
    return button.route ? pathname.startsWith(button.route) : false;
  };

  return (
    <>
      <nav 
        className="new-mobile-bottom-bar" 
        aria-label="Navigation principale mobile"
        style={{
          position: 'fixed',
          bottom: 'var(--new-bottom-bar-bottom-offset)',
          left: '8px',
          right: '8px',
          zIndex: 9996,
          height: 'var(--new-bottom-bar-height)',
        }}
      >
        <div className="new-mobile-bottom-bar-container">
          <div className="new-mobile-bottom-bar-buttons">
            {BOTTOM_BAR_BUTTONS.map((button) => (
              <BarButton
                key={button.id}
                button={button}
                active={isButtonActive(button)}
                onClick={() => handleButtonClick(button)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Central Actions Menu */}
      <CentralActionsMenu 
        isOpen={centralMenuOpen} 
        onClose={() => close()} 
      />
    </>
  );
};

export default NewMobileBottomBar;