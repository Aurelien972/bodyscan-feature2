// src/app/pages/BodyScan/BodyScanCapture/components/ImmersivePhotoAnalysis.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore } from '../../../../../system/store/progressStore';
import { usePreferredMotion } from '../../../../../system/device/DeviceProvider';
import GlassCard from '../../../../../ui/cards/GlassCard';
import SpatialIcon from '../../../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../../../ui/icons/registry';
import type { CapturedPhotoEnhanced } from '../../../../../domain/types';
import logger from '../../../../../lib/utils/logger';

interface ImmersivePhotoAnalysisProps {
  capturedPhotos: CapturedPhotoEnhanced[];
  currentProgress: number;
  currentMessage: string;
  currentSubMessage: string;
}

/**
 * Immersive Photo Analysis - VisionOS 26 Premium (Full CSS Optimized)
 * Transforme l'attente en expérience visuelle captivante avec animations CSS pures
 */
const ImmersivePhotoAnalysis: React.FC<ImmersivePhotoAnalysisProps> = ({
  capturedPhotos,
  currentProgress,
  currentMessage,
  currentSubMessage,
}) => {
  const preferredMotion = usePreferredMotion();
  const shouldAnimate = preferredMotion === 'full';
  
  // État pour les zones d'analyse dynamiques (gardé en JS pour la logique)
  const [analysisZones, setAnalysisZones] = useState<Array<{ x: number; y: number; intensity: number; id: string }>>([]);

  // Couleur TwinForge pour les analyses
  const analysisColor = 'var(--brand-primary)'; // Deep Forge Indigo pour l'analyse

  // Génération de zones d'analyse aléatoires (logique JS conservée)
  useEffect(() => {
    if (!shouldAnimate) return;
    
    const generateZones = () => {
      const zones = Array.from({ length: 3 }, (_, i) => ({
        x: Math.random() * 80 + 10, // 10-90% pour éviter les bords
        y: Math.random() * 80 + 10,
        intensity: Math.random() * 0.8 + 0.2,
        id: `zone-${Date.now()}-${i}` // ID unique pour chaque zone
      }));
      setAnalysisZones(zones);
    };
    
    generateZones();
    const interval = setInterval(generateZones, 2000);
    
    return () => clearInterval(interval);
  }, [shouldAnimate]);

  const frontPhoto = capturedPhotos.find(p => p.type === 'front');
  const profilePhoto = capturedPhotos.find(p => p.type === 'profile');

  if (!frontPhoto || !profilePhoto) {
    logger.warn('IMMERSIVE_PHOTO_ANALYSIS', 'Photos manquantes pour l\'analyse immersive', {
      hasFrontPhoto: !!frontPhoto,
      hasProfilePhoto: !!profilePhoto,
      totalPhotos: capturedPhotos.length
    });
    return null;
  }

  return (
    <div className="immersive-analysis-container space-y-8 -mt-2">
      {/* Photos d'Analyse Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo de Face */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <GlassCard className="analysis-photo-card analysis-photo-card--front p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <SpatialIcon Icon={ICONS.User} size={16} style={{ color: analysisColor }} />
                Photo de Face
              </h4>
              <div 
                className="analysis-status-badge"
                style={{ 
                  background: `color-mix(in srgb, ${analysisColor} 20%, transparent)`,
                  borderColor: `color-mix(in srgb, ${analysisColor} 40%, transparent)`,
                  color: analysisColor
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: analysisColor }} />
                <span className="text-xs font-medium">Analyse IA</span>
              </div>
            </div>
            
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black/20">
              <img
                src={frontPhoto.url}
                alt="Photo de face en cours d'analyse"
                className="w-full h-full object-contain analysis-photo"
              />
              
              {/* Overlays d'Analyse Dynamiques - Full CSS */}
              {shouldAnimate && (
                <>
                  {/* Ligne de Scan Verticale - Full CSS */}
                  <div
                    className="scan-line-vertical"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, ${analysisColor}80 45%, transparent 100%)`,
                      '--scan-color': analysisColor
                    } as React.CSSProperties}
                  />
                  
                  {/* Grille d'Analyse - Full CSS */}
                  <div className="analysis-grid" style={{ '--grid-color': analysisColor } as React.CSSProperties}>
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="grid-cell"
                        style={{ 
                          '--cell-index': i,
                          '--grid-color': analysisColor
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  
                  {/* Points Clés Corporels - Photo de Face */}
                  <div className="body-keypoints body-keypoints--front">
                    {[
                      { x: 50, y: 12, label: 'Tête' },
                      { x: 40, y: 25, label: 'Épaule G' },
                      { x: 60, y: 25, label: 'Épaule D' },
                      { x: 50, y: 45, label: 'Taille' },
                      { x: 45, y: 65, label: 'Hanche G' },
                      { x: 55, y: 65, label: 'Hanche D' },
                      { x: 45, y: 90, label: 'Pied G' },
                      { x: 55, y: 90, label: 'Pied D' }
                    ].map((point, index) => (
                      <div
                        key={point.label}
                        className="keypoint"
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                          background: analysisColor,
                          boxShadow: `0 0 12px ${analysisColor}80`,
                          '--keypoint-index': index,
                          '--keypoint-color': analysisColor
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  
                  {/* Zones d'Analyse Dynamiques */}
                  {analysisZones.map((zone) => (
                    <div
                      key={zone.id}
                      className="analysis-zone"
                      style={{
                        left: `${zone.x}%`,
                        top: `${zone.y}%`,
                        background: `radial-gradient(circle, ${analysisColor}${Math.round(zone.intensity * 60)} 0%, transparent 70%)`,
                        '--zone-intensity': zone.intensity
                      } as React.CSSProperties}
                    />
                  ))}
                  
                  {/* Effet de Focus IA - Full CSS */}
                  <div
                    className="ai-focus-overlay ai-focus-overlay--front"
                    style={{
                      background: `radial-gradient(circle at center, transparent 30%, ${analysisColor}15 70%, transparent 100%)`,
                      '--focus-color': analysisColor
                    } as React.CSSProperties}
                  />
                </>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Photo de Profil */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <GlassCard className="analysis-photo-card analysis-photo-card--profile p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <SpatialIcon Icon={ICONS.RotateCcw} size={16} style={{ color: analysisColor }} />
                Photo de Profil
              </h4>
              <div 
                className="analysis-status-badge"
                style={{ 
                  background: `color-mix(in srgb, ${analysisColor} 20%, transparent)`,
                  borderColor: `color-mix(in srgb, ${analysisColor} 40%, transparent)`,
                  color: analysisColor
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: analysisColor }} />
                <span className="text-xs font-medium">Analyse IA</span>
              </div>
            </div>
            
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black/20">
              <img
                src={profilePhoto.url}
                alt="Photo de profil en cours d'analyse"
                className="w-full h-full object-contain analysis-photo"
              />
              
              {/* Overlays d'Analyse Dynamiques - Full CSS */}
              {shouldAnimate && (
                <>
                  {/* Ligne de Scan Horizontale - Full CSS */}
                  <div
                    className="scan-line-horizontal"
                    style={{
                      background: `linear-gradient(180deg, transparent 0%, ${analysisColor}80 50%, transparent 100%)`,
                      '--scan-color': analysisColor
                    } as React.CSSProperties}
                  />
                  
                  {/* Grille d'Analyse - Full CSS */}
                  <div className="analysis-grid" style={{ '--grid-color': analysisColor } as React.CSSProperties}>
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="grid-cell"
                        style={{ 
                          '--cell-index': i,
                          '--grid-color': analysisColor
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  
                  {/* Points Clés Corporels - Photo de Profil */}
                  <div className="body-keypoints body-keypoints--profile">
                    {[
                      { x: 50, y: 15, label: 'Tête' },
                      { x: 45, y: 35, label: 'Épaule' },
                      { x: 50, y: 50, label: 'Taille' },
                      { x: 48, y: 70, label: 'Hanche' },
                      { x: 50, y: 90, label: 'Pied' }
                    ].map((point, index) => (
                      <div
                        key={point.label}
                        className="keypoint"
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                          background: analysisColor,
                          boxShadow: `0 0 12px ${analysisColor}80`,
                          '--keypoint-index': index,
                          '--keypoint-color': analysisColor
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  
                  {/* Zones d'Analyse Dynamiques */}
                  {analysisZones.map((zone) => (
                    <div
                      key={zone.id}
                      className="analysis-zone"
                      style={{
                        left: `${zone.x}%`,
                        top: `${zone.y}%`,
                        background: `radial-gradient(circle, ${analysisColor}${Math.round(zone.intensity * 60)} 0%, transparent 70%)`,
                        '--zone-intensity': zone.intensity
                      } as React.CSSProperties}
                    />
                  ))}
                  
                  {/* Effet de Focus IA - Full CSS */}
                  <div
                    className="ai-focus-overlay ai-focus-overlay--profile"
                    style={{
                      background: `radial-gradient(ellipse at center, transparent 25%, ${analysisColor}15 65%, transparent 100%)`,
                      '--focus-color': analysisColor
                    } as React.CSSProperties}
                  />
                </>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Flux de Données Visuels - Full CSS */}
      {shouldAnimate && (
        <div className="data-flow-container">
          {/* Particules de Données - Full CSS */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="data-particle"
              style={{
                background: analysisColor,
                left: `${20 + i * 12}%`,
                top: `${30 + (i % 3) * 20}%`,
                '--particle-index': i,
                '--particle-color': analysisColor
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImmersivePhotoAnalysis;
