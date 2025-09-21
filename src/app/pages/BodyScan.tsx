import React, { useState } from 'react';
import BodyScanCapture from './BodyScan/BodyScanCapture';

const BodyScan: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto mt-4">
      <BodyScanCapture />
    </div>
  );
};

export default BodyScan;