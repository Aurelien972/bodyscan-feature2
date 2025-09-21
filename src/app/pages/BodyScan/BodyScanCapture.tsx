import React from 'react';
import BodyScanCapture from './BodyScanCapture/BodyScanCapture';
import DynamicProgressHeader from '../../shell/Header/DynamicProgressHeader';
import { useProgressStore } from '../../../system/store/progressStore';

/**
 * Body Scan Capture - Entry Point
 * Delegates to the modularized BodyScanCapture component
 */
const BodyScanCaptureEntry: React.FC = () => {
  const { progress, isActive } = useProgressStore();
  
  return (
    <div className="space-y-6">
      {/* Dynamic Progress Header - Toujours visible */}
      <DynamicProgressHeader />
      
      <BodyScanCaptureContent />
    </div>
  );
};

const BodyScanCaptureContent: React.FC = () => {
  return <BodyScanCapture />;
};
export default BodyScanCaptureEntry;