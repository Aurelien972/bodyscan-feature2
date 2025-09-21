/**
 * Debug Info Component - DISABLED
 * Debug information overlay completely removed for production
 */

import React from 'react';

interface DebugInfoProps {
  container: HTMLDivElement | null;
  orchestratorState: any;
  serverScanId?: string;
}

/**
 * Debug information overlay - COMPLETELY DISABLED
 */
const DebugInfo: React.FC<DebugInfoProps> = () => {
  // Debug info completely removed - return null always
  return null;
};

export default DebugInfo;