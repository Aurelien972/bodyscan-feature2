// src/app/pages/Avatar/tabs/HistoryTab.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../ui/icons/registry';
import { useUserStore } from '../../../../system/store/userStore';
import { bodyScanRepo } from '../../../../system/data/repositories/bodyScanRepo';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import HistoricalScanModal from './HistoricalScanModal';

const isValidNumber = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);

const toNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const parsed = parseFloat(v);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const formatOneDecimal = (n: number | undefined) =>
  isValidNumber(n) ? n.toFixed(1) : '-';

const formatWithUnit = (n: number | undefined, unit: string) =>
  isValidNumber(n) ? `${n.toFixed(1)} ${unit}` : '-';

const Badge: React.FC<{ children: React.ReactNode; tone?: 'info' | 'muted' }> = ({ children, tone = 'info' }) => (
  <span
    className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
      tone === 'info'
        ? 'bg-blue-500/15 text-blue-200 border border-blue-400/20'
        : 'bg-white/5 text-white/50 border border-white/10'
    }`}
  >
    {children}
  </span>
);

const Row: React.FC<{ icon: keyof typeof ICONS; label: string; value: string | number | undefined }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center gap-3">
    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
      <SpatialIcon Icon={ICONS[icon]} size={14} className="text-white/70" />
    </div>
    <div className="flex-1 flex justify-between items-baseline">
      <span className="text-white/60 text-xs">{label}</span>
      <span className="text-white font-medium text-sm">{typeof value === 'number' ? value.toFixed(1) : value}</span>
    </div>
  </div>
);

const HistoryTab: React.FC = () => {
  const { profile } = useUserStore();
  const userId = profile?.userId;

  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: scans, isLoading, error } = useQuery({
    queryKey: ['body-scan-history', userId],
    queryFn: () => bodyScanRepo.getHistory(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleViewScan = (scanId: string) => {
    setSelectedScanId(scanId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedScanId(null);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <GlassCard className="text-center p-8">
        <SpatialIcon Icon={ICONS.Loader2} size={48} className="text-purple-400 animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-3">Chargement de l'historique...</h3>
        <p className="text-white/70 text-sm">Récupération de vos scans passés.</p>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="text-center p-8">
        <SpatialIcon Icon={ICONS.AlertCircle} size={48} className="text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-3">Erreur de chargement</h3>
        <p className="text-red-300 text-sm mb-6">{(error as any)?.message}</p>
        <button onClick={() => window.location.reload()} className="btn-glass--primary">
          Réessayer
        </button>
      </GlassCard>
    );
  }

  if (!scans || scans.length === 0) {
    return (
      <GlassCard className="text-center p-8">
        <SpatialIcon Icon={ICONS.Info} size={48} className="text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-3">Aucun scan trouvé</h3>
        <p className="text-white/70 text-sm mb-6">
          Vous n'avez pas encore d'historique de scans corporels. Effectuez votre premier scan !
        </p>
        <button onClick={() => (window.location.href = '/body-scan')} className="btn-glass--primary">
          Commencer un scan
        </button>
      </GlassCard>
    );
  }

  const HistoryIcon = ICONS.History; // fiable

  return (
    <div className="space-y-6 profile-section-container">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {scans.map((scan: any) => {
            const scanDate = new Date(scan.created_at);

            // 1) Récupération depuis metrics
            const metrics = scan?.metrics;
            const weightFromScan =
              toNumber(metrics?.estimate_result?.extracted_data?.raw_measurements?.weight_kg) ??
              toNumber(metrics?.estimate_result?.weight_kg) ??
              toNumber(metrics?.weight_kg);

            const heightFromScan =
              toNumber(metrics?.estimate_result?.extracted_data?.raw_measurements?.height_cm) ??
              toNumber(metrics?.estimate_result?.height_cm) ??
              toNumber(metrics?.height_cm);

            const bmiFromScan =
              toNumber(metrics?.estimate_result?.estimated_bmi) ??
              toNumber(metrics?.estimated_bmi);

            // 2) Fallback profil
            const usedProfileWeight = !isValidNumber(weightFromScan) && isValidNumber(toNumber(profile?.weight_kg));
            const usedProfileHeight = !isValidNumber(heightFromScan) && isValidNumber(toNumber(profile?.height_cm));

            const resolvedWeightKg = weightFromScan ?? toNumber(profile?.weight_kg);
            const resolvedHeightCm = heightFromScan ?? toNumber(profile?.height_cm);

            // 3) Calcul IMC si nécessaire
            let resolvedBmi = bmiFromScan;
            if (
              !isValidNumber(resolvedBmi) &&
              isValidNumber(resolvedWeightKg) &&
              isValidNumber(resolvedHeightCm) &&
              resolvedHeightCm > 0
            ) {
              const hMeters = resolvedHeightCm / 100;
              resolvedBmi = resolvedWeightKg / (hMeters * hMeters);
            }

            const confidence = toNumber(
              metrics?.estimate_result?.extracted_data?.processing_confidence
            );

            return (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard
                  interactive
                  className="p-6 space-y-4"
                  onClick={() => handleViewScan(scan.id)}
                >
                  {/* En-tête */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SpatialIcon Icon={HistoryIcon} size={18} className="text-blue-300" />
                      <h4 className="text-white font-semibold text-lg">
                        Scan du {format(scanDate, 'dd MMMM yyyy', { locale: fr })}
                      </h4>
                    </div>
                    <div className="text-xs text-white/50">
                      {format(scanDate, 'HH:mm', { locale: fr })}
                    </div>
                  </div>

                  {/* Valeurs */}
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Row icon="Scale" label="Poids" value={isValidNumber(resolvedWeightKg) ? resolvedWeightKg : '-' as any} />
                      {usedProfileWeight && <Badge tone="muted">profil</Badge>}
                    </div>
                    <div className="flex items-center">
                      <Row icon="Ruler" label="Taille" value={isValidNumber(resolvedHeightCm) ? resolvedHeightCm : '-' as any} />
                      {usedProfileHeight && <Badge tone="muted">profil</Badge>}
                    </div>
                    <Row icon="Activity" label="IMC" value={isValidNumber(resolvedBmi) ? resolvedBmi : '-' as any} />
                    {isValidNumber(confidence) && (
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <SpatialIcon Icon={ICONS.Shield} size={14} className="text-white/60" />
                        Confiance&nbsp;<span className="text-white/80 font-medium">{Math.round(confidence * 100)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Séparateur + bouton (espacé) */}
                  <div className="pt-4 mt-2 border-t border-white/10">
                    <button className="btn-glass--secondary-nav w-full py-2 text-sm">
                      Voir le scan
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && selectedScanId && (
          <HistoricalScanModal scanId={selectedScanId} onClose={handleCloseModal} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryTab;