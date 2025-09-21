/**
 * Error Overlay Component
 * Error state display for 3D viewer
 */

import React from 'react';
import SpatialIcon from '../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../ui/icons/registry';

interface ErrorOverlayProps {
  error: string | null;
  onRetry: () => void;
}

/**
 * Error overlay component for 3D viewer
 */
const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ error, onRetry }) => {
  if (!error) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
      <div className="text-center space-y-4">
        <SpatialIcon Icon={ICONS.AlertCircle} size={48} className="text-red-400 mx-auto" />
        <div>
          <h4 className="text-white font-semibold mb-2">Affichage 3D indisponible</h4>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="btn-glass--primary px-4 py-2"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorOverlay;