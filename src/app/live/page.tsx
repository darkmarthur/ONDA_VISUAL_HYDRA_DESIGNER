'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HydraRuntime } from '@/hydra/runtime';

function ExternalHydraLive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let runtime: HydraRuntime | null = null;
    let isMounted = true;

    const initHydra = async () => {
      if (!canvasRef.current) return;
      runtime = new HydraRuntime();
      
      await runtime.initialize(canvasRef.current, (err) => {
        if (isMounted) setError(err);
      });

      // Execute initial code
      const initialCode = localStorage.getItem('hydra-live-code') || 'osc(60, 0.1, 0).out(o0)';
      runtime.evaluate(initialCode);

      // Listen for updates
      window.addEventListener('storage', handleStorageEvent);
      
      // Polling just in case
      const interval = setInterval(() => {
        if (runtime) {
          const currentCode = localStorage.getItem('hydra-live-code');
          if (currentCode) {
            runtime.evaluate(currentCode);
          }
        }
      }, 500);

      const resizeListener = () => {
        if (runtime) runtime.resize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', resizeListener);

      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener('resize', resizeListener);
      };
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'hydra-live-code' && runtime) {
        runtime.evaluate(e.newValue || '');
      }
    };

    initHydra();

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageEvent);
      if (runtime) {
        runtime.destroy();
      }
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {error && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, color: '#ff4444', fontFamily: 'monospace', fontSize: 12, background: 'rgba(0,0,0,0.8)', padding: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}

const DynamicExternalLive = dynamic(() => Promise.resolve(ExternalHydraLive), { ssr: false });

export default function LivePage() {
  return <DynamicExternalLive />;
}
