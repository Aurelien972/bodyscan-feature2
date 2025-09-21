// src/app/pages/Home.tsx
import React from 'react';
import GlassCard from '../../ui/cards/GlassCard';
import SpatialIcon from '../../ui/icons/SpatialIcon';
import { ICONS } from '../../ui/icons/registry';
import { Link } from '../nav/Link';
import PageHeader from '../../ui/page/PageHeader';

const Home: React.FC = () => {
  return (
    <div className="space-y-10">
      <PageHeader
        icon="Home"
        title="Tableau de bord"
        subtitle="Environnement de développement Body Scan - TwinForge"
        circuit="home"
      />
      
      {/* Quick Actions for Body Scan Development */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link to="/body-scan"> {/* MODIFIED: Changed 'to' prop from '/face-scan' to '/body-scan' */}
          <GlassCard className="text-center p-8 hover:scale-105 transition-transform" interactive>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-primary/20 flex items-center justify-center">
              <SpatialIcon Icon={ICONS.Scan} size={32} className="text-brand-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Body Scan</h3>
            <p className="text-white/70 text-sm">
              Développer et tester la fonctionnalité de scan corporel
            </p>
          </GlassCard>
        </Link>
        
        <Link to="/profile">
          <GlassCard className="text-center p-8 hover:scale-105 transition-transform" interactive>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-primary/20 flex items-center justify-center">
              <SpatialIcon Icon={ICONS.User} size={32} className="text-brand-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Profil</h3>
            <p className="text-white/70 text-sm">
              Gérer l'identité et l'avatar utilisateur
            </p>
          </GlassCard>
        </Link>
      </div>
      
      {/* Development Info */}
      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-6">
          <div className="flex items-start gap-3">
            <SpatialIcon Icon={ICONS.Info} size={20} className="text-brand-accent mt-1" />
            <div>
              <h4 className="text-white font-semibold mb-2">Environnement de développement</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Cette version simplifiée conserve uniquement les éléments essentiels : 
                système de design VisionOS 26++, audio feedback, sidebar, header, 
                profil (identité + avatar), et la base pour développer Body Scan.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Home;
