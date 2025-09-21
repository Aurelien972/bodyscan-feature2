// src/app/pages/Avatar/tabs/HistoricalScanModal.tsx
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import GlassCard from '../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../ui/icons/registry';
import Avatar3DViewer from '../../../../components/3d/Avatar3DViewer';
import { bodyScanRepo } from '../../../../system/data/repositories/bodyScanRepo';
import { useUserStore } from '../../../../system/store/userStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoricalScanModalProps {
  scanId: string;
  onClose: () => void;
}

const HistoricalScanModal: React.FC<HistoricalScanModalProps> = ({ scanId, onClose }) => {
  const { profile } = useUserStore();
  const userProfile = profile;

  const avatar3DRef = useRef<any>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);

  const { data: scan, isLoading, error } = useQuery({
    queryKey: ['historical-scan', scanId],
    queryFn: () => bodyScanRepo.getById(scanId),
    enabled: !!scanId,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const scanDate = scan ? format(new Date(scan.created_at), 'dd MMMM yyyy', { locale: fr }) : 'N/A';

  // Effet pour ajuster la caméra une fois le viewer 3D prêt
  useEffect(() => {
    if (isViewerReady && avatar3DRef.current?.resetCamera) {
      avatar3DRef.current.resetCamera();
    }
  }, [isViewerReady]);

  // Fermer la modale avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-lg flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        className="relative w-full max-w-6xl my-4 sm:my-8 rounded-xl overflow-hidden flex flex-col"
        style={{ 
          height: 'calc(100vh - 2rem)',
          maxHeight: '900px',
          minHeight: '600px'
        }}
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard className="flex-1 p-4 sm:p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-white font-semibold text-lg sm:text-xl flex items-center gap-2">
              <SpatialIcon Icon={ICONS.Timeline} size={24} className="text-blue-400" />
              <span className="truncate">Scan du {scanDate}</span>
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Fermer"
            >
              <SpatialIcon Icon={ICONS.X} size={20} className="text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 relative min-h-0">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <SpatialIcon Icon={ICONS.Loader2} size={48} className="text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-white/70">Chargement du scan...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-red-400">
                  <SpatialIcon Icon={ICONS.AlertCircle} size={48} className="mx-auto mb-4" />
                  <p>Erreur de chargement du scan</p>
                  <p className="text-sm mt-2 text-red-300">{error.message}</p>
                </div>
              </div>
            )}

            {scan && !isLoading && (
              <div className="w-full h-full relative">
                <Avatar3DViewer
                  ref={avatar3DRef}
                  scanResult={scan}
                  userProfile={userProfile}
                  morphData={scan.metrics?.final_shape_params || scan.metrics?.morph_values}
                  limbMasses={scan.metrics?.final_limb_masses || scan.metrics?.limb_masses}
                  skinTone={scan.metrics?.skin_tone}
                  resolvedGender={scan.metrics?.resolved_gender || userProfile?.sex}
                  className="w-full h-full"
                  autoRotate={true}
                  showControls={true}
                  onViewerReady={() => setIsViewerReady(true)}
                />
              </div>
            )}
          </div>

          {/* Footer avec informations du scan */}
          {scan && !isLoading && (
            <div className="mt-4 pt-4 border-t border-white/10 flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {scan.metrics?.estimate_result?.extracted_data?.raw_measurements?.weight_kg && (
                  <div className="text-center">
                    <p className="text-white/50">Poids</p>
                    <p className="text-white font-medium">
                      {scan.metrics.estimate_result.extracted_data.raw_measurements.weight_kg.toFixed(1)} kg
                    </p>
                  </div>
                )}
                {scan.metrics?.estimate_result?.extracted_data?.raw_measurements?.height_cm && (
                  <div className="text-center">
                    <p className="text-white/50">Taille</p>
                    <p className="text-white font-medium">
                      {scan.metrics.estimate_result.extracted_data.raw_measurements.height_cm.toFixed(1)} cm
                    </p>
                  </div>
                )}
                {scan.metrics?.estimate_result?.estimated_bmi && (
                  <div className="text-center">
                    <p className="text-white/50">IMC</p>
                    <p className="text-white font-medium">
                      {scan.metrics.estimate_result.estimated_bmi.toFixed(1)}
                    </p>
                  </div>
                )}
                {scan.metrics?.estimate_result?.extracted_data?.processing_confidence && (
                  <div className="text-center">
                    <p className="text-white/50">Confiance</p>
                    <p className="text-white font-medium">
                      {Math.round(scan.metrics.estimate_result.extracted_data.processing_confidence * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default HistoricalScanModal;