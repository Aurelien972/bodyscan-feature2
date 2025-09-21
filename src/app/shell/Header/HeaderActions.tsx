import React, { useState } from 'react';
import { Link } from '../../nav/Link';
import GlassCard from '../../../ui/cards/GlassCard';
import SpatialIcon from '../../../ui/icons/SpatialIcon';
import { ICONS } from '../../../ui/icons/registry';
import { useUserStore } from '../../../system/store/userStore';

/**
 * Header Actions Component - Enhanced with Dev Mode and Profile Access
 * Header Actions Component - Profile Access Only
 */
export const HeaderActions: React.FC = () => {
  const { profile } = useUserStore();

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Profile Access Button */}
      <Link to="/profile" className="profile-access-link">
        <GlassCard 
          className="w-10 h-10 md:w-12 md:h-12 rounded-full p-0 flex items-center justify-center hover:scale-105 transition-transform"
          interactive
        >
          <SpatialIcon 
            Icon={ICONS.User} 
            size={16} 
            className="text-blue-400"
          />
        </GlassCard>
        
        {/* Display name on desktop if available */}
        {profile?.displayName && (
          <span className="hidden md:inline-block ml-2 text-white/80 text-sm font-medium">
            {profile.displayName}
          </span>
        )}
      </Link>
    </div>
  );
};
