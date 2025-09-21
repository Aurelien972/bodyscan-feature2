import React from 'react';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';

interface ActionButtonsProps {
  isViewerReady: boolean;
  onSaveAvatar: () => void;
  onNewScan: () => void;
}

/**
 * Action buttons for review page
 */
const ActionButtons: React.FC<ActionButtonsProps> = ({
  isViewerReady,
  onSaveAvatar,
  onNewScan
}) => {
  return (
    <div className="grid grid-cols-2 gap-6 mt-8">
      <button
        onClick={onSaveAvatar}
        disabled={!isViewerReady}
        className={`px-6 py-4 text-lg font-semibold ${
          isViewerReady ? 'btn-glass--primary' : 'btn-glass opacity-50 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <SpatialIcon Icon={ICONS.Save} size={20} />
          <span>Sauvegarder cet avatar</span>
        </div>
      </button>

      <button
        onClick={onNewScan}
        className="btn-glass px-6 py-4 text-lg font-semibold"
      >
        <div className="flex items-center justify-center gap-2">
          <SpatialIcon Icon={ICONS.Scan} size={20} />
          <span>Nouveau scan</span>
        </div>
      </button>
    </div>
  );
};

export default ActionButtons;
