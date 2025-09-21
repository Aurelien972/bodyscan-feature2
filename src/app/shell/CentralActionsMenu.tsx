import React from 'react';

interface CentralActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const CentralActionsMenu: React.FC<CentralActionsMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="central-actions-menu">
      <div className="central-actions-menu-overlay" onClick={onClose} />
      <div className="central-actions-menu-content">
        {/* Menu content will be implemented later */}
        <p>Central Actions Menu</p>
      </div>
    </div>
  );
};

export default CentralActionsMenu;