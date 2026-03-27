/**
 * Mobile Warning Component
 * Displays an overlay on small screens to indicate the app is best viewed on larger devices.
 */

'use client';

import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';

export default function MobileWarning() {
  return (
    <div className="mobile-warning">
      <div className="mobile-warning__content">
        <div className="mobile-warning__icons">
          <Smartphone size={32} className="mobile-warning__icon-phone" />
          <div className="mobile-warning__divider" />
          <Monitor size={48} className="mobile-warning__icon-desktop" />
        </div>
        
        <h2 className="mobile-warning__title">Desktop Experience Required</h2>
        
        <p className="mobile-warning__text">
          The <strong>ONDA｜HYDRA DESIGNER</strong> v2.0 is a high-performance visual tool 
          optimized for large resolutions and precise pointer interaction.
        </p>
        
        <p className="mobile-warning__subtext">
          Full functionality (Node Editing, Performance Window, Code Generation) 
          is available on <strong>iPad</strong> or <strong>Desktop</strong> displays.
        </p>

        <div className="mobile-warning__brand">
          ONDA｜HYDRA v2.0
        </div>
      </div>
    </div>
  );
}
