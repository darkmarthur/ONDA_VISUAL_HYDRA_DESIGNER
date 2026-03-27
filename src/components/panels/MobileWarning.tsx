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
          The <strong>HYDRA｜DESIGNER</strong> BETA V0.01 is a high-performance visual tool
          optimized for large resolutions and precise pointer interaction.
        </p>

        <p className="mobile-warning__subtext">
          Full functionality (Node Editing, Performance Window, Code Generation)
          is available on <strong>iPad</strong> or <strong>Desktop</strong> displays.
        </p>

        <div className="mobile-warning__brand">
          HYDRA｜DESIGNER BETA V0.01 <a href="https://github.com/darkmarthur/ONDA_VISUAL_HYDRA_DESIGNER" target="_blank" rel="noopener noreferrer" className="footer__link">GitHub ↗</a>
        </div>
      </div>
    </div>
  );
}
